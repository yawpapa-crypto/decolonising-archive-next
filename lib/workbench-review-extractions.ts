"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WorkbenchUserPreferences } from "@/lib/workbench-intelligence-types";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";

const INTELLIGENCE_PATH = "/my/workbench/intelligence";

export async function listExtractionFields(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_review_extraction_fields")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false as const, fields: [], error: error.message };
  return { ok: true as const, fields: data ?? [] };
}

export async function createExtractionField(projectId: string, field: { fieldKey: string; name: string; fieldType: string; options?: any; required?: boolean; }) {
  const supabase = await createClient();
  const payload = {
    project_id: projectId,
    field_key: field.fieldKey,
    name: field.name,
    field_type: field.fieldType,
    options: field.options ?? {},
    required: !!field.required,
  };

  const { data, error } = await supabase.from("workbench_review_extraction_fields").insert(payload).select("id").single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const, fieldId: data.id as string };
}

export async function upsertExtraction(projectId: string, fieldId: string, recordId: string, value: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.from("workbench_review_extractions").upsert(
    {
      project_id: projectId,
      field_id: fieldId,
      record_id: recordId,
      user_id: user.id,
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

  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const };
}

export async function listExtractions(projectId: string, recordId?: string) {
  const supabase = await createClient();
  let query = supabase.from("workbench_review_extractions").select("*").eq("project_id", projectId);
  if (recordId) query = query.eq("record_id", recordId);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) return { ok: false as const, extractions: [], error: error.message };
  return { ok: true as const, extractions: data ?? [] };
}

export async function assignRecordToUser(projectId: string, recordId: string, assigneeUserId: string, role: "primary" | "secondary" = "primary") {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workbench_review_assignments").upsert({
    project_id: projectId,
    record_id: recordId,
    assignee_user_id: assigneeUserId,
    role,
  }, { onConflict: "project_id,record_id,assignee_user_id" }).select("id").single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const, assignmentId: data.id as string };
}

export async function listAssignments(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workbench_review_assignments").select("*").eq("project_id", projectId);
  if (error) return { ok: false as const, assignments: [], error: error.message };
  return { ok: true as const, assignments: data ?? [] };
}

export async function addReviewComment(projectId: string, recordId: string, body: string, parentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data, error } = await supabase.from("workbench_review_comments").insert({
    project_id: projectId,
    record_id: recordId,
    user_id: user.id,
    parent_id: parentId ?? null,
    body: body.trim(),
  }).select("id").single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const, commentId: data.id as string };
}

export async function listReviewComments(projectId: string, recordId?: string) {
  const supabase = await createClient();
  let q = supabase.from("workbench_review_comments").select("*").eq("project_id", projectId);
  if (recordId) q = q.eq("record_id", recordId);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) return { ok: false as const, comments: [], error: error.message };
  return { ok: true as const, comments: data ?? [] };
}
