"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import { isActiveCollaboratorStatus } from "@/lib/workbench-collaboration";

const INTELLIGENCE_PATH = "/my/workbench/intelligence";
const REVIEWS_PATH = "/my/workbench/reviews";

function revalidateReviewPaths(projectId: string) {
  revalidatePath(INTELLIGENCE_PATH);
  revalidatePath(REVIEWS_PATH);
  revalidatePath(`${REVIEWS_PATH}/${projectId}`);
}

type ReviewAccessRole = "owner" | "editor" | "reviewer" | "viewer";

async function reviewAccessRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ ok: true; role: ReviewAccessRole; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not signed in." };

  const { data: project, error } = await supabase
    .from("workbench_review_projects")
    .select("id, user_id, project_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!project) return { ok: false, error: "Review project not found or access denied." };
  if (project.user_id === user.id) return { ok: true, role: "owner", userId: user.id };

  const linkedProjectId = typeof project.project_id === "string" ? project.project_id : "";
  if (!linkedProjectId) return { ok: false, error: "Review project access denied." };

  const { data: collaborator, error: collaboratorError } = await supabase
    .from("workbench_collaborators")
    .select("role, status")
    .eq("project_id", linkedProjectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (collaboratorError) return { ok: false, error: collaboratorError.message };
  if (!collaborator || !isActiveCollaboratorStatus(collaborator.status)) {
    return { ok: false, error: "Review project access denied." };
  }

  if (collaborator.role === "editor") return { ok: true, role: "editor", userId: user.id };
  if (collaborator.role === "reviewer") return { ok: true, role: "reviewer", userId: user.id };
  return { ok: true, role: "viewer", userId: user.id };
}

async function assertCanReadReview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  return reviewAccessRole(supabase, projectId);
}

async function assertCanContributeToReview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  const access = await reviewAccessRole(supabase, projectId);
  if (!access.ok) return access;
  if (access.role === "owner" || access.role === "editor" || access.role === "reviewer") return access;
  return { ok: false as const, error: "You do not have permission to change this review." };
}

async function assertCanManageReviewStructure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  const access = await reviewAccessRole(supabase, projectId);
  if (!access.ok) return access;
  if (access.role === "owner" || access.role === "editor") return access;
  return { ok: false as const, error: "Only review owners and editors can manage review setup." };
}

export async function listExtractionFields(projectId: string) {
  const supabase = await createClient();
  const access = await assertCanReadReview(supabase, projectId);
  if (!access.ok) return { ok: false as const, fields: [], error: access.error };

  const { data, error } = await supabase
    .from("workbench_review_extraction_fields")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false as const, fields: [], error: error.message };
  return { ok: true as const, fields: data ?? [] };
}

export async function createExtractionField(projectId: string, field: { fieldKey: string; name: string; fieldType: string; options?: Record<string, unknown>; required?: boolean; }) {
  const supabase = await createClient();
  const access = await assertCanManageReviewStructure(supabase, projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const payload = {
    project_id: projectId,
    field_key: field.fieldKey,
    name: field.name,
    field_type: field.fieldType,
    options: field.options ?? {},
    required: !!field.required,
    created_by: access.userId,
  };

  const { data, error } = await supabase.from("workbench_review_extraction_fields").insert(payload).select("id").single();
  if (error) return { ok: false as const, error: error.message };
  revalidateReviewPaths(projectId);
  return { ok: true as const, fieldId: data.id as string };
}

export async function upsertExtraction(projectId: string, fieldId: string, recordId: string, value: unknown) {
  const supabase = await createClient();
  const access = await assertCanContributeToReview(supabase, projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const { error } = await supabase.from("workbench_review_extractions").upsert(
    {
      project_id: projectId,
      field_id: fieldId,
      record_id: recordId,
      user_id: access.userId,
      value: value ?? {},
    },
    { onConflict: "project_id,field_id,record_id,user_id" },
  );

  if (error) return { ok: false as const, error: error.message };

  void trackWorkbenchActivity({
    eventType: "export_created",
    entityType: "project",
    projectId,
    entityId: recordId,
    metadata: { action: "extraction_upsert", fieldId },
  }).catch(() => {});

  revalidateReviewPaths(projectId);
  return { ok: true as const };
}

export async function listExtractions(projectId: string, recordId?: string) {
  const supabase = await createClient();
  const access = await assertCanReadReview(supabase, projectId);
  if (!access.ok) return { ok: false as const, extractions: [], error: access.error };

  let query = supabase.from("workbench_review_extractions").select("*").eq("project_id", projectId);
  if (recordId) query = query.eq("record_id", recordId);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) return { ok: false as const, extractions: [], error: error.message };
  return { ok: true as const, extractions: data ?? [] };
}

export async function assignRecordToUser(projectId: string, recordId: string, assigneeUserId: string, role: "primary" | "secondary" = "primary") {
  const supabase = await createClient();
  const access = await assertCanManageReviewStructure(supabase, projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const { data, error } = await supabase.from("workbench_review_assignments").upsert({
    project_id: projectId,
    record_id: recordId,
    assignee_user_id: assigneeUserId,
    role,
  }, { onConflict: "project_id,record_id,assignee_user_id" }).select("id").single();

  if (error) return { ok: false as const, error: error.message };
  revalidateReviewPaths(projectId);
  return { ok: true as const, assignmentId: data.id as string };
}

export async function listAssignments(projectId: string) {
  const supabase = await createClient();
  const access = await assertCanReadReview(supabase, projectId);
  if (!access.ok) return { ok: false as const, assignments: [], error: access.error };

  const { data, error } = await supabase.from("workbench_review_assignments").select("*").eq("project_id", projectId);
  if (error) return { ok: false as const, assignments: [], error: error.message };
  return { ok: true as const, assignments: data ?? [] };
}

export async function addReviewComment(projectId: string, recordId: string, body: string, parentId?: string) {
  const supabase = await createClient();
  const access = await assertCanContributeToReview(supabase, projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const { data, error } = await supabase.from("workbench_review_comments").insert({
    project_id: projectId,
    record_id: recordId,
    user_id: access.userId,
    parent_id: parentId ?? null,
    body: body.trim(),
  }).select("id").single();

  if (error) return { ok: false as const, error: error.message };
  revalidateReviewPaths(projectId);
  return { ok: true as const, commentId: data.id as string };
}

export async function listReviewComments(projectId: string, recordId?: string) {
  const supabase = await createClient();
  const access = await assertCanReadReview(supabase, projectId);
  if (!access.ok) return { ok: false as const, comments: [], error: access.error };

  let q = supabase.from("workbench_review_comments").select("*").eq("project_id", projectId);
  if (recordId) q = q.eq("record_id", recordId);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) return { ok: false as const, comments: [], error: error.message };
  return { ok: true as const, comments: data ?? [] };
}
