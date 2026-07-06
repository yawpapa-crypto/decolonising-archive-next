"use server";

import { revalidatePath } from "next/cache";
import {
  WORKBENCH_MAX_COLLABORATORS,
  countsTowardCollaboratorLimit,
  displayCollaboratorStatus,
  isActiveCollaboratorStatus,
  normalizeCollaboratorEmail,
} from "@/lib/workbench-collaboration";
import { logWorkbenchProjectActivity } from "@/lib/workbench-project-collaboration-actions";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import type { WorkbenchCollaboratorRow } from "@/lib/workbench-data";

const WB = "/my/workbench";
const NOTES_PATH = `${WB}/notes`;
const COLLAB_ROLES = ["viewer", "reviewer", "editor"] as const;
export type WorkbenchCollaboratorRole = (typeof COLLAB_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(email: string) {
  return normalizeCollaboratorEmail(email);
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

  return {
    ok: false,
    error: "Only the project owner can manage collaborators.",
  };
}

async function countCollaboratorsTowardLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("workbench_collaborators")
    .select("status, user_id")
    .eq("project_id", projectId);

  if (error) return WORKBENCH_MAX_COLLABORATORS;
  return (data ?? []).filter((row) =>
    countsTowardCollaboratorLimit(
      displayCollaboratorStatus(row as { user_id: string | null; status?: string | null }),
    ),
  ).length;
}

async function resolveUserIdForEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  return typeof data?.id === "string" ? data.id : null;
}

export async function acceptPendingWorkbenchInvites(): Promise<{
  ok: boolean;
  accepted: number;
  error?: string;
}> {
  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, accepted: 0, error: authError ?? "Sign in required." };

  const email = normalizeEmail(user.email || "");
  if (!email) return { ok: true, accepted: 0 };

  const { data: pending, error } = await supabase
    .from("workbench_collaborators")
    .select("id")
    .ilike("invited_email", email)
    .in("status", ["pending", "invited", "active"])
    .is("user_id", null);

  if (error) return { ok: false, accepted: 0, error: error.message };
  if (!pending?.length) return { ok: true, accepted: 0 };

  const ids = pending.map((row) => (row as { id: string }).id);
  const { error: updateError } = await supabase
    .from("workbench_collaborators")
    .update({
      user_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateError) return { ok: false, accepted: 0, error: updateError.message };

  revalidatePath(WB);
  revalidatePath(NOTES_PATH);
  revalidatePath(`${WB}/collaborators`);

  return { ok: true, accepted: ids.length };
}

