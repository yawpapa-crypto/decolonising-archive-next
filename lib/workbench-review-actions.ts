"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import { inviteWorkbenchCollaborator } from "@/lib/workbench-collaborator-actions";
import type { WorkbenchCollaboratorRole } from "@/lib/workbench-collaborator-actions";
import type {
  ReviewExclusionReason,
  ReviewProjectType,
  ReviewScreeningStatus,
} from "@/lib/workbench-intelligence-types";
import {
  addReviewComment as addReviewCommentAction,
  assignRecordToUser as assignRecordToUserAction,
  createExtractionField as createExtractionFieldAction,
  listAssignments as listAssignmentsAction,
  listExtractionFields as listExtractionFieldsAction,
  listExtractions as listExtractionsAction,
  listReviewComments as listReviewCommentsAction,
  upsertExtraction as upsertExtractionAction,
} from "@/lib/workbench-review-extractions";

const INTELLIGENCE_PATH = "/my/workbench/intelligence";
const REVIEWS_PATH = "/my/workbench/reviews";

export type ReviewProjectInput = {
  title: string;
  description?: string | null;
  projectId?: string | null;
  reviewType: ReviewProjectType;
  questionType?: string;
  areaOfResearch?: string;
  purposeOfReview?: string;
  researchQuestion?: string;
  inclusionCriteria?: string;
  exclusionCriteria?: string;
  searchStrings?: string[];
  databasesSearched?: string[];
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  protocolNotes?: string;
  languages?: string[];
  reviewMethod?: string;
  sourceScope?: string;
  notes?: string;
};

function revalidateReviewPaths(projectId?: string) {
  revalidatePath(INTELLIGENCE_PATH);
  revalidatePath(REVIEWS_PATH);
  if (projectId) revalidatePath(`${REVIEWS_PATH}/${projectId}`);
}

