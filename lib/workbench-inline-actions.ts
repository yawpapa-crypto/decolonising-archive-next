"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import {
  TASK_PRIORITIES,
  TASK_REVIEW_TYPES,
  TASK_STATUSES,
  WORKBENCH_BOARD_COLUMNS,
  PROJECT_STATUS,
  PROJECT_VISIBILITY,
  WORKBENCH_PROJECT_TYPES,
  taskBoardColumn,
  type ProjectRecordStatusId,
} from "@/lib/workbench-types";
import type { WorkbenchProjectRow, WorkbenchTaskRow } from "@/lib/workbench-data";

const WB = "/my/workbench";

function isBoardStage(v: string | null | undefined): v is ProjectRecordStatusId {
  return Boolean(v && (WORKBENCH_BOARD_COLUMNS as readonly string[]).includes(v));
}

function isTaskStatus(v: string) {
  return (TASK_STATUSES as readonly string[]).includes(v);
}

function isTaskPriority(v: string) {
  return (TASK_PRIORITIES as readonly string[]).includes(v);
}

function isReviewType(v: string) {
  return (TASK_REVIEW_TYPES as readonly string[]).includes(v);
}

function isProjectType(v: string) {
  return WORKBENCH_PROJECT_TYPES.some((type) => type.id === v);
}

function isProjectVisibility(v: string) {
  return (PROJECT_VISIBILITY as readonly string[]).includes(v);
}

function isProjectStatus(v: string) {
  return (PROJECT_STATUS as readonly string[]).includes(v);
}

function projectPermissionMessage(error?: string | null) {
  const message = String(error || "");
  if (/row-level security|permission denied|not permitted|not found/i.test(message)) {
    return "You do not have permission to change this project. Check that you are signed in with the project owner account.";
  }
  return message || "Project action failed.";
}