export async function listWorkbenchProjectCollaborators(projectId: string): Promise<{
  ok: boolean;
  error?: string;
  collaborators: WorkbenchCollaboratorRow[];
  canManage: boolean;
  ownerId: string | null;
}> {
  const id = projectId?.trim();
  if (!id) return { ok: false, error: "Missing project.", collaborators: [], canManage: false, ownerId: null };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) {
    return {
      ok: false,
      error: authError ?? "Sign in required.",
      collaborators: [],
      canManage: false,
      ownerId: null,
    };
  }

  const { data: project, error: projectError } = await supabase
    .from("workbench_projects")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();

  if (projectError) {
    return { ok: false, error: projectError.message, collaborators: [], canManage: false, ownerId: null };
  }
  if (!project) {
    return { ok: false, error: "Project not found or access denied.", collaborators: [], canManage: false, ownerId: null };
  }

  const { data: rows, error } = await supabase
    .from("workbench_collaborators")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message, collaborators: [], canManage: false, ownerId: project.owner_id };
  }

  const collaborators = ((rows ?? []) as WorkbenchCollaboratorRow[]).filter((row) =>
    isActiveCollaboratorStatus(row.status),
  );

  return {
    ok: true,
    collaborators,
    canManage: project.owner_id === user.id,
    ownerId: project.owner_id,
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

  const collaboratorCount = await countCollaboratorsTowardLimit(supabase, projectId);
  if (collaboratorCount >= WORKBENCH_MAX_COLLABORATORS) {
    return {
      ok: false,
      error:
        "Collaborator limit reached. This project supports up to 10 collaborators for now.",
    };
  }

  const invitedUserId = await resolveUserIdForEmail(supabase, email);

  const baseRow = {
    project_id: projectId,
    invited_email: email,
    role,
    user_id: invitedUserId,
  };

  let { data: collaborator, error } = await supabase
    .from("workbench_collaborators")
    .insert({
      ...baseRow,
      status: invitedUserId ? "accepted" : "pending",
      invited_by: user.id,
      accepted_at: invitedUserId ? new Date().toISOString() : null,
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

  const invited = collaborator as WorkbenchCollaboratorRow;
  void logWorkbenchProjectActivity({
    projectId,
    action: "invited_member",
    summary: `invited ${email} as ${role === "editor" ? "Editor" : "Viewer"}`,
    targetType: "collaborator",
    targetId: invited.id,
    metadata: { email, role },
  });

  revalidatePath(WB);
  revalidatePath(NOTES_PATH);
  revalidatePath(`${WB}/collaborators`);
  revalidatePath(`${WB}/projects/${projectId}`);

  return { ok: true, collaborator: invited };
}

export async function acceptWorkbenchInviteById(inviteId: string): Promise<{
  ok: boolean;
  error?: string;
  projectId?: string;
}> {
  const id = inviteId?.trim();
  if (!id) return { ok: false, error: "Invalid invite link." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const { data: row, error } = await supabase
    .from("workbench_collaborators")
    .select("id, project_id, invited_email, user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "Invite not found or no longer valid." };

  const invite = row as {
    id: string;
    project_id: string;
    invited_email: string | null;
    user_id: string | null;
    status: string | null;
  };

  const userEmail = normalizeEmail(user.email || "");
  const invitedEmail = normalizeEmail(invite.invited_email || "");

  if (invite.user_id && invite.user_id !== user.id) {
    return { ok: false, error: "This invite is for a different account." };
  }
  if (!invite.user_id && invitedEmail && userEmail && invitedEmail !== userEmail) {
    return { ok: false, error: "Sign in with the email address that received this invite." };
  }

  const { error: updateError } = await supabase
    .from("workbench_collaborators")
    .update({
      user_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return { ok: false, error: updateError.message };

  void logWorkbenchProjectActivity({
    projectId: invite.project_id,
    action: "accepted_invite",
    summary: "accepted the project invite",
    targetType: "collaborator",
    targetId: id,
  });

  revalidatePath(WB);
  revalidatePath(NOTES_PATH);
  return { ok: true, projectId: invite.project_id };
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

  let { error } = await supabase
    .from("workbench_collaborators")
    .update({ status: "removed" })
    .eq("id", collaboratorId)
    .eq("project_id", projectId);

  if (error && /status/i.test(error.message)) {
    ({ error } = await supabase
      .from("workbench_collaborators")
      .delete()
      .eq("id", collaboratorId)
      .eq("project_id", projectId));
  }

  if (error) return { ok: false, error: error.message };

  void logWorkbenchProjectActivity({
    projectId,
    action: "removed_member",
    summary: "removed a collaborator",
    targetType: "collaborator",
    targetId: collaboratorId,
  });

  revalidatePath(WB);
  revalidatePath(NOTES_PATH);
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

  const updated = collaborator as WorkbenchCollaboratorRow;
  void logWorkbenchProjectActivity({
    projectId,
    action: "changed_member_role",
    summary: `changed a collaborator role to ${role === "editor" ? "Editor" : "Viewer"}`,
    targetType: "collaborator",
    targetId: collaboratorId,
    metadata: { role },
  });

  revalidatePath(WB);
  revalidatePath(NOTES_PATH);
  revalidatePath(`${WB}/collaborators`);
  revalidatePath(`${WB}/projects/${projectId}`);

  return { ok: true, collaborator: updated };
}
