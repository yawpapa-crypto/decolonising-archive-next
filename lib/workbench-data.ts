import { createClient } from "@/src/lib/supabase/server";
import type { ArchiveRecord } from "@/lib/records";
import { readRecords } from "@/lib/records";
import {
  DEFAULT_RESEARCH_MILESTONES,
  type ProjectRecordStatusId,
} from "@/lib/workbench-types";

export type WorkbenchProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  project_type: string;
  visibility: string;
  status: string;
  deadline: string | null;
  is_curated_public: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkbenchProjectRecordRow = {
  id: string;
  project_id: string;
  record_id: string;
  status: string;
  notes: string | null;
  usefulness_tags: string[] | null;
  citation_checked: boolean;
  source_checked: boolean;
  rights_checked: boolean;
  cultural_review_needed: boolean;
  metadata_review_needed: boolean;
  date_accessed: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkbenchTaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  owner_name?: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  linked_record_ids: string[] | null;
  notes: string | null;
  review_type: string;
  workflow_stage?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkbenchMilestoneRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WorkbenchAnnotationRow = {
  id: string;
  project_id: string;
  record_id: string;
  user_id: string;
  note: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export type WorkbenchCollaboratorRow = {
  id: string;
  project_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status?: string | null;
  invited_by?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type WorkbenchNoteRow = {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  plain_text: string | null;
  word_count: number;
  character_count: number;
  pinned: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type WorkbenchNoteWithProject = WorkbenchNoteRow & {
  project_title: string;
};

export type WorkbenchNoteRecordLinkRow = {
  id: string;
  note_id: string;
  record_id: string;
  created_at: string;
};

export type WorkbenchLinkableRecord = {
  record_id: string;
  title: string;
  source_type: string | null;
  project_id: string | null;
};

export type WorkbenchCitationSourceType = "linked" | "bookmark" | "reading_list";

export type WorkbenchCitationSource = {
  id: string;
  recordId: string;
  sourceType: WorkbenchCitationSourceType;
  sourceLabel: string;
  readingListId?: string | null;
  readingListTitle?: string | null;
  bookmarkId?: string | null;
  title: string;
  creator?: string | null;
  date?: string | null;
  institution?: string | null;
  sourceUrl?: string | null;
  recordType?: string | null;
  citationText?: string | null;
};

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function recordTypeLabel(record: ArchiveRecord | undefined) {
  if (!record?.recordType?.length) return null;
  return record.recordType.join(", ");
}

function sourceFromArchive(
  recordId: string,
  archive: ArchiveRecord | undefined,
  fallback: {
    title?: string | null;
    creator?: string | null;
    date?: string | null;
    institution?: string | null;
    sourceUrl?: string | null;
    recordType?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const metadata = asRecord(fallback.metadata);
  return {
    title:
      firstText(fallback.title, archive?.title, metadata.title, metadata.displayTitle) ||
      recordId,
    creator: firstText(fallback.creator, archive?.creator, metadata.creator, metadata.author) || null,
    date:
      firstText(
        fallback.date,
        archive?.dateCreated,
        archive?.datePublished,
        metadata.date,
        metadata.year,
      ) || null,
    institution:
      firstText(
        fallback.institution,
        archive?.sourceName,
        metadata.source,
        metadata.source_name,
        metadata.publisher,
      ) || null,
    sourceUrl: firstText(fallback.sourceUrl, archive?.sourceUrl, metadata.url, metadata.source_url) || null,
    recordType:
      firstText(fallback.recordType, archive?.sourceType, recordTypeLabel(archive), metadata.type) ||
      null,
    citationText:
      firstText(archive?.citation, metadata.citation, fallback.title, archive?.title) || null,
  };
}

export async function listWorkbenchProjects(): Promise<{
  ok: boolean;
  error?: string;
  projects: WorkbenchProjectRow[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message, projects: [] };
  return { ok: true, projects: (data ?? []) as WorkbenchProjectRow[] };
}

export async function listWorkbenchProjectsSummary(): Promise<{
  ok: boolean;
  error?: string;
  projects: Array<WorkbenchProjectRow & { record_count: number }>;
}> {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("workbench_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message, projects: [] };

  const rows = (projects ?? []) as WorkbenchProjectRow[];
  if (!rows.length) return { ok: true, projects: [] };

  const ids = rows.map((p) => p.id);
  const { data: counts, error: countError } = await supabase
    .from("workbench_project_records")
    .select("project_id")
    .in("project_id", ids);

  if (countError) return { ok: false, error: countError.message, projects: [] };

  const tally = new Map<string, number>();
  for (const row of counts ?? []) {
    const pid = (row as { project_id: string }).project_id;
    tally.set(pid, (tally.get(pid) ?? 0) + 1);
  }

  return {
    ok: true,
    projects: rows.map((p) => ({
      ...p,
      record_count: tally.get(p.id) ?? 0,
    })),
  };
}

export async function getWorkbenchProjectBundle(projectId: string): Promise<{
  ok: boolean;
  error?: string;
  project: WorkbenchProjectRow | null;
  records: WorkbenchProjectRecordRow[];
  tasks: WorkbenchTaskRow[];
  milestones: WorkbenchMilestoneRow[];
  annotations: WorkbenchAnnotationRow[];
  collaborators: WorkbenchCollaboratorRow[];
}> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("workbench_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return {
      ok: false,
      error: projectError.message,
      project: null,
      records: [],
      tasks: [],
      milestones: [],
      annotations: [],
      collaborators: [],
    };
  }
  if (!project) {
    return {
      ok: true,
      project: null,
      records: [],
      tasks: [],
      milestones: [],
      annotations: [],
      collaborators: [],
    };
  }

  const [recordsRes, tasksRes, milestonesRes, annotationsRes, collabRes] =
    await Promise.all([
      supabase
        .from("workbench_project_records")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("workbench_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true }),
      supabase
        .from("workbench_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true }),
      supabase
        .from("workbench_annotations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("workbench_collaborators")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
    ]);

  const firstErr =
    recordsRes.error ||
    tasksRes.error ||
    milestonesRes.error ||
    annotationsRes.error ||
    collabRes.error;

  if (firstErr) {
    return {
      ok: false,
      error: firstErr.message,
      project: project as WorkbenchProjectRow,
      records: [],
      tasks: [],
      milestones: [],
      annotations: [],
      collaborators: [],
    };
  }

  return {
    ok: true,
    project: project as WorkbenchProjectRow,
    records: (recordsRes.data ?? []) as WorkbenchProjectRecordRow[],
    tasks: (tasksRes.data ?? []) as WorkbenchTaskRow[],
    milestones: (milestonesRes.data ?? []) as WorkbenchMilestoneRow[],
    annotations: (annotationsRes.data ?? []) as WorkbenchAnnotationRow[],
    collaborators: (collabRes.data ?? []) as WorkbenchCollaboratorRow[],
  };
}

export async function listAllWorkbenchTasks(limit = 80): Promise<{
  ok: boolean;
  error?: string;
  tasks: Array<WorkbenchTaskRow & { project_title: string }>;
}> {
  const supabase = await createClient();
  const { data: tasks, error } = await supabase
    .from("workbench_tasks")
    .select("*")
    .order("due_date", { ascending: true })
    .limit(limit);

  if (error) return { ok: false, error: error.message, tasks: [] };

  const taskRows = (tasks ?? []) as WorkbenchTaskRow[];
  const projectIds = Array.from(new Set(taskRows.map((t) => t.project_id)));
  let titles = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await supabase
      .from("workbench_projects")
      .select("id, title")
      .in("id", projectIds);
    titles = new Map((projects ?? []).map((p) => [(p as { id: string }).id, (p as { title: string }).title]));
  }

  return {
    ok: true,
    tasks: taskRows.map((t) => ({
      ...t,
      project_title: titles.get(t.project_id) ?? "Project",
    })),
  };
}

export async function listAllWorkbenchAnnotations(limit = 60): Promise<{
  ok: boolean;
  error?: string;
  annotations: Array<
    WorkbenchAnnotationRow & { project_title: string; record_title: string }
  >;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_annotations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message, annotations: [] };

  const records = (await readRecords()).filter((r) => r.published);
  const recordsById = new Map(records.map((r) => [r.id, r]));

  const annRows = (data ?? []) as WorkbenchAnnotationRow[];
  const projectIds = Array.from(new Set(annRows.map((a) => a.project_id)));
  let titles = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await supabase
      .from("workbench_projects")
      .select("id, title")
      .in("id", projectIds);
    titles = new Map((projects ?? []).map((p) => [(p as { id: string }).id, (p as { title: string }).title]));
  }

  const annotations = annRows.map((r) => {
    const rec = recordsById.get(r.record_id);
    return {
      ...r,
      project_title: titles.get(r.project_id) ?? "Project",
      record_title: rec?.title ?? r.record_id,
    };
  });

  return { ok: true, annotations };
}

export async function listAllWorkbenchProjectRecords(limit = 200): Promise<{
  ok: boolean;
  error?: string;
  records: WorkbenchProjectRecordRow[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_project_records")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message, records: [] };
  return { ok: true, records: (data ?? []) as WorkbenchProjectRecordRow[] };
}

export async function listAllWorkbenchCollaborators(limit = 200): Promise<{
  ok: boolean;
  error?: string;
  collaborators: WorkbenchCollaboratorRow[];
}> {
  return listWorkbenchCollaborators({ limit });
}

export async function listWorkbenchCollaborators(options?: {
  projectId?: string;
  limit?: number;
}): Promise<{
  ok: boolean;
  error?: string;
  collaborators: WorkbenchCollaboratorRow[];
}> {
  const supabase = await createClient();
  let query = supabase
    .from("workbench_collaborators")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200);

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;

  if (error) return { ok: false, error: error.message, collaborators: [] };
  return { ok: true, collaborators: (data ?? []) as WorkbenchCollaboratorRow[] };
}

export async function listWorkbenchNotes(options?: {
  projectId?: string;
  limit?: number;
}): Promise<{
  ok: boolean;
  error?: string;
  notes: WorkbenchNoteWithProject[];
}> {
  const supabase = await createClient();
  let query = supabase
    .from("workbench_notes")
    .select("*")
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 200);

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, notes: [] };

  const rows = (data ?? []) as WorkbenchNoteRow[];
  if (!rows.length) return { ok: true, notes: [] };

  const projectIds = Array.from(
    new Set(rows.map((n) => n.project_id).filter((id): id is string => Boolean(id))),
  );
  const titles = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await supabase
      .from("workbench_projects")
      .select("id, title")
      .in("id", projectIds);

    for (const p of projects ?? []) {
      titles.set((p as { id: string }).id, (p as { title: string }).title);
    }
  }

  return {
    ok: true,
    notes: rows.map((n) => ({
      ...n,
      project_title: n.project_id ? (titles.get(n.project_id) ?? "Project") : "Personal",
    })),
  };
}

export async function getWorkbenchNote(noteId: string): Promise<{
  ok: boolean;
  error?: string;
  note: WorkbenchNoteWithProject | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_notes")
    .select("*")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, note: null };
  if (!data) return { ok: true, note: null };

  const row = data as WorkbenchNoteRow;
  let projectTitle = "Personal";
  if (row.project_id) {
    const { data: project } = await supabase
      .from("workbench_projects")
      .select("title")
      .eq("id", row.project_id)
      .maybeSingle();
    projectTitle = (project as { title: string } | null)?.title ?? "Project";
  }

  return {
    ok: true,
    note: {
      ...row,
      project_title: projectTitle,
    },
  };
}

