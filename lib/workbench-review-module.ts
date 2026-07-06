import { createClient } from "@/src/lib/supabase/server";
import {
  getMemberWorkspaceData,
  type BookmarkRow,
  type ReadingListItemRow,
  type ReadingListRow,
} from "@/src/lib/member-workspace";
import type { WorkbenchCollaboratorRow } from "@/lib/workbench-data";
import type {
  PrismaFlowCounts,
  ReviewProjectType,
  ReviewScreeningStatus,
} from "@/lib/workbench-intelligence-types";

export type WorkbenchReviewImport = {
  id: string;
  filename: string | null;
  fileFormat: string | null;
  importTarget: string;
  sourceLabel: string | null;
  status: string;
  errorMessage: string | null;
  referencesCount: number;
  duplicatesCount: number;
  mergedCount: number;
  addedToScreeningCount: number;
  createdAt: string;
};

export type WorkbenchReviewStageCounts = {
  importTotal: number;
  duplicatesRemoved: number;
  awaitingScreening: number;
  screened: number;
  excluded: number;
  fullTextQueue: number;
  fullTextDone: number;
  extractionQueue: number;
  extractionDone: number;
  conflicts: number;
};

export type WorkbenchReviewProject = {
  id: string;
  title: string;
  description: string | null;
  reviewType: ReviewProjectType;
  researchQuestion: string | null;
  inclusionCriteria: string | null;
  exclusionCriteria: string | null;
  searchStrings: string[];
  databasesSearched: string[];
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  notes: string | null;
  protocolNotes: string | null;
  languages: string[];
  reviewMethod: string | null;
  sourceScope: string | null;
  status: "active" | "paused" | "completed" | "archived";
  projectId: string | null;
  questionType: string | null;
  areaOfResearch: string | null;
  purposeOfReview: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
};

export type WorkbenchReviewScreening = {
  id: string;
  projectId: string;
  recordId: string;
  title: string;
  source: string | null;
  year: string | null;
  recordType: string | null;
  sourceUrl: string | null;
  status: ReviewScreeningStatus;
  exclusionReason: string | null;
  notes: string | null;
  conflictStatus: string | null;
  fullTextStatus: string | null;
  updatedAt: string;
};

export type WorkbenchReviewDecision = {
  id: string;
  recordId: string;
  reviewerId: string;
  stage: string;
  decision: string;
  exclusionReason: string | null;
  notes: string | null;
  updatedAt: string;
};

export type WorkbenchReviewConflict = {
  id: string;
  recordId: string;
  stage: string;
  status: string;
  resolutionDecision: string | null;
  title: string;
};

export type WorkbenchReviewField = {
  id: string;
  fieldKey: string;
  name: string;
  fieldType: string;
  required: boolean;
};

export type WorkbenchReviewSnapshot = {
  projects: WorkbenchReviewProject[];
  activeProject: WorkbenchReviewProject | null;
  screenings: WorkbenchReviewScreening[];
  savedRecords: BookmarkRow[];
  readingLists: ReadingListRow[];
  readingListItems: ReadingListItemRow[];
  fields: WorkbenchReviewField[];
  assignments: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  extractions: Array<Record<string, unknown>>;
  fullTexts: Array<Record<string, unknown>>;
  conflicts: WorkbenchReviewConflict[];
  decisions: WorkbenchReviewDecision[];
  collaborators: WorkbenchCollaboratorRow[];
  canManageCollaborators: boolean;
  prismaCounts: PrismaFlowCounts;
  stageCounts: WorkbenchReviewStageCounts;
  imports: WorkbenchReviewImport[];
  errors: string[];
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapProject(row: Record<string, unknown>, isOwner: boolean): WorkbenchReviewProject {
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled review"),
    description: typeof row.description === "string" ? row.description : null,
    reviewType: (typeof row.review_type === "string" ? row.review_type : "systematic_review") as ReviewProjectType,
    researchQuestion: typeof row.research_question === "string" ? row.research_question : null,
    inclusionCriteria: typeof row.inclusion_criteria === "string" ? row.inclusion_criteria : null,
    exclusionCriteria: typeof row.exclusion_criteria === "string" ? row.exclusion_criteria : null,
    searchStrings: stringArray(row.search_strings),
    databasesSearched: stringArray(row.databases_searched),
    dateRangeStart: typeof row.date_range_start === "string" ? row.date_range_start : null,
    dateRangeEnd: typeof row.date_range_end === "string" ? row.date_range_end : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    protocolNotes: typeof row.protocol_notes === "string" ? row.protocol_notes : null,
    languages: stringArray(row.languages),
    reviewMethod: typeof row.review_method === "string" ? row.review_method : null,
    sourceScope: typeof row.source_scope === "string" ? row.source_scope : null,
    status: (typeof row.status === "string" ? row.status : "active") as WorkbenchReviewProject["status"],
    projectId: typeof row.project_id === "string" ? row.project_id : null,
    questionType: typeof row.review_method === "string" ? row.review_method : null,
    areaOfResearch: typeof row.source_scope === "string" ? row.source_scope : null,
    purposeOfReview: typeof row.notes === "string" ? row.notes : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    isOwner,
  };
}

