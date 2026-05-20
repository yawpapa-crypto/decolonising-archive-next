"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import type {
  ReviewExclusionReason,
  ReviewProjectType,
  ReviewScreeningStatus,
} from "@/lib/workbench-intelligence-types";
import { isWorkbenchReviewProjectType } from "@/lib/workbench-types";
import { inviteWorkbenchCollaborator } from "@/lib/workbench-collaborator-actions";
import type { WorkbenchCollaboratorRole } from "@/lib/workbench-collaborator-actions";

import * as extractions from "@/lib/workbench-review-extractions";
import {
  detectBibliographicFormat,
  parseBibliographicFile,
  parsedRecordsWithIds,
} from "@/lib/workbench-review-import-parser";

const WORKBENCH_PATH = "/my/workbench";
const INTELLIGENCE_PATH = "/my/workbench/intelligence";
const REVIEWS_PATH = "/my/workbench/reviews";

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
  protocolNotes?: string;
  languages?: string[];
  reviewMethod?: string;
  sourceScope?: string;
  description?: string | null;
  projectId?: string | null;
  questionType?: string;
  areaOfResearch?: string;
  purposeOfReview?: string;
};


async function syncScreeningConflictStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  recordId: string,
  stage: "title_abstract" | "full_text" | "extraction",
  status: "open" | "resolved" | "none",
) {
  const conflictStatus = status === "none" ? "none" : status;
  await supabase
    .from("workbench_review_screenings")
    .update({ conflict_status: conflictStatus })
    .eq("review_project_id", projectId)
    .eq("record_id", recordId);
}

async function provisionReviewerScreenings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reviewProjectId: string,
  reviewerUserId: string,
) {
  const { data: records } = await supabase
    .from("workbench_review_records")
    .select("record_id, title, source_label")
    .eq("review_project_id", reviewProjectId);

  if (!records?.length) return;

  await supabase.from("workbench_review_screenings").upsert(
    records.map((row) => ({
      review_project_id: reviewProjectId,
      user_id: reviewerUserId,
      record_id: row.record_id as string,
      title: (row.title as string | null) ?? null,
      source: (row.source_label as string | null) ?? null,
      screening_status: "imported",
      decision: "unscreened",
    })),
    { onConflict: "review_project_id,record_id,user_id", ignoreDuplicates: true },
  );
}

function revalidateReviewPaths(projectId?: string) {
  revalidatePath(WORKBENCH_PATH);
  revalidatePath(INTELLIGENCE_PATH);
  revalidatePath(REVIEWS_PATH);
  if (projectId) revalidatePath(`${REVIEWS_PATH}/${projectId}`);
}

function dedupeKey(input: { doi?: string | null; title?: string | null }) {
  if (input.doi?.trim()) return `doi:${input.doi.trim().toLowerCase()}`;
  const title = input.title?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return title ? `title:${title}` : null;
}

function reviewStageForStatus(status: ReviewScreeningStatus) {
  return status === "full_text_review" || status === "final_included"
    ? "full_text"
    : "title_abstract";
}

function decisionForStatus(status: ReviewScreeningStatus) {
  if (status === "included" || status === "full_text_review" || status === "final_included") {
    return "include";
  }
  if (status === "excluded") return "exclude";
  if (status === "maybe") return "maybe";
  return "pending";
}

function defaultExtractionFieldsForReview(type: ReviewProjectType) {
  const common = [
    { fieldKey: "country_region", name: "Country / region", fieldType: "text", required: false },
    { fieldKey: "method", name: "Method", fieldType: "text", required: false },
    { fieldKey: "population_context", name: "Population / context", fieldType: "long_text", required: false },
    { fieldKey: "findings", name: "Findings", fieldType: "long_text", required: false },
    { fieldKey: "relevance", name: "Relevance", fieldType: "select", required: false },
    { fieldKey: "source_type", name: "Source type", fieldType: "text", required: false },
    { fieldKey: "epistemic_geographic_coverage", name: "Epistemic / geographic coverage", fieldType: "long_text", required: false },
  ];

  if (type === "evidence_map") {
    return [
      ...common,
      { fieldKey: "evidence_gap", name: "Evidence gap", fieldType: "long_text", required: false },
      { fieldKey: "map_category", name: "Map category", fieldType: "text", required: false },
    ];
  }

  if (type === "rapid_review") {
    return [
      ...common,
      { fieldKey: "certainty", name: "Certainty", fieldType: "select", required: false },
      { fieldKey: "time_sensitive_note", name: "Time-sensitive note", fieldType: "long_text", required: false },
    ];
  }

  return common;
}