export async function patchWorkbenchTask(input: {
  projectId: string;
  taskId: string;
  patch: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    review_type: string;
    due_date: string | null;
    owner_name: string | null;
    notes: string | null;
    linked_record_ids: string[];
    workflow_stage: string | null;
  }>;
}): Promise<{ ok: boolean; error?: string; task?: WorkbenchTaskRow }> {
  await requireMember(WB);
  const { projectId, taskId, patch } = input;
  if (!projectId || !taskId) return { ok: false, error: "Missing project or task." };

  const supabase = await createClient();
  const row: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const t = String(patch.title ?? "").trim();
    if (!t) return { ok: false, error: "Title cannot be empty." };
    row.title = t;
  }
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.owner_name !== undefined) row.owner_name = patch.owner_name;
  if (patch.due_date !== undefined) row.due_date = patch.due_date;

  if (patch.status !== undefined) {
    if (!isTaskStatus(patch.status)) return { ok: false, error: "Invalid status." };
    row.status = patch.status;
    if (patch.status === "done") {
      row.completed_at = new Date().toISOString();
      if (patch.workflow_stage === undefined) {
        row.workflow_stage = "completed";
      }
    } else {
      row.completed_at = null;
    }
  }

  if (patch.priority !== undefined) {
    if (!isTaskPriority(patch.priority)) return { ok: false, error: "Invalid priority." };
    row.priority = patch.priority;
  }
  if (patch.review_type !== undefined) {
    if (!isReviewType(patch.review_type)) return { ok: false, error: "Invalid review type." };
    row.review_type = patch.review_type;
  }
  if (patch.linked_record_ids !== undefined) {
    row.linked_record_ids = patch.linked_record_ids;
  }
  if (patch.workflow_stage !== undefined) {
    const ws = patch.workflow_stage;
    if (ws !== null && !isBoardStage(ws)) {
      return { ok: false, error: "Invalid workflow stage." };
    }
    row.workflow_stage = ws;
  }

  if (row.workflow_stage === "completed") {
    row.status = "done";
    row.completed_at = new Date().toISOString();
  } else if (row.status === "done" && row.workflow_stage !== undefined && row.workflow_stage !== "completed") {
    row.status = "in_progress";
    row.completed_at = null;
  } else if (
    row.workflow_stage !== undefined &&
    row.workflow_stage !== null &&
    row.workflow_stage !== "completed" &&
    patch.status === undefined
  ) {
    row.completed_at = null;
    if (row.status === undefined || row.status === "done") {
      row.status = "in_progress";
    }
  }

  const { data, error } = await supabase
    .from("workbench_tasks")
    .update(row)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Task not found or not permitted." };

  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/tasks`);
  revalidatePath(WB);
  return { ok: true, task: data as WorkbenchTaskRow };
}

export async function moveWorkbenchTaskStage(input: {
  projectId: string;
  taskId: string;
  workflow_stage: ProjectRecordStatusId;
}): Promise<{ ok: boolean; error?: string; task?: WorkbenchTaskRow }> {
  const { projectId, taskId, workflow_stage } = input;
  if (!isBoardStage(workflow_stage)) return { ok: false, error: "Invalid column." };

  const patch: Parameters<typeof patchWorkbenchTask>[0]["patch"] = { workflow_stage };
  if (workflow_stage === "completed") {
    patch.status = "done";
  } else {
    patch.status = "in_progress";
  }

  return patchWorkbenchTask({ projectId, taskId, patch });
}

export async function createWorkbenchTaskInline(input: {
  projectId: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status?: string;
  priority?: string;
  review_type?: string;
  owner_name?: string | null;
  notes?: string | null;
  linked_record_ids?: string[];
  workflow_stage?: string | null;
}): Promise<{ ok: boolean; error?: string; task?: WorkbenchTaskRow }> {
  await requireMember(WB);
  const title = String(input.title ?? "").trim();
  if (!input.projectId || !title) return { ok: false, error: "Title and project are required." };

  const status = input.status && isTaskStatus(input.status) ? input.status : "todo";
  const priority =
    input.priority && isTaskPriority(input.priority) ? input.priority : "medium";
  const review_type =
    input.review_type && isReviewType(input.review_type) ? input.review_type : "general";

  let workflow_stage: string | null = null;
  if (input.workflow_stage !== undefined && input.workflow_stage !== null) {
    if (!isBoardStage(input.workflow_stage)) return { ok: false, error: "Invalid workflow stage." };
    workflow_stage = input.workflow_stage;
  } else {
    workflow_stage = taskBoardColumn(review_type, status);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_tasks")
    .insert({
      project_id: input.projectId,
      title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      status,
      priority,
      review_type,
      linked_record_ids: input.linked_record_ids ?? [],
      notes: input.notes ?? null,
      owner_name: input.owner_name ?? null,
      workflow_stage,
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`${WB}/projects/${input.projectId}`);
  revalidatePath(`${WB}/tasks`);
  revalidatePath(WB);
  return { ok: true, task: data as WorkbenchTaskRow };
}

export async function createWorkbenchProjectInline(input: {
  title: string;
  description?: string | null;
  project_type?: string;
  visibility?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  project?: {
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
}> {
  const profile = await requireMember(WB);
  const title = String(input.title ?? "").trim();
  if (!title) return { ok: false, error: "Project title is required." };

  const visibility = input.visibility && ["private", "shared", "public"].includes(input.visibility)
    ? input.visibility
    : "private";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_projects")
    .insert({
      owner_id: profile.id,
      title,
      description: input.description?.trim() || null,
      project_type: input.project_type || "custom_project",
      visibility,
      status: "active",
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(WB);
  revalidatePath(`${WB}/projects`);
  return { ok: true, project: data };
}

export async function renameWorkbenchProjectInline(input: {
  projectId: string;
  title: string;
}): Promise<{ ok: boolean; error?: string; project?: WorkbenchProjectRow }> {
  await requireMember(WB);
  const title = String(input.title ?? "").trim();
  if (!input.projectId || !title) return { ok: false, error: "Project title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_projects")
    .update({ title })
    .eq("id", input.projectId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: projectPermissionMessage(error.message) };
  if (!data) return { ok: false, error: projectPermissionMessage("not permitted") };

  revalidatePath(WB);
  revalidatePath(`${WB}/projects`);
  revalidatePath(`${WB}/projects/${input.projectId}`);
  return { ok: true, project: data as WorkbenchProjectRow };
}

export async function updateWorkbenchProjectInline(input: {
  projectId: string;
  patch: {
    title: string;
    description?: string | null;
    project_type: string;
    visibility: string;
    status: string;
    deadline?: string | null;
  };
}): Promise<{ ok: boolean; error?: string; project?: WorkbenchProjectRow }> {
  await requireMember(WB);
  const title = String(input.patch.title ?? "").trim();
  if (!input.projectId || !title) return { ok: false, error: "Project title is required." };
  if (!isProjectType(input.patch.project_type)) return { ok: false, error: "Invalid project type." };
  if (!isProjectVisibility(input.patch.visibility)) return { ok: false, error: "Invalid visibility." };
  if (!isProjectStatus(input.patch.status)) return { ok: false, error: "Invalid project status." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workbench_projects")
    .update({
      title,
      description: input.patch.description?.trim() || null,
      project_type: input.patch.project_type,
      visibility: input.patch.visibility,
      status: input.patch.status,
      deadline: input.patch.deadline || null,
    })
    .eq("id", input.projectId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: projectPermissionMessage(error.message) };
  if (!data) return { ok: false, error: projectPermissionMessage("not permitted") };

  revalidatePath(WB);
  revalidatePath(`${WB}/projects`);
  revalidatePath(`${WB}/projects/${input.projectId}`);
  return { ok: true, project: data as WorkbenchProjectRow };
}

export async function deleteWorkbenchProjectInline(input: {
  projectId: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireMember(WB);
  if (!input.projectId) return { ok: false, error: "Missing project." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbench_projects")
    .delete()
    .eq("id", input.projectId);

  if (error) return { ok: false, error: projectPermissionMessage(error.message) };

  revalidatePath(WB);
  revalidatePath(`${WB}/projects`);
  revalidatePath(`${WB}/tasks`);
  return { ok: true };
}

export async function deleteWorkbenchTaskInline(input: {
  projectId: string;
  taskId: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireMember(WB);
  const { projectId, taskId } = input;
  if (!projectId || !taskId) return { ok: false, error: "Missing task." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbench_tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/tasks`);
  revalidatePath(WB);
  return { ok: true };
}

export async function saveWorkbenchProjectNotes(input: {
  projectId: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireMember(WB);
  const { projectId, notes } = input;
  if (!projectId) return { ok: false, error: "Missing project." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbench_projects")
    .update({ notes })
    .eq("id", projectId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`${WB}/projects/${projectId}`);
  return { ok: true };
}