function sourceRecordFor(
  recordId: string,
  bookmarks: BookmarkRow[],
  readingListItems: ReadingListItemRow[],
) {
  return (
    bookmarks.find((bookmark) => bookmark.record_id === recordId) ??
    readingListItems.find((item) => item.record_id === recordId)
  );
}

function mapScreening(
  row: Record<string, unknown>,
  bookmarks: BookmarkRow[],
  readingListItems: ReadingListItemRow[],
  openConflictRecordIds: Set<string>,
): WorkbenchReviewScreening {
  const recordId = String(row.record_id ?? "");
  const source = sourceRecordFor(recordId, bookmarks, readingListItems);
  const sourceRecord = source as Partial<BookmarkRow & ReadingListItemRow> | undefined;
  const storedConflict =
    typeof row.conflict_status === "string" && row.conflict_status !== "none" ? row.conflict_status : null;
  return {
    id: String(row.id),
    projectId: String(row.review_project_id ?? ""),
    recordId,
    title:
      (typeof row.title === "string" && row.title) ||
      sourceRecord?.record_title ||
      recordId,
    source:
      (typeof row.source === "string" && row.source) ||
      sourceRecord?.record_source ||
      null,
    year: sourceRecord?.record_year ?? null,
    recordType: sourceRecord?.record_type ?? null,
    sourceUrl: sourceRecord?.record_source_url ?? null,
    status: (typeof row.screening_status === "string" ? row.screening_status : "imported") as ReviewScreeningStatus,
    exclusionReason: typeof row.exclusion_reason === "string" ? row.exclusion_reason : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    conflictStatus: storedConflict ?? (openConflictRecordIds.has(recordId) ? "open" : null),
    fullTextStatus: typeof row.full_text_status === "string" ? row.full_text_status : null,
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function mapImport(row: Record<string, unknown>): WorkbenchReviewImport {
  return {
    id: String(row.id),
    filename: typeof row.filename === "string" ? row.filename : null,
    fileFormat: typeof row.file_format === "string" ? row.file_format : null,
    importTarget: typeof row.import_target === "string" ? row.import_target : "title_abstract_screening",
    sourceLabel: typeof row.source_label === "string" ? row.source_label : null,
    status: typeof row.status === "string" ? row.status : "success",
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    referencesCount: Number(row.references_count ?? 0),
    duplicatesCount: Number(row.duplicates_count ?? 0),
    mergedCount: Number(row.merged_count ?? 0),
    addedToScreeningCount: Number(row.added_to_screening_count ?? 0),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapDecision(row: Record<string, unknown>): WorkbenchReviewDecision {
  return {
    id: String(row.id),
    recordId: String(row.record_id ?? ""),
    reviewerId: String(row.reviewer_id ?? ""),
    stage: String(row.stage ?? ""),
    decision: String(row.decision ?? ""),
    exclusionReason: typeof row.exclusion_reason === "string" ? row.exclusion_reason : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function mapConflict(
  row: Record<string, unknown>,
  titleByRecordId: Map<string, string>,
): WorkbenchReviewConflict {
  const recordId = String(row.record_id ?? "");
  return {
    id: String(row.id),
    recordId,
    stage: String(row.stage ?? ""),
    status: String(row.status ?? "open"),
    resolutionDecision:
      typeof row.resolution_decision === "string" ? row.resolution_decision : null,
    title: titleByRecordId.get(recordId) ?? recordId,
  };
}

function buildStageCounts(
  screenings: WorkbenchReviewScreening[],
  openConflicts: WorkbenchReviewConflict[],
  imports: WorkbenchReviewImport[],
): WorkbenchReviewStageCounts {
  const duplicatesFromImports = imports.reduce((sum, row) => sum + row.duplicatesCount, 0);
  return {
    importTotal: screenings.length,
    duplicatesRemoved:
      duplicatesFromImports ||
      screenings.filter((row) => row.exclusionReason === "duplicate").length,
    awaitingScreening: screenings.filter((row) => ["imported", "title_abstract_screening"].includes(row.status)).length,
    screened: screenings.filter((row) => ["included", "excluded", "maybe", "full_text_review", "final_included"].includes(row.status)).length,
    excluded: screenings.filter((row) => row.status === "excluded").length,
    fullTextQueue: screenings.filter((row) => ["included", "full_text_review"].includes(row.status)).length,
    fullTextDone: screenings.filter((row) => row.status === "final_included").length,
    extractionQueue: screenings.filter((row) => row.status === "final_included").length,
    extractionDone: 0,
    conflicts: openConflicts.length,
  };
}

function buildCounts(screenings: WorkbenchReviewScreening[]): PrismaFlowCounts {
  return {
    recordsIdentified: screenings.length,
    duplicatesRemoved: screenings.filter((row) => row.exclusionReason === "duplicate").length,
    recordsScreened: screenings.filter((row) =>
      ["included", "excluded", "maybe", "full_text_review", "final_included"].includes(row.status),
    ).length,
    recordsExcluded: screenings.filter((row) => row.status === "excluded").length,
    fullTextAssessed: screenings.filter((row) =>
      ["full_text_review", "final_included"].includes(row.status),
    ).length,
    finalIncluded: screenings.filter((row) => row.status === "final_included").length,
    awaitingScreening: screenings.filter((row) =>
      ["imported", "title_abstract_screening"].includes(row.status),
    ).length,
  };
}

async function optionalRows<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  errors: string[],
) {
  const result = await query;
  if (result.error) {
    errors.push(`${label}: ${result.error.message}`);
    return [];
  }
  return result.data ?? [];
}

async function loadAccessibleReviewProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  errors: string[],
) {
  const ownedRows = await optionalRows<Record<string, unknown>>(
    "Review projects",
    supabase
      .from("workbench_review_projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    errors,
  );

  const { data: memberships, error: membershipError } = await supabase
    .from("workbench_collaborators")
    .select("project_id, role")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (membershipError) errors.push(`Review collaborators: ${membershipError.message}`);

  const linkedProjectIds = (memberships ?? [])
    .map((row) => row.project_id as string)
    .filter(Boolean);

  let sharedRows: Record<string, unknown>[] = [];
  if (linkedProjectIds.length) {
    sharedRows = await optionalRows<Record<string, unknown>>(
      "Shared review projects",
      supabase
        .from("workbench_review_projects")
        .select("*")
        .in("project_id", linkedProjectIds)
        .order("updated_at", { ascending: false }),
      errors,
    );
  }

  const merged = new Map<string, WorkbenchReviewProject>();
  ownedRows.forEach((row) => merged.set(String(row.id), mapProject(row, true)));
  sharedRows.forEach((row) => {
    const id = String(row.id);
    if (!merged.has(id)) merged.set(id, mapProject(row, false));
  });

  return {
    projects: [...merged.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    memberships: memberships ?? [],
  };
}

async function ensureReviewerScreeningQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reviewProjectId: string,
  userId: string,
) {
  const { count } = await supabase
    .from("workbench_review_screenings")
    .select("id", { count: "exact", head: true })
    .eq("review_project_id", reviewProjectId)
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  const { data: records } = await supabase
    .from("workbench_review_records")
    .select("record_id, title, source_label")
    .eq("review_project_id", reviewProjectId);

  if (!records?.length) return;

  await supabase.from("workbench_review_screenings").upsert(
    records.map((row) => ({
      review_project_id: reviewProjectId,
      user_id: userId,
      record_id: row.record_id as string,
      title: (row.title as string | null) ?? null,
      source: (row.source_label as string | null) ?? null,
      screening_status: "imported",
      decision: "unscreened",
    })),
    { onConflict: "review_project_id,record_id,user_id", ignoreDuplicates: true },
  );
}

export async function loadWorkbenchReviewSnapshot(activeProjectId?: string): Promise<WorkbenchReviewSnapshot> {
  const workspace = await getMemberWorkspaceData("/my/workbench/reviews");
  const supabase = await createClient();
  const errors: string[] = [];
  const userId = workspace.profile.id;

  const { projects, memberships } = await loadAccessibleReviewProjects(supabase, userId, errors);
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ??
    projects[0] ??
    null;

  if (activeProject) {
    await ensureReviewerScreeningQueue(supabase, activeProject.id, userId);
  }

  const openConflictRecordIds = new Set<string>();
  const conflictRows = activeProject
    ? await optionalRows<Record<string, unknown>>(
        "Conflicts",
        supabase
          .from("workbench_review_conflicts")
          .select("*")
          .eq("review_project_id", activeProject.id),
        errors,
      )
    : [];

  conflictRows
    .filter((row) => row.status === "open")
    .forEach((row) => openConflictRecordIds.add(String(row.record_id ?? "")));

  const screeningsRows = activeProject
    ? await optionalRows<Record<string, unknown>>(
        "Review screenings",
        supabase
          .from("workbench_review_screenings")
          .select("*")
          .eq("review_project_id", activeProject.id)
          .eq("user_id", userId)
          .order("updated_at", { ascending: false }),
        errors,
      )
    : [];
  const screenings = screeningsRows.map((row) =>
    mapScreening(row, workspace.bookmarks, workspace.readingListItems, openConflictRecordIds),
  );

  const titleByRecordId = new Map(screenings.map((row) => [row.recordId, row.title]));
  const conflicts = conflictRows.map((row) => mapConflict(row, titleByRecordId));
  const openConflicts = conflicts.filter((row) => row.status === "open");

  const fieldsRows = activeProject
    ? await optionalRows<Record<string, unknown>>(
        "Extraction fields",
        supabase
          .from("workbench_review_extraction_fields")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: true }),
        errors,
      )
    : [];

  const importsRows = activeProject
    ? await optionalRows<Record<string, unknown>>(
        "Review imports",
        supabase
          .from("workbench_review_imports")
          .select("*")
          .eq("review_project_id", activeProject.id)
          .order("created_at", { ascending: false }),
        errors,
      )
    : [];
  const imports = importsRows.map(mapImport);

  const decisionsRows = activeProject
    ? await optionalRows<Record<string, unknown>>(
        "Review decisions",
        supabase
          .from("workbench_review_decisions")
          .select("*")
          .eq("review_project_id", activeProject.id)
          .eq("stage", "title_abstract"),
        errors,
      )
    : [];
  const decisions = decisionsRows.map(mapDecision);

  let collaborators: WorkbenchCollaboratorRow[] = [];
  let canManageCollaborators = activeProject?.isOwner ?? false;

  if (activeProject?.projectId) {
    const collabRows = await optionalRows<WorkbenchCollaboratorRow>(
      "Review collaborators",
      supabase
        .from("workbench_collaborators")
        .select("*")
        .eq("project_id", activeProject.projectId)
        .order("created_at", { ascending: false }),
      errors,
    );
    collaborators = collabRows;

    if (!canManageCollaborators) {
      const membership = memberships.find((row) => row.project_id === activeProject.projectId);
      canManageCollaborators = membership?.role === "editor";
    }
  }

  const [assignments, comments, extractions, fullTexts] = activeProject
    ? await Promise.all([
        optionalRows<Record<string, unknown>>(
          "Assignments",
          supabase.from("workbench_review_assignments").select("*").eq("project_id", activeProject.id),
          errors,
        ),
        optionalRows<Record<string, unknown>>(
          "Comments",
          supabase.from("workbench_review_comments").select("*").eq("project_id", activeProject.id),
          errors,
        ),
        optionalRows<Record<string, unknown>>(
          "Extractions",
          supabase.from("workbench_review_extractions").select("*").eq("project_id", activeProject.id),
          errors,
        ),
        optionalRows<Record<string, unknown>>(
          "Full texts",
          supabase.from("workbench_review_full_texts").select("*").eq("review_project_id", activeProject.id),
          errors,
        ),
      ])
    : [[], [], [], []];

  return {
    projects,
    activeProject,
    screenings,
    savedRecords: workspace.bookmarks,
    readingLists: workspace.readingLists,
    readingListItems: workspace.readingListItems,
    fields: fieldsRows.map((row) => ({
      id: String(row.id),
      fieldKey: String(row.field_key ?? ""),
      name: String(row.name ?? "Untitled field"),
      fieldType: String(row.field_type ?? "text"),
      required: row.required === true,
    })),
    assignments,
    comments,
    extractions,
    fullTexts,
    conflicts,
    decisions,
    collaborators,
    canManageCollaborators,
    prismaCounts: buildCounts(screenings),
    stageCounts: buildStageCounts(screenings, openConflicts, imports),
    imports,
    errors,
  };
}