async function createDefaultExtractionFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { projectId: string; userId: string; reviewType: ReviewProjectType },
) {
  const fields = defaultExtractionFieldsForReview(input.reviewType).map((field) => ({
    project_id: input.projectId,
    field_key: field.fieldKey,
    name: field.name,
    field_type: field.fieldType,
    required: field.required,
    created_by: input.userId,
  }));

  if (!fields.length) return null;
  const { error } = await supabase
    .from("workbench_review_extraction_fields")
    .upsert(fields, { onConflict: "project_id,field_key", ignoreDuplicates: true });
  return error;
}

async function recordMetadataForIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { userId: string; recordIds: string[]; readingListId?: string },
) {
  const metadata = new Map<
    string,
    {
      title: string | null;
      source: string | null;
      sourceUrl: string | null;
      recordType: string | null;
      year: string | null;
      raw: Record<string, unknown> | null;
    }
  >();

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata")
    .eq("user_id", input.userId)
    .in("record_id", input.recordIds);

  (bookmarks ?? []).forEach((row) => {
    metadata.set(row.record_id as string, {
      title: (row.record_title as string | null) ?? null,
      source: (row.record_source as string | null) ?? null,
      sourceUrl: (row.record_source_url as string | null) ?? null,
      recordType: (row.record_type as string | null) ?? null,
      year: (row.record_year as string | null) ?? null,
      raw: (row.record_metadata as Record<string, unknown> | null) ?? null,
    });
  });

  let listQuery = supabase
    .from("reading_list_items")
    .select("record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata")
    .in("record_id", input.recordIds);
  if (input.readingListId) listQuery = listQuery.eq("reading_list_id", input.readingListId);
  const { data: listItems } = await listQuery;

  (listItems ?? []).forEach((row) => {
    if (metadata.has(row.record_id as string)) return;
    metadata.set(row.record_id as string, {
      title: (row.record_title as string | null) ?? null,
      source: (row.record_source as string | null) ?? null,
      sourceUrl: (row.record_source_url as string | null) ?? null,
      recordType: (row.record_type as string | null) ?? null,
      year: (row.record_year as string | null) ?? null,
      raw: (row.record_metadata as Record<string, unknown> | null) ?? null,
    });
  });

  return metadata;
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

  let linkedProjectId = input.projectId?.trim() || null;
  if (!linkedProjectId) {
    const { data: linkedProject, error: linkedProjectError } = await supabase
      .from("workbench_projects")
      .insert({
        owner_id: user.id,
        title,
        description: input.description?.trim() || null,
        project_type: isWorkbenchReviewProjectType(input.reviewType)
          ? input.reviewType
          : "custom_project",
        visibility: "private",
        status: "active",
      })
      .select("id")
      .single();

    if (linkedProjectError || !linkedProject) {
      return {
        ok: false as const,
        error: linkedProjectError?.message ?? "Could not create linked Workbench project.",
      };
    }
    linkedProjectId = linkedProject.id as string;
  }

  const existing = linkedProjectId
    ? await supabase
        .from("workbench_review_projects")
        .select("id")
        .eq("project_id", linkedProjectId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  if (existing.error) return { ok: false as const, error: existing.error.message };
  if (existing.data?.id) {
    const defaultFieldsError = await createDefaultExtractionFields(supabase, {
      projectId: existing.data.id as string,
      userId: user.id,
      reviewType: input.reviewType,
    });
    revalidateReviewPaths(existing.data.id as string);
    if (linkedProjectId) {
      revalidatePath(`${WORKBENCH_PATH}/projects`);
      revalidatePath(`${WORKBENCH_PATH}/projects/${linkedProjectId}`);
    }
    return {
      ok: true as const,
      projectId: existing.data.id as string,
      warning: defaultFieldsError?.message,
    };
  }

  const { data, error } = await supabase
    .from("workbench_review_projects")
    .insert({
      user_id: user.id,
      project_id: linkedProjectId,
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

  const defaultFieldsError = await createDefaultExtractionFields(supabase, {
    projectId: data.id as string,
    userId: user.id,
    reviewType: input.reviewType,
  });

  revalidateReviewPaths(data.id as string);
  if (linkedProjectId) {
    revalidatePath(`${WORKBENCH_PATH}/projects`);
    revalidatePath(`${WORKBENCH_PATH}/projects/${linkedProjectId}`);
  }
  return {
    ok: true as const,
    projectId: data.id as string,
    warning: defaultFieldsError?.message,
  };
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
  if (patch.reviewType != null) payload.review_type = patch.reviewType;
  if (patch.researchQuestion != null) payload.research_question = patch.researchQuestion.trim() || null;
  if (patch.inclusionCriteria != null) payload.inclusion_criteria = patch.inclusionCriteria.trim() || null;
  if (patch.exclusionCriteria != null) payload.exclusion_criteria = patch.exclusionCriteria.trim() || null;
  if (patch.searchStrings != null) payload.search_strings = patch.searchStrings;
  if (patch.databasesSearched != null) payload.databases_searched = patch.databasesSearched;
  if (patch.dateRangeStart !== undefined) payload.date_range_start = patch.dateRangeStart || null;
  if (patch.dateRangeEnd !== undefined) payload.date_range_end = patch.dateRangeEnd || null;
  if (patch.notes != null) payload.notes = patch.notes.trim() || null;
  if (patch.protocolNotes != null) payload.protocol_notes = patch.protocolNotes.trim() || null;
  if (patch.languages != null) payload.languages = patch.languages;
  if (patch.reviewMethod != null) payload.review_method = patch.reviewMethod.trim() || null;
  if (patch.sourceScope != null) payload.source_scope = patch.sourceScope.trim() || null;
  if (patch.questionType != null) payload.review_method = patch.questionType.trim() || null;
  if (patch.areaOfResearch != null) payload.source_scope = patch.areaOfResearch.trim() || null;
  if (patch.purposeOfReview != null) payload.notes = patch.purposeOfReview.trim() || null;
  if (patch.status != null) payload.status = patch.status;

  const { error } = await supabase
    .from("workbench_review_projects")
    .update(payload)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidateReviewPaths(projectId);
  return { ok: true as const };
}

export async function importRecordsToReviewProject(
  projectId: string,
  recordIds: string[],
  source: "saved_record" | "reading_list" | "library_search" | "manual" | "project_record" = "manual",
  options?: { readingListId?: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const unique = [...new Set(recordIds.filter(Boolean))];
  if (!unique.length) return { ok: false as const, error: "No records selected." };
  const metadataById = await recordMetadataForIds(supabase, {
    userId: user.id,
    recordIds: unique,
    readingListId: options?.readingListId,
  });

  const rows = unique.map((recordId) => ({
    review_project_id: projectId,
    user_id: user.id,
    record_id: recordId,
    title: metadataById.get(recordId)?.title ?? null,
    source: metadataById.get(recordId)?.source ?? null,
    screening_status: "imported" as const,
    decision: "unscreened",
  }));

  const { error } = await supabase
    .from("workbench_review_screenings")
    .upsert(rows, { onConflict: "review_project_id,record_id,user_id", ignoreDuplicates: true });

  if (error) return { ok: false as const, error: error.message };

  const recordRows = await supabase.from("workbench_review_records").upsert(
    unique.map((recordId) => ({
      review_project_id: projectId,
      user_id: user.id,
      record_id: recordId,
      title: metadataById.get(recordId)?.title ?? null,
      year: metadataById.get(recordId)?.year ?? null,
      source_url: metadataById.get(recordId)?.sourceUrl ?? null,
      source_label: metadataById.get(recordId)?.source ?? null,
      record_type: metadataById.get(recordId)?.recordType ?? null,
      source_metadata: metadataById.get(recordId)?.raw ?? {},
      import_source: source,
      dedupe_key: dedupeKey({ title: metadataById.get(recordId)?.title ?? recordId }),
    })),
    { onConflict: "review_project_id,record_id", ignoreDuplicates: true },
  );
  if (recordRows.error) return { ok: false as const, error: recordRows.error.message };

  revalidateReviewPaths(projectId);
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
  return importRecordsToReviewProject(projectId, recordIds, "saved_record");
}

export async function importReadingListToReviewProject(projectId: string, readingListId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: list, error: listError } = await supabase
    .from("reading_lists")
    .select("id")
    .eq("id", readingListId)
    .eq("user_id", user.id)
    .single();
  if (listError || !list) return { ok: false as const, error: listError?.message ?? "Reading list not found." };

  const { data, error } = await supabase
    .from("reading_list_items")
    .select("record_id")
    .eq("reading_list_id", readingListId);

  if (error) return { ok: false as const, error: error.message };
  return importRecordsToReviewProject(
    projectId,
    (data ?? []).map((row) => row.record_id as string),
    "reading_list",
    { readingListId },
  );
}

export async function manualAddReviewRecord(input: {
  projectId: string;
  title: string;
  source?: string | null;
  year?: string | null;
  doi?: string | null;
  sourceUrl?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title is required." };
  const recordId =
    input.doi?.trim()
      ? `manual-doi-${input.doi.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      : `manual-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}`;

  const screening = await supabase.from("workbench_review_screenings").upsert(
    {
      review_project_id: input.projectId,
      user_id: user.id,
      record_id: recordId,
      title,
      source: input.source?.trim() || null,
      screening_status: "imported",
      decision: "unscreened",
    },
    { onConflict: "review_project_id,record_id,user_id" },
  );
  if (screening.error) return { ok: false as const, error: screening.error.message };

  const reviewRecord = await supabase.from("workbench_review_records").upsert(
    {
      review_project_id: input.projectId,
      user_id: user.id,
      record_id: recordId,
      title,
      year: input.year?.trim() || null,
      doi: input.doi?.trim() || null,
      source_url: input.sourceUrl?.trim() || null,
      source_label: input.source?.trim() || null,
      import_source: "manual",
      dedupe_key: dedupeKey({ doi: input.doi, title }),
    },
    { onConflict: "review_project_id,record_id" },
  );
  if (reviewRecord.error) return { ok: false as const, error: reviewRecord.error.message };

  revalidateReviewPaths(input.projectId);
  return { ok: true as const, recordId };
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

  const stage = reviewStageForStatus(input.screeningStatus);
  const decision = decisionForStatus(input.screeningStatus);
  const { error } = await supabase.from("workbench_review_screenings").upsert(
    {
      review_project_id: input.projectId,
      user_id: user.id,
      record_id: input.recordId,
      screening_status: input.screeningStatus,
      decision,
      exclusion_reason:
        input.screeningStatus === "excluded" ? input.exclusionReason ?? "other" : null,
      notes: input.notes?.trim() || null,
      full_text_status:
        input.screeningStatus === "full_text_review" || input.screeningStatus === "final_included"
          ? "found"
          : undefined,
    },
    { onConflict: "review_project_id,record_id,user_id" },
  );

  if (error) return { ok: false as const, error: error.message };
  if (decision !== "pending") {
    const decisionResult = await supabase.from("workbench_review_decisions").upsert(
      {
        review_project_id: input.projectId,
        record_id: input.recordId,
        reviewer_id: user.id,
        stage,
        decision,
        exclusion_reason:
          input.screeningStatus === "excluded" ? input.exclusionReason ?? "other" : null,
        notes: input.notes?.trim() || null,
      },
      { onConflict: "review_project_id,record_id,reviewer_id,stage" },
    );
    if (decisionResult.error) return { ok: false as const, error: decisionResult.error.message };

    const { data: decisions } = await supabase
      .from("workbench_review_decisions")
      .select("decision")
      .eq("review_project_id", input.projectId)
      .eq("record_id", input.recordId)
      .eq("stage", stage);
    const uniqueDecisions = new Set((decisions ?? []).map((row) => row.decision as string));
    if (uniqueDecisions.size > 1) {
      await supabase.from("workbench_review_conflicts").upsert(
        {
          review_project_id: input.projectId,
          record_id: input.recordId,
          stage,
          status: "open",
        },
        { onConflict: "review_project_id,record_id,stage" },
      );
      await syncScreeningConflictStatus(supabase, input.projectId, input.recordId, stage, "open");
    } else {
      await supabase
        .from("workbench_review_conflicts")
        .update({ status: "resolved", resolution_decision: decision })
        .eq("review_project_id", input.projectId)
        .eq("record_id", input.recordId)
        .eq("stage", stage)
        .eq("status", "open");
      await syncScreeningConflictStatus(supabase, input.projectId, input.recordId, stage, "none");
    }
  }

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

  revalidateReviewPaths(input.projectId);
  return { ok: true as const };
}

export async function updateReviewFullText(input: {
  projectId: string;
  recordId: string;
  url?: string | null;
  accessStatus?: "not_sought" | "found" | "uploaded" | "unavailable";
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
      url: input.url?.trim() || null,
      access_status: input.accessStatus ?? "not_sought",
      notes: input.notes?.trim() || null,
    },
    { onConflict: "review_project_id,record_id" },
  );

  if (error) return { ok: false as const, error: error.message };
  const screeningUpdate = await supabase
    .from("workbench_review_screenings")
    .update({
      full_text_url: input.url?.trim() || null,
      full_text_status: input.accessStatus ?? "not_sought",
    })
    .eq("review_project_id", input.projectId)
    .eq("record_id", input.recordId)
    .eq("user_id", user.id);
  if (screeningUpdate.error) return { ok: false as const, error: screeningUpdate.error.message };

  revalidateReviewPaths(input.projectId);
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

export async function createExtractionField(projectId: string, field: { fieldKey: string; name: string; fieldType: string; options?: Record<string, unknown>; required?: boolean; }) {
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

  const { data: review, error: reviewError } = await supabase
    .from("workbench_review_projects")
    .select("project_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (reviewError) return { ok: false as const, error: reviewError.message };

  const { error } = await supabase
    .from("workbench_review_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  if (review?.project_id) {
    await supabase.from("workbench_projects").delete().eq("id", review.project_id).eq("owner_id", user.id);
  }

  revalidateReviewPaths(projectId);
  return { ok: true as const };
}

export async function deduplicateReviewRecords(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: records, error } = await supabase
    .from("workbench_review_records")
    .select("id, record_id, dedupe_key, title, doi")
    .eq("review_project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) return { ok: false as const, error: error.message };

  const seen = new Map<string, string>();
  let duplicates = 0;
  for (const row of records ?? []) {
    const key =
      (typeof row.dedupe_key === "string" && row.dedupe_key) ||
      dedupeKey({ doi: typeof row.doi === "string" ? row.doi : null, title: typeof row.title === "string" ? row.title : null });
    if (!key) continue;
    const canonicalId = seen.get(key);
    if (!canonicalId) {
      seen.set(key, row.record_id as string);
      continue;
    }
    duplicates += 1;
    await supabase
      .from("workbench_review_records")
      .update({ duplicate_of: row.id as string })
      .eq("id", row.id as string);
    await supabase
      .from("workbench_review_screenings")
      .update({
        screening_status: "excluded",
        exclusion_reason: "duplicate",
        decision: "exclude",
        duplicate_of: canonicalId,
      })
      .eq("review_project_id", projectId)
      .eq("record_id", row.record_id as string)
      .eq("user_id", user.id);
  }

  revalidateReviewPaths(projectId);
  return { ok: true as const, duplicates };
}

export async function resolveReviewConflict(input: {
  projectId: string;
  recordId: string;
  stage: "title_abstract" | "full_text" | "extraction";
  resolutionDecision: "include" | "exclude" | "maybe";
  notes?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const statusMap = {
    include: input.stage === "full_text" ? "final_included" : "included",
    exclude: "excluded",
    maybe: "maybe",
  } as const;

  const screeningStatus = statusMap[input.resolutionDecision];
  const screening = await updateReviewScreening({
    projectId: input.projectId,
    recordId: input.recordId,
    screeningStatus,
    exclusionReason: input.resolutionDecision === "exclude" ? "other" : null,
    notes: input.notes,
  });
  if (!screening.ok) return screening;

  const { error } = await supabase
    .from("workbench_review_conflicts")
    .update({
      status: "resolved",
      resolver_id: user.id,
      resolution_decision: input.resolutionDecision,
      resolution_notes: input.notes?.trim() || null,
    })
    .eq("review_project_id", input.projectId)
    .eq("record_id", input.recordId)
    .eq("stage", input.stage);

  if (error) return { ok: false as const, error: error.message };

  await syncScreeningConflictStatus(supabase, input.projectId, input.recordId, input.stage, "none");

  revalidateReviewPaths(input.projectId);
  return { ok: true as const };
}

export async function inviteReviewCollaborator(input: {
  reviewProjectId: string;
  email: string;
  role: WorkbenchCollaboratorRole;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const reviewProjectId = input.reviewProjectId.trim();
  if (!reviewProjectId) return { ok: false as const, error: "Missing review project." };

  const { data: review, error: reviewError } = await supabase
    .from("workbench_review_projects")
    .select("project_id, user_id")
    .eq("id", reviewProjectId)
    .maybeSingle();

  if (reviewError) return { ok: false as const, error: reviewError.message };
  if (!review?.project_id) {
    return {
      ok: false as const,
      error: "This review is not linked to a Workbench project yet. Save settings and try again.",
    };
  }

  const result = await inviteWorkbenchCollaborator({
    projectId: review.project_id as string,
    email: input.email,
    role: input.role,
  });

  if (result.ok && result.collaborator?.user_id) {
    await provisionReviewerScreenings(supabase, reviewProjectId, result.collaborator.user_id);
  }

  revalidateReviewPaths(reviewProjectId);
  return result;
}

export async function exportReviewCounts(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in.", csv: "" };

  const { data: screenings, error } = await supabase
    .from("workbench_review_screenings")
    .select("screening_status, exclusion_reason, conflict_status, full_text_status")
    .eq("review_project_id", projectId)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message, csv: "" };

  const rows = screenings ?? [];
  const counts = {
    identified: rows.length,
    duplicates: rows.filter((row) => row.exclusion_reason === "duplicate").length,
    screened: rows.filter((row) =>
      ["included", "excluded", "maybe", "full_text_review", "final_included"].includes(String(row.screening_status)),
    ).length,
    excluded: rows.filter((row) => row.screening_status === "excluded").length,
    fullText: rows.filter((row) => ["full_text_review", "final_included"].includes(String(row.screening_status))).length,
    included: rows.filter((row) => row.screening_status === "final_included").length,
    conflicts: rows.filter((row) => row.conflict_status && row.conflict_status !== "none").length,
    awaiting: rows.filter((row) => ["imported", "title_abstract_screening"].includes(String(row.screening_status))).length,
  };

  const csv = [
    "metric,count",
    `identified,${counts.identified}`,
    `duplicates,${counts.duplicates}`,
    `screened,${counts.screened}`,
    `excluded,${counts.excluded}`,
    `full_text,${counts.fullText}`,
    `included,${counts.included}`,
    `conflicts,${counts.conflicts}`,
    `awaiting_screening,${counts.awaiting}`,
  ].join("\n");

  return { ok: true as const, csv, counts };
}

export async function importBibliographicFileToReviewProject(input: {
  projectId: string;
  filename: string;
  content: string;
  importTarget?: "title_abstract_screening" | "full_text_review" | "extraction";
  sourceLabel?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const format = detectBibliographicFormat(input.filename, input.content);
  if (format === "unknown") {
    const failed = await supabase.from("workbench_review_imports").insert({
      review_project_id: input.projectId,
      user_id: user.id,
      filename: input.filename,
      file_format: "unknown",
      import_target: input.importTarget ?? "title_abstract_screening",
      source_label: input.sourceLabel?.trim() || null,
      status: "failed",
      error_message: "Unsupported file format. Use RIS, BibTeX, EndNote XML, or CSV.",
    });
    if (failed.error) return { ok: false as const, error: failed.error.message };
    revalidateReviewPaths(input.projectId);
    return { ok: false as const, error: "Unsupported file format." };
  }

  const parsed = parsedRecordsWithIds(parseBibliographicFile(input.content, format));
  if (!parsed.length) {
    await supabase.from("workbench_review_imports").insert({
      review_project_id: input.projectId,
      user_id: user.id,
      filename: input.filename,
      file_format: format,
      import_target: input.importTarget ?? "title_abstract_screening",
      source_label: input.sourceLabel?.trim() || null,
      status: "failed",
      error_message: "No references found in file.",
      references_count: 0,
    });
    revalidateReviewPaths(input.projectId);
    return { ok: false as const, error: "No references found in file." };
  }

  const { data: existingRecords } = await supabase
    .from("workbench_review_records")
    .select("record_id, dedupe_key, doi, title")
    .eq("review_project_id", input.projectId)
    .eq("user_id", user.id);

  const existingKeys = new Set<string>();
  (existingRecords ?? []).forEach((row) => {
    const key =
      (typeof row.dedupe_key === "string" && row.dedupe_key) ||
      dedupeKey({ doi: typeof row.doi === "string" ? row.doi : null, title: typeof row.title === "string" ? row.title : null });
    if (key) existingKeys.add(key);
  });

  let duplicates = 0;
  let merged = 0;
  let added = 0;
  const importTarget = input.importTarget ?? "title_abstract_screening";
  const initialStatus =
    importTarget === "full_text_review"
      ? "full_text_review"
      : importTarget === "extraction"
        ? "final_included"
        : "imported";

  for (const record of parsed) {
    const key = dedupeKey({ doi: record.doi, title: record.title });
    if (key && existingKeys.has(key)) {
      duplicates += 1;
      continue;
    }
    if (key) existingKeys.add(key);

    const screeningResult = await supabase.from("workbench_review_screenings").upsert(
      {
        review_project_id: input.projectId,
        user_id: user.id,
        record_id: record.recordId,
        title: record.title,
        source: record.sourceLabel ?? input.sourceLabel ?? null,
        screening_status: initialStatus,
        decision: "unscreened",
      },
      { onConflict: "review_project_id,record_id,user_id", ignoreDuplicates: true },
    );
    if (screeningResult.error) continue;

    const recordResult = await supabase.from("workbench_review_records").upsert(
      {
        review_project_id: input.projectId,
        user_id: user.id,
        record_id: record.recordId,
        title: record.title,
        authors: record.authors ?? null,
        year: record.year ?? null,
        doi: record.doi ?? null,
        source_url: record.sourceUrl ?? null,
        source_label: record.sourceLabel ?? input.sourceLabel ?? null,
        record_type: record.recordType ?? null,
        import_source: "file_import",
        source_metadata: { abstract: record.abstract ?? null, format },
        dedupe_key: key,
      },
      { onConflict: "review_project_id,record_id", ignoreDuplicates: true },
    );
    if (recordResult.error) continue;
    added += 1;
  }

  merged = duplicates;
  await supabase.from("workbench_review_imports").insert({
    review_project_id: input.projectId,
    user_id: user.id,
    filename: input.filename,
    file_format: format,
    import_target: importTarget,
    source_label: input.sourceLabel?.trim() || null,
    status: added ? "success" : "partial",
    references_count: parsed.length,
    duplicates_count: duplicates,
    merged_count: merged,
    added_to_screening_count: added,
  });

  revalidateReviewPaths(input.projectId);
  return {
    ok: true as const,
    imported: added,
    references: parsed.length,
    duplicates,
    merged,
  };
}

export async function listReviewImports(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, imports: [], error: "Not signed in." };

  const { data, error } = await supabase
    .from("workbench_review_imports")
    .select("*")
    .eq("review_project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false as const, imports: [], error: error.message };
  return { ok: true as const, imports: data ?? [] };
}