export async function listWorkbenchNoteRecordsForNotes(noteIds: string[]): Promise<{
  ok: boolean;
  error?: string;
  links: WorkbenchNoteRecordLinkRow[];
}> {
  if (!noteIds.length) return { ok: true, links: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_note_records")
    .select("*")
    .in("note_id", noteIds);

  if (error) return { ok: false, error: error.message, links: [] };
  return { ok: true, links: (data ?? []) as WorkbenchNoteRecordLinkRow[] };
}

export async function listWorkbenchLinkableRecords(): Promise<{
  ok: boolean;
  error?: string;
  records: WorkbenchLinkableRecord[];
}> {
  const [projectRecordsRes, archiveRecords] = await Promise.all([
    listAllWorkbenchProjectRecords(400),
    readRecords(),
  ]);

  if (!projectRecordsRes.ok) {
    return { ok: false, error: projectRecordsRes.error, records: [] };
  }

  const published = archiveRecords.filter((r) => r.published);
  const byId = new Map(published.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const records: WorkbenchLinkableRecord[] = [];

  for (const row of projectRecordsRes.records) {
    if (seen.has(row.record_id)) continue;
    seen.add(row.record_id);
    const archive = byId.get(row.record_id);
    records.push({
      record_id: row.record_id,
      title: archive?.title ?? row.record_id,
      source_type: archive?.sourceType ?? null,
      project_id: row.project_id,
    });
  }

  records.sort((a, b) => a.title.localeCompare(b.title, "en"));
  return { ok: true, records };
}

export async function listWorkbenchCitationSources(): Promise<{
  ok: boolean;
  error?: string;
  sources: WorkbenchCitationSource[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return { ok: false, error: userError.message, sources: [] };
  if (!user) return { ok: true, sources: [] };

  const [bookmarksRes, listsRes, archiveRecords] = await Promise.all([
    supabase
      .from("bookmarks")
      .select(
        "id, record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reading_lists")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    readRecords(),
  ]);

  if (bookmarksRes.error) return { ok: false, error: bookmarksRes.error.message, sources: [] };
  if (listsRes.error) return { ok: false, error: listsRes.error.message, sources: [] };

  const published = archiveRecords.filter((record) => record.published);
  const archiveById = new Map(published.map((record) => [record.id, record]));
  const readingLists = (listsRes.data ?? []) as Array<{ id: string; title: string }>;
  const listTitleById = new Map(readingLists.map((list) => [list.id, list.title]));
  const listIds = readingLists.map((list) => list.id);

  const listItemsRes = listIds.length
    ? await supabase
        .from("reading_list_items")
        .select(
          "id, reading_list_id, record_id, record_title, record_author, record_source, record_source_url, record_type, record_year, record_metadata, added_at",
        )
        .in("reading_list_id", listIds)
        .order("added_at", { ascending: false })
    : { data: [], error: null };

  if (listItemsRes.error) return { ok: false, error: listItemsRes.error.message, sources: [] };

  const bookmarkSources = ((bookmarksRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const recordId = firstText(row.record_id);
    const archive = archiveById.get(recordId);
    const meta = sourceFromArchive(recordId, archive, {
      title: firstText(row.record_title),
      date: firstText(row.record_year),
      institution: firstText(row.record_source),
      sourceUrl: firstText(row.record_source_url),
      recordType: firstText(row.record_type),
      metadata: asRecord(row.record_metadata),
    });
    return {
      id: `bookmark-${firstText(row.id)}`,
      recordId,
      sourceType: "bookmark" as const,
      sourceLabel: "Saved bookmark",
      bookmarkId: firstText(row.id) || null,
      ...meta,
    };
  });

  const readingListSources = ((listItemsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const recordId = firstText(row.record_id);
    const readingListId = firstText(row.reading_list_id);
    const readingListTitle = listTitleById.get(readingListId) ?? "Reading list";
    const archive = archiveById.get(recordId);
    const meta = sourceFromArchive(recordId, archive, {
      title: firstText(row.record_title),
      creator: firstText(row.record_author),
      date: firstText(row.record_year),
      institution: firstText(row.record_source),
      sourceUrl: firstText(row.record_source_url),
      recordType: firstText(row.record_type),
      metadata: asRecord(row.record_metadata),
    });
    return {
      id: `reading-list-${firstText(row.id)}`,
      recordId,
      sourceType: "reading_list" as const,
      sourceLabel: `Reading list: ${readingListTitle}`,
      readingListId,
      readingListTitle,
      ...meta,
    };
  });

  return {
    ok: true,
    sources: [...bookmarkSources, ...readingListSources]
      .filter((source) => Boolean(source.recordId))
      .sort((a, b) => a.title.localeCompare(b.title, "en")),
  };
}

export async function getWorkbenchOverviewContext(): Promise<{
  ok: boolean;
  error?: string;
  projects: WorkbenchProjectRow[];
  tasksDueSoon: Array<WorkbenchTaskRow & { project_title: string }>;
  recordsNeedingReview: WorkbenchProjectRecordRow[];
  recentAnnotations: Array<
    WorkbenchAnnotationRow & { project_title: string; record_title: string }
  >;
  upcomingDeadlines: Array<{ id: string; title: string; deadline: string }>;
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, 21);

  const { data: projects, error: pErr } = await supabase
    .from("workbench_projects")
    .select("*")
    .eq("status", "active")
    .order("deadline", { ascending: true });

  if (pErr) {
    return {
      ok: false,
      error: pErr.message,
      projects: [],
      tasksDueSoon: [],
      recordsNeedingReview: [],
      recentAnnotations: [],
      upcomingDeadlines: [],
    };
  }

  const projectRows = (projects ?? []) as WorkbenchProjectRow[];
  const ids = projectRows.map((p) => p.id);

  const upcomingDeadlines = projectRows
    .filter((p) => p.deadline && p.deadline >= today && p.deadline <= horizon)
    .map((p) => ({ id: p.id, title: p.title, deadline: p.deadline! }));

  const { data: tasksRaw, error: tErr } = ids.length
    ? await supabase
        .from("workbench_tasks")
        .select("*")
        .in("project_id", ids)
        .neq("status", "done")
        .not("due_date", "is", null)
        .lte("due_date", horizon)
        .order("due_date", { ascending: true })
        .limit(40)
    : { data: [], error: null };

  if (tErr) {
    return {
      ok: false,
      error: tErr.message,
      projects: projectRows,
      tasksDueSoon: [],
      recordsNeedingReview: [],
      recentAnnotations: [],
      upcomingDeadlines,
    };
  }

  const taskList = (tasksRaw ?? []) as WorkbenchTaskRow[];
  const taskProjectIds = Array.from(new Set(taskList.map((t) => t.project_id)));
  let taskTitles = new Map<string, string>();
  if (taskProjectIds.length) {
    const { data: tp } = await supabase
      .from("workbench_projects")
      .select("id, title")
      .in("id", taskProjectIds);
    taskTitles = new Map((tp ?? []).map((p) => [(p as { id: string }).id, (p as { title: string }).title]));
  }

  const tasksDueSoon = taskList.map((t) => ({
    ...t,
    project_title: taskTitles.get(t.project_id) ?? "Project",
  }));

  const { data: reviewRecords, error: rErr } = ids.length
    ? await supabase
        .from("workbench_project_records")
        .select("*")
        .in("project_id", ids)
        .or(
          "metadata_review_needed.eq.true,cultural_review_needed.eq.true,rights_checked.eq.false,citation_checked.eq.false,source_checked.eq.false",
        )
        .limit(50)
    : { data: [], error: null };

  if (rErr) {
    return {
      ok: false,
      error: rErr.message,
      projects: projectRows,
      tasksDueSoon,
      recordsNeedingReview: [],
      recentAnnotations: [],
      upcomingDeadlines,
    };
  }

  const ann = await listAllWorkbenchAnnotations(12);

  return {
    ok: true,
    projects: projectRows,
    tasksDueSoon,
    recordsNeedingReview: (reviewRecords ?? []) as WorkbenchProjectRecordRow[],
    recentAnnotations: ann.ok ? ann.annotations : [],
    upcomingDeadlines,
  };
}

export function insertDefaultResearchMilestones(projectId: string) {
  return DEFAULT_RESEARCH_MILESTONES.map((title) => ({
    project_id: projectId,
    title,
    description: null as string | null,
    due_date: null as string | null,
    status: "pending" as const,
  }));
}

export type RecordRightsSnapshot = {
  rightsStatus: string;
  licence: string;
  accessType: string;
  verificationStatus: string;
  culturalSensitivity: string;
  communityReviewStatus: string;
  sourceUrl: string;
  dateAccessed: string;
  citation: string;
};

export function snapshotRecordRights(record: ArchiveRecord | undefined): RecordRightsSnapshot {
  if (!record) {
    return {
      rightsStatus: "",
      licence: "",
      accessType: "",
      verificationStatus: "",
      culturalSensitivity: "",
      communityReviewStatus: "",
      sourceUrl: "",
      dateAccessed: "",
      citation: "",
    };
  }
  return {
    rightsStatus: record.rightsStatus ?? "",
    licence: record.licence ?? "",
    accessType: record.accessType ?? "",
    verificationStatus: record.verificationStatus ?? "",
    culturalSensitivity: record.culturalSensitivity ?? "",
    communityReviewStatus: record.communityReviewStatus ?? "",
    sourceUrl: record.sourceUrl ?? "",
    dateAccessed: record.dateAccessed ?? "",
    citation: record.citation ?? "",
  };
}

export function recordNeedsMetadataReview(snapshot: RecordRightsSnapshot) {
  if (!snapshot.citation.trim()) return true;
  if (!snapshot.rightsStatus.trim() || snapshot.rightsStatus === "Rights Unknown") return true;
  if (!snapshot.sourceUrl.trim()) return true;
  if (!snapshot.dateAccessed.trim()) return true;
  if (!snapshot.accessType.trim()) return true;
  if (!snapshot.verificationStatus.trim()) return true;
  return false;
}

export function boardColumnForRecordStatus(
  status: string,
): ProjectRecordStatusId | null {
  const readingAligned: ProjectRecordStatusId[] = [
    "to_review",
    "reading",
    "metadata_check",
    "rights_check",
    "cultural_review",
    "writing_annotation",
    "ready_to_publish",
    "completed",
  ];
  if (status === "to_annotate") return "writing_annotation";
  if (status === "exclude") return null;
  if (readingAligned.includes(status as ProjectRecordStatusId)) {
    return status as ProjectRecordStatusId;
  }
  return "to_review";
}
