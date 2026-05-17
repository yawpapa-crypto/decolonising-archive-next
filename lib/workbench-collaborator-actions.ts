"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import type { WorkbenchCollaboratorRow } from "@/lib/workbench-data";

const WB = "/my/workbench";
const COLLAB_ROLES = ["viewer", "reviewer", "editor"] as const;
export type WorkbenchCollaboratorRole = (typeof COLLAB_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return EMAIL_RE.test(email);
}

function isDuplicateCollaboratorError(message: string) {
  return /duplicate key|unique constraint|already exists/i.test(message);
}

async function getAuthedSupabase() {
  await requireMember(WB);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Sign in required." as const };
  return { supabase, user, error: null as null };
}

async function assertCanManageCollaborators(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: project, error } = await supabase
    .from("workbench_projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!project) return { ok: false, error: "Project not found." };
  if (project.owner_id === userId) return { ok: true };

  const { data: membership, error: memberError } = await supabase
    .from("workbench_collaborators")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) return { ok: false, error: memberError.message };
  if (membership?.role === "editor") return { ok: true };

  return {
    ok: false,
    error: "You do not have permission to manage collaborators on this project.",
  };
}

export async function inviteWorkbenchCollaborator(input: {
  projectId: string;
  email: string;
  role: string;
}): Promise<{ ok: boolean; error?: string; collaborator?: WorkbenchCollaboratorRow; duplicate?: boolean }> {
  const projectId = input.projectId?.trim();
  const email = normalizeEmail(input.email || "");
  const role = input.role?.trim() as WorkbenchCollaboratorRole;

  if (!projectId) return { ok: false, error: "Missing project." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (!COLLAB_ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanManageCollaborators(supabase, projectId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { data: project } = await supabase
    .from("workbench_projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (project?.owner_id) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", project.owner_id)
      .maybeSingle();
    const ownerEmail = normalizeEmail(ownerProfile?.email || user.email || "");
    if (ownerEmail && ownerEmail === email) {
      return { ok: false, error: "The project owner is already on this project." };
    }
  }

  const selfEmail = normalizeEmail(user.email || "");
  if (selfEmail && selfEmail === email) {
    return { ok: false, error: "You cannot invite yourself." };
  }

  const { data: existing } = await supabase
    .from("workbench_collaborators")
    .select("id, status")
    .eq("project_id", projectId)
    .ilike("invited_email", email)
    .neq("status", "removed")
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      duplicate: true,
      error: "This collaborator has already been invited to this project.",
    };
  }

  const baseRow = {
    project_id: projectId,
    invited_email: email,
    role,
  };

  let { data: collaborator, error } = await supabase
    .from("workbench_collaborators")
    .insert({
      ...baseRow,
      status: "pending",
      invited_by: user.id,
    })
    .select("*")
    .single();

  if (error && /column.*status|column.*invited_by/i.test(error.message)) {
    ({ data: collaborator, error } = await supabase
      .from("workbench_collaborators")
      .insert(baseRow)
      .select("*")
      .single());
  }

  if (error) {
    if (isDuplicateCollaboratorError(error.message)) {
      return {
        ok: false,
        duplicate: true,
        error: "This collaborator has already been invited to this project.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(WB);
  revalidatePath(`${WB}/collaborators`);
  revalidatePath(`${WB}/projects/${projectId}`);

  return { ok: true, collaborator: collaborator as WorkbenchCollaboratorRow };
}

export async function removeWorkbenchCollaborator(input: {
  projectId: string;
  collaboratorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const projectId = input.projectId?.trim();
  const collaboratorId = input.collaboratorId?.trim();
  if (!projectId || !collaboratorId) return { ok: false, error: "Missing collaborator." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanManageCollaborators(supabase, projectId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { error } = await supabase
    .from("workbench_collaborators")
    .delete()
    .eq("id", collaboratorId)
    .eq("project_id", projectId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(WB);
  revalidatePath(`${WB}/collaborators`);
  revalidatePath(`${WB}/projects/${projectId}`);
  return { ok: true };
}

export async function updateWorkbenchCollaboratorRole(input: {
  projectId: string;
  collaboratorId: string;
  role: string;
}): Promise<{ ok: boolean; error?: string; collaborator?: WorkbenchCollaboratorRow }> {
  const projectId = input.projectId?.trim();
  const collaboratorId = input.collaboratorId?.trim();
  const role = input.role?.trim() as WorkbenchCollaboratorRole;

  if (!projectId || !collaboratorId) return { ok: false, error: "Missing collaborator." };
  if (!COLLAB_ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanManageCollaborators(supabase, projectId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { data: collaborator, error } = await supabase
    .from("workbench_collaborators")
    .update({ role })
    .eq("id", collaboratorId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(WB);
  revalidatePath(`${WB}/collaborators`);
  revalidatePath(`${WB}/projects/${projectId}`);

  return { ok: true, collaborator: collaborator as WorkbenchCollaboratorRow };
}