function dedupeKeyFor(input: {
  title?: string | null;
  doi?: string | null;
  sourceUrl?: string | null;
}) {
  const doi = input.doi?.trim().toLowerCase();
  if (doi) return `doi:${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`;
  const url = input.sourceUrl?.trim().toLowerCase();
  if (url) return `url:${url}`;
  return `title:${(input.title ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

export async function listExtractionFields(projectId: string) {
  return listExtractionFieldsAction(projectId);
}

export async function createExtractionField(
  projectId: string,
  field: {
    fieldKey: string;
    name: string;
    fieldType: string;
    options?: Record<string, unknown>;
    required?: boolean;
  },
) {
  return createExtractionFieldAction(projectId, field);
}

export async function upsertExtraction(
  projectId: string,
  fieldId: string,
  recordId: string,
  value: unknown,
) {
  return upsertExtractionAction(projectId, fieldId, recordId, value);
}

export async function listExtractions(projectId: string, recordId?: string) {
  return listExtractionsAction(projectId, recordId);
}

export async function assignRecordToUser(
  projectId: string,
  recordId: string,
  assigneeUserId: string,
  role: "primary" | "secondary" = "primary",
) {
  return assignRecordToUserAction(projectId, recordId, assigneeUserId, role);
}

export async function listAssignments(projectId: string) {
  return listAssignmentsAction(projectId);
}

export async function addReviewComment(
  projectId: string,
  recordId: string,
  body: string,
  parentId?: string,
) {
  return addReviewCommentAction(projectId, recordId, body, parentId);
}

export async function listReviewComments(projectId: string, recordId?: string) {
  return listReviewCommentsAction(projectId, recordId);
}

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
      project_id: input.projectId || null,
      title,
      description: input.description?.trim() || null,
      review_type: input.reviewType,
      research_question: input.researchQuestion?.trim() || null,
      inclusion_criteria: input.inclusionCriteria?.trim() || null,
      exclusion_criteria: input.exclusionCriteria?.trim() || null,
      search_strings: input.searchStrings ?? [],
      databases_searched: input.databasesSearched ?? [],
      date_range_start: input.dateRangeStart || null,
      date_range_end: input.dateRangeEnd || null,
      protocol_notes: input.protocolNotes?.trim() || null,
      languages: input.languages ?? [],
      review_method: input.reviewMethod?.trim() || input.questionType?.trim() || null,
      source_scope: input.sourceScope?.trim() || input.areaOfResearch?.trim() || null,
      notes: input.notes?.trim() || input.purposeOfReview?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const, projectId: data.id as string };
}

export async function updateReviewProject(
  projectId: string,
  patch: Partial<ReviewProjectInput> & { status?: "active" | "paused" | "completed" | "archived" },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const payload: Record<string, unknown> = {};
  if (patch.title != null) payload.title = patch.title.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.projectId !== undefined) payload.project_id = patch.projectId || null;
  if (patch.reviewType != null) payload.review_type = patch.reviewType;
  if (patch.questionType != null) payload.review_method = patch.questionType.trim() || null;
  if (patch.areaOfResearch != null) payload.source_scope = patch.areaOfResearch.trim() || null;
  if (patch.purposeOfReview != null) payload.notes = patch.purposeOfReview.trim() || null;
  if (patch.researchQuestion != null) payload.research_question = patch.researchQuestion.trim() || null;
  if (patch.inclusionCriteria != null) payload.inclusion_criteria = patch.inclusionCriteria.trim() || null;
  if (patch.exclusionCriteria != null) payload.exclusion_criteria = patch.exclusionCriteria.trim() || null;
  if (patch.searchStrings != null) payload.search_strings = patch.searchStrings;
  if (patch.databasesSearched != null) payload.databases_searched = patch.databasesSearched;
  if (patch.dateRangeStart !== undefined) payload.date_range_start = patch.dateRangeStart || null;
  if (patch.dateRangeEnd !== undefined) payload.date_range_end = patch.dateRangeEnd || null;
  if (patch.protocolNotes != null) payload.protocol_notes = patch.protocolNotes.trim() || null;
  if (patch.languages != null) payload.languages = patch.languages;
  if (patch.reviewMethod != null) payload.review_method = patch.reviewMethod.trim() || null;
  if (patch.sourceScope != null) payload.source_scope = patch.sourceScope.trim() || null;
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

export async function archiveReviewProject(projectId: string) {
  return updateReviewProject(projectId, { status: "archived" });
}

export async function restoreReviewProject(projectId: string) {
  return updateReviewProject(projectId, { status: "active" });
}

export async function deleteReviewProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase
    .from("workbench_review_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidateReviewPaths(projectId);
  return { ok: true as const };
}

export async function manualAddReviewRecord(input: {
  projectId: string;
  title: string;
  source?: string;
  year?: string;
  doi?: string;
  sourceUrl?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title is required." };

  const recordId = `manual:${crypto.randomUUID?.() ?? Date.now()}`;
  const dedupeKey = dedupeKeyFor(input);
  const { error: recordError } = await supabase.from("workbench_review_records").insert({
    review_project_id: input.projectId,
    user_id: user.id,
    record_id: recordId,
    title,
    year: input.year?.trim() || null,
    doi: input.doi?.trim() || null,
    source_url: input.sourceUrl?.trim() || null,
    source_label: input.source?.trim() || null,
    import_source: "manual",
    dedupe_key: dedupeKey,
  });

  if (recordError) return { ok: false as const, error: recordError.message };

  const { error: screeningError } = await supabase.from("workbench_review_screenings").upsert(
    {
      review_project_id: input.projectId,
      user_id: user.id,
      record_id: recordId,
      title,
      source: input.source?.trim() || null,
      screening_status: "imported",
    },
    { onConflict: "review_project_id,record_id,user_id" },
  );

  if (screeningError) return { ok: false as const, error: screeningError.message };
  revalidateReviewPaths(input.projectId);
  return { ok: true as const, recordId };
}

export async function importReadingListToReviewProject(projectId: string, readingListId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data, error } = await supabase
    .from("reading_list_items")
    .select("record_id, record_title, record_source, record_year, record_type, record_source_url")
    .eq("reading_list_id", readingListId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  const items = data ?? [];
  const recordIds = items.map((row) => String(row.record_id)).filter(Boolean);

  if (items.length) {
    await supabase.from("workbench_review_records").upsert(
      items.map((row) => ({
        review_project_id: projectId,
        user_id: user.id,
        record_id: String(row.record_id),
        title: row.record_title ?? String(row.record_id),
        source_label: row.record_source ?? null,
        year: row.record_year ?? null,
        source_url: row.record_source_url ?? null,
        record_type: row.record_type ?? null,
        import_source: "reading_list",
        dedupe_key: dedupeKeyFor({
          title: typeof row.record_title === "string" ? row.record_title : String(row.record_id),
          sourceUrl: typeof row.record_source_url === "string" ? row.record_source_url : null,
        }),
      })),
      { onConflict: "review_project_id,record_id" },
    );
  }

  const imported = await importRecordsToReviewProject(projectId, recordIds);
  if (!imported.ok) return imported;
  revalidateReviewPaths(projectId);
  return { ok: true as const, imported: recordIds.length };
}

export async function importBibliographicFileToReviewProject(input: {
  projectId: string;
  filename: string;
  content: string;
  importTarget: "title_abstract_screening" | "full_text_review" | "extraction";
  sourceLabel?: string;
}) {
  const lines = input.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const titles = lines
    .map((line) => line.replace(/^TY\s+-\s+|^TI\s+-\s+|^title\s*[,;:]\s*/i, "").trim())
    .filter(Boolean)
    .slice(0, 500);
  const uniqueTitles = [...new Set(titles)];
  if (!uniqueTitles.length) {
    return { ok: false as const, error: "No importable references were found in the file." };
  }

  let imported = 0;
  let duplicates = titles.length - uniqueTitles.length;
  for (const title of uniqueTitles) {
    const result = await manualAddReviewRecord({
      projectId: input.projectId,
      title,
      source: input.sourceLabel || input.filename,
    });
    if (result.ok) imported += 1;
    else duplicates += 1;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("workbench_review_imports").insert({
      review_project_id: input.projectId,
      user_id: user.id,
      filename: input.filename,
      file_format: input.filename.split(".").pop() || "text",
      import_target: input.importTarget,
      source_label: input.sourceLabel?.trim() || null,
      references_count: titles.length,
      duplicates_count: duplicates,
      added_to_screening_count: imported,
    });
  }

  revalidateReviewPaths(input.projectId);
  return { ok: true as const, imported, duplicates };
}

export async function deduplicateReviewRecords(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data, error } = await supabase
    .from("workbench_review_records")
    .select("id, dedupe_key")
    .eq("review_project_id", projectId)
    .eq("user_id", user.id)
    .not("dedupe_key", "is", null);

  if (error) return { ok: false as const, error: error.message };
  const seen = new Map<string, string>();
  let duplicates = 0;
  for (const row of data ?? []) {
    const key = String(row.dedupe_key ?? "");
    const id = String(row.id);
    const first = seen.get(key);
    if (!key) continue;
    if (!first) {
      seen.set(key, id);
      continue;
    }
    duplicates += 1;
    await supabase
      .from("workbench_review_records")
      .update({ duplicate_of: first })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  revalidateReviewPaths(projectId);
  return { ok: true as const, duplicates };
}

export async function updateReviewFullText(input: {
  projectId: string;
  recordId: string;
  url?: string | null;
  accessStatus?: "not_sought" | "found" | "uploaded" | "unavailable";
  fileLabel?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.from("workbench_review_full_texts").upsert(
    {
      review_project_id: input.projectId,
      record_id: input.recordId,
      user_id: user.id,
      url: input.url || null,
      file_label: input.fileLabel || null,
      access_status: input.accessStatus ?? "not_sought",
      notes: input.notes?.trim() || null,
    },
    { onConflict: "review_project_id,record_id" },
  );

  if (error) return { ok: false as const, error: error.message };
  revalidateReviewPaths(input.projectId);
  return { ok: true as const };
}

export async function resolveReviewConflict(input: {
  projectId: string;
  recordId: string;
  stage: "title_abstract" | "full_text" | "extraction";
  resolutionDecision: "include" | "exclude" | "maybe";
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.from("workbench_review_conflicts").upsert(
    {
      review_project_id: input.projectId,
      record_id: input.recordId,
      stage: input.stage,
      status: "resolved",
      resolver_id: user.id,
      resolution_decision: input.resolutionDecision,
      resolution_notes: input.notes?.trim() || null,
    },
    { onConflict: "review_project_id,record_id,stage" },
  );

  if (error) return { ok: false as const, error: error.message };

  await updateReviewScreening({
    projectId: input.projectId,
    recordId: input.recordId,
    screeningStatus:
      input.resolutionDecision === "include"
        ? "included"
        : input.resolutionDecision === "maybe"
          ? "maybe"
          : "excluded",
    exclusionReason: input.resolutionDecision === "exclude" ? "other" : null,
  });

  revalidateReviewPaths(input.projectId);
  return { ok: true as const };
}

export async function inviteReviewCollaborator(input: {
  reviewProjectId: string;
  email: string;
  role: WorkbenchCollaboratorRole;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_review_projects")
    .select("project_id")
    .eq("id", input.reviewProjectId)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  const projectId = typeof data?.project_id === "string" ? data.project_id : "";
  if (!projectId) return { ok: false as const, error: "Review is not linked to a Workbench project." };
  return inviteWorkbenchCollaborator({
    projectId,
    email: input.email,
    role: input.role,
  });
}

export async function exportReviewCounts(projectId: string) {
  const screenings = await listReviewScreenings(projectId);
  if (!screenings.ok) return { ok: false as const, error: screenings.error };

  const rows = screenings.screenings as Array<Record<string, unknown>>;
  const statuses = new Map<string, number>();
  rows.forEach((row) => {
    const status = String(row.screening_status ?? "imported");
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
  });
  const csv = [
    "metric,count",
    `records_identified,${rows.length}`,
    `awaiting_screening,${statuses.get("imported") ?? 0}`,
    `included,${statuses.get("included") ?? 0}`,
    `excluded,${statuses.get("excluded") ?? 0}`,
    `maybe,${statuses.get("maybe") ?? 0}`,
    `full_text_review,${statuses.get("full_text_review") ?? 0}`,
    `final_included,${statuses.get("final_included") ?? 0}`,
  ].join("\n");

  return { ok: true as const, csv };
}
