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
  created_at: string;
};

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_collaborators")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message, collaborators: [] };
  return { ok: true, collaborators: (data ?? []) as WorkbenchCollaboratorRow[] };
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
