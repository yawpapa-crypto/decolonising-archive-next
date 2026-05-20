"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import type {
  ReviewExclusionReason,
  ReviewProjectType,
  ReviewScreeningStatus,
} from "@/lib/workbench-intelligence-types";

import * as extractions from "@/lib/workbench-review-extractions";

const INTELLIGENCE_PATH = "/my/workbench/intelligence";

export type ReviewProjectInput = {
  title: string;
  reviewType: ReviewProjectType;
  researchQuestion?: string;
  inclusionCriteria?: string;
  exclusionCriteria?: string;
  searchStrings?: string[];
  databasesSearched?: string[];
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  notes?: string;
};

export async function listReviewProjects() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, projects: [], error: "Not signed in." };

  const { data, error } = await supabase
    .from("workbench_review_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false as const, projects: [], error: error.message };
  return { ok: true as const, projects: data ?? [] };
}

export async function createReviewProject(input: ReviewProjectInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title is required." };

  const { data, error } = await supabase
    .from("workbench_review_projects")
    .insert({
      user_id: user.id,
      title,
      review_type: input.reviewType,
      research_question: input.researchQuestion?.trim() || null,
      inclusion_criteria: input.inclusionCriteria?.trim() || null,
      exclusion_criteria: input.exclusionCriteria?.trim() || null,
      search_strings: input.searchStrings ?? [],
      databases_searched: input.databasesSearched ?? [],
      date_range_start: input.dateRangeStart || null,
      date_range_end: input.dateRangeEnd || null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const, projectId: data.id as string };
}

export async function updateReviewProject(
  projectId: string,
  patch: Partial<ReviewProjectInput> & { status?: "active" | "paused" | "completed" },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const payload: Record<string, unknown> = {};
  if (patch.title != null) payload.title = patch.title.trim();
  if (patch.reviewType != null) payload.review_type = patch.reviewType;
  if (patch.researchQuestion != null) payload.research_question = patch.researchQuestion.trim() || null;
  if (patch.inclusionCriteria != null) payload.inclusion_criteria = patch.inclusionCriteria.trim() || null;
  if (patch.exclusionCriteria != null) payload.exclusion_criteria = patch.exclusionCriteria.trim() || null;
  if (patch.searchStrings != null) payload.search_strings = patch.searchStrings;
  if (patch.databasesSearched != null) payload.databases_searched = patch.databasesSearched;
  if (patch.dateRangeStart !== undefined) payload.date_range_start = patch.dateRangeStart || null;
  if (patch.dateRangeEnd !== undefined) payload.date_range_end = patch.dateRangeEnd || null;
  if (patch.notes != null) payload.notes = patch.notes.trim() || null;
  if (patch.status != null) payload.status = patch.status;

  const { error } = await supabase
    .from("workbench_review_projects")
    .update(payload)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const };
}

export async function importRecordsToReviewProject(projectId: string, recordIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const unique = [...new Set(recordIds.filter(Boolean))];
  if (!unique.length) return { ok: false as const, error: "No records selected." };

  const rows = unique.map((recordId) => ({
    review_project_id: projectId,
    user_id: user.id,
    record_id: recordId,
    screening_status: "imported" as const,
  }));

  const { error } = await supabase
    .from("workbench_review_screenings")
    .upsert(rows, { onConflict: "review_project_id,record_id,user_id", ignoreDuplicates: true });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const, imported: unique.length };
}

export async function importSavedCorpusToReviewProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: bookmarks, error } = await supabase
    .from("bookmarks")
    .select("record_id")
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  const recordIds = (bookmarks ?? []).map((row) => row.record_id as string);
  return importRecordsToReviewProject(projectId, recordIds);
}

export async function updateReviewScreening(input: {
  projectId: string;
  recordId: string;
  screeningStatus: ReviewScreeningStatus;
  exclusionReason?: ReviewExclusionReason | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.from("workbench_review_screenings").upsert(
    {
      review_project_id: input.projectId,
      user_id: user.id,
      record_id: input.recordId,
      screening_status: input.screeningStatus,
      exclusion_reason:
        input.screeningStatus === "excluded" ? input.exclusionReason ?? "other" : null,
      notes: input.notes?.trim() || null,
    },
    { onConflict: "review_project_id,record_id,user_id" },
  );

  if (error) return { ok: false as const, error: error.message };

  void trackWorkbenchActivity({
    eventType: "screening_decision",
    entityType: "review_screening",
    entityId: input.recordId,
    metadata: {
      project_id: input.projectId,
      screening_status: input.screeningStatus,
      exclusion_reason: input.exclusionReason ?? null,
    },
  });

  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const };
}

export async function listReviewScreenings(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, screenings: [], error: "Not signed in." };

  const { data, error } = await supabase
    .from("workbench_review_screenings")
    .select("*")
    .eq("review_project_id", projectId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false as const, screenings: [], error: error.message };
  return { ok: true as const, screenings: data ?? [] };
}

// Extraction & assignment wrappers (thin adapters that also track activity)
export async function listExtractionFields(projectId: string) {
  return await extractions.listExtractionFields(projectId);
}

export async function createExtractionField(projectId: string, field: { fieldKey: string; name: string; fieldType: string; options?: any; required?: boolean; }) {
  const res = await extractions.createExtractionField(projectId, field);
  if (res.ok) {
    void trackWorkbenchActivity({
      eventType: "extraction_field_created",
      entityType: "project",
      projectId,
      metadata: { fieldKey: field.fieldKey, fieldType: field.fieldType },
    });
  }
  return res;
}

export async function upsertExtraction(projectId: string, fieldId: string, recordId: string, value: unknown) {
  const res = await extractions.upsertExtraction(projectId, fieldId, recordId, value);
  if (res.ok) {
    void trackWorkbenchActivity({
      eventType: "extraction_upserted",
      entityType: "project",
      projectId,
      entityId: recordId,
      metadata: { fieldId },
    });
  }
  return res;
}

export async function listExtractions(projectId: string, recordId?: string) {
  return await extractions.listExtractions(projectId, recordId);
}

export async function assignRecordToUser(projectId: string, recordId: string, assigneeUserId: string, role: "primary" | "secondary" = "primary") {
  const res = await extractions.assignRecordToUser(projectId, recordId, assigneeUserId, role);
  if (res.ok) {
    void trackWorkbenchActivity({
      eventType: "assignment_created",
      entityType: "project",
      projectId,
      entityId: recordId,
      metadata: { assigneeUserId, role },
    });
  }
  return res;
}

export async function listAssignments(projectId: string) {
  return await extractions.listAssignments(projectId);
}

export async function addReviewComment(projectId: string, recordId: string, body: string, parentId?: string) {
  const res = await extractions.addReviewComment(projectId, recordId, body, parentId);
  if (res.ok) {
    void trackWorkbenchActivity({
      eventType: "comment_created",
      entityType: "review_comment",
      projectId,
      entityId: res.commentId,
      metadata: { recordId, parentId },
    });
  }
  return res;
}

export async function listReviewComments(projectId: string, recordId?: string) {
  return await extractions.listReviewComments(projectId, recordId);
}
