"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/src/lib/auth";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import { createClient } from "@/src/lib/supabase/server";
import { insertDefaultResearchMilestones } from "@/lib/workbench-data";
import { createReviewProject } from "@/lib/workbench-review-actions";
import {
  isProjectRecordStatus,
  isWorkbenchReviewProjectType,
  type ProjectRecordStatusId,
} from "@/lib/workbench-types";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const v = text(formData, key);
  return v || null;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function redirectWorkbench(message: string, path = "/my/workbench") {
  redirect(`${path}?updated=${encodeURIComponent(message)}`);
}

function fail(message: string, path = "/my/workbench"): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const WB = "/my/workbench";

export async function createWorkbenchProject(formData: FormData) {
  const profile = await requireMember(WB);
  const title = text(formData, "title");
  if (!title) fail("Project title is required.");
  const projectType = text(formData, "project_type") || "custom_project";
  const description = optionalText(formData, "description");
  const researchQuestion = optionalText(formData, "research_question");
  const deadline = optionalText(formData, "deadline");
  const visibility = text(formData, "visibility") || "private";
  const withMilestones = bool(formData, "with_milestones");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail("Sign in required.");
  if (user.id !== profile.id) fail("Signed-in user mismatch. Please sign in again.");

  const { data: project, error } = await supabase
    .from("workbench_projects")
    .insert({
      owner_id: user.id,
      title,
      description,
      project_type: projectType,
      visibility: ["private", "shared", "public"].includes(visibility)
        ? visibility
        : "private",
      deadline: deadline || null,
    })
    .select("id")
    .single();

  if (error || !project) fail(error?.message ?? "Could not create project.");

  let reviewWarning: string | null = null;
  if (isWorkbenchReviewProjectType(projectType)) {
    const review = await createReviewProject({
      title,
      description,
      projectId: project.id,
      reviewType: projectType,
      researchQuestion: researchQuestion ?? undefined,
    });
    if (!review.ok) {
      reviewWarning = `Project created, but review setup failed: ${review.error ?? "Unknown review setup error."}`;
    } else if ("warning" in review && review.warning) {
      reviewWarning = `Review project created, but setup needs attention: ${review.warning}`;
    }
  }

  if (
    withMilestones &&
    (projectType === "phd_literature_review" ||
      projectType === "masters_research_archive")
  ) {
    const rows = insertDefaultResearchMilestones(project.id);
    await supabase.from("workbench_milestones").insert(rows);
  }

  revalidatePath(WB);
  revalidatePath(`${WB}/projects`);
  redirect(
    `/my/workbench/projects/${project.id}?${
      reviewWarning
        ? `error=${encodeURIComponent(reviewWarning)}`
        : `updated=${encodeURIComponent(
            isWorkbenchReviewProjectType(projectType)
              ? "Review project created."
              : "Project created.",
          )}`
    }`,
  );
}

export async function retryCreateLinkedReviewProject(formData: FormData) {
  const profile = await requireMember(WB);
  const projectId = text(formData, "project_id");
  if (!projectId) fail("Missing project.", `${WB}/projects`);

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("workbench_projects")
    .select("id, owner_id, title, description, project_type")
    .eq("id", projectId)
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  if (!project) fail("Project not found or you do not have access.", `${WB}/projects`);
  if (!isWorkbenchReviewProjectType(project.project_type)) {
    fail("This project type is not a review workflow.", `${WB}/projects/${projectId}`);
  }

  const existing = await supabase
    .from("workbench_review_projects")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing.error) fail(existing.error.message, `${WB}/projects/${projectId}`);
  if (existing.data?.id) {
    redirectWorkbench("Review setup already exists.", `${WB}/projects/${projectId}`);
  }

  const review = await createReviewProject({
    title: project.title,
    description: project.description,
    projectId,
    reviewType: project.project_type,
  });
  if (!review.ok) fail(review.error ?? "Review setup failed.", `${WB}/projects/${projectId}`);
  if ("warning" in review && review.warning) {
    redirect(`${WB}/projects/${projectId}?error=${encodeURIComponent(`Review setup created, but setup needs attention: ${review.warning}`)}`);
  }

  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`/my/workbench/reviews/${review.projectId}`);
  redirectWorkbench("Review setup created.", `${WB}/projects/${projectId}`);
}

export async function updateWorkbenchProject(formData: FormData) {
  await requireMember(WB);
  const id = text(formData, "project_id");
  if (!id) fail("Missing project.");
  const title = optionalText(formData, "title");
  const description = optionalText(formData, "description");
  const deadline = optionalText(formData, "deadline");
  const visibility = text(formData, "visibility");
  const status = text(formData, "status");
  const isCurated = bool(formData, "is_curated_public");
  const notes = optionalText(formData, "project_notes");

  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (title) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (deadline !== undefined) patch.deadline = deadline;
  if (visibility && ["private", "shared", "public"].includes(visibility)) {
    patch.visibility = visibility;
  }
  if (status && ["active", "paused", "completed", "archived"].includes(status)) {
    patch.status = status;
  }
  patch.is_curated_public = isCurated;
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabase
    .from("workbench_projects")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) fail(error.message, `${WB}/projects/${id}`);
  if (!data) fail("Project update was not permitted. Please check you are signed in as the project owner or editor.", `${WB}/projects/${id}`);
  revalidatePath(`${WB}/projects/${id}`);
  revalidatePath(`${WB}/projects`);
  redirectWorkbench("Project updated.", `${WB}/projects/${id}`);
}

export async function addRecordToWorkbenchProject(formData: FormData) {
  await requireMember(WB);
  const projectId = text(formData, "project_id");
  const recordId = text(formData, "record_id");
  if (!projectId || !recordId) fail("Project and record are required.");

  const supabase = await createClient();
  const { error } = await supabase.from("workbench_project_records").upsert(
    {
      project_id: projectId,
      record_id: recordId,
      status: "to_review",
    },
    { onConflict: "project_id,record_id" },
  );

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(WB);
  redirectWorkbench("Record added to project.", `${WB}/projects/${projectId}`);
}

export async function updateProjectRecord(formData: FormData) {
  await requireMember(WB);
  const id = text(formData, "id");
  const projectId = text(formData, "project_id");
  if (!id || !projectId) fail("Missing record.");

  const status = text(formData, "status");
  const notes = optionalText(formData, "notes");

  const supabase = await createClient();
  const patch: Record<string, unknown> = {};

  if (status && isProjectRecordStatus(status)) patch.status = status;
  if (notes !== undefined) patch.notes = notes;

  const applyChecks = text(formData, "apply_checks") === "1";
  if (applyChecks) {
    patch.citation_checked = bool(formData, "citation_checked");
    patch.source_checked = bool(formData, "source_checked");
    patch.rights_checked = bool(formData, "rights_checked");
    patch.cultural_review_needed = bool(formData, "cultural_review_needed");
    patch.metadata_review_needed = bool(formData, "metadata_review_needed");
  }

  const da = optionalText(formData, "date_accessed");
  if (da !== undefined) patch.date_accessed = da || null;

  const { error } = await supabase
    .from("workbench_project_records")
    .update(patch)
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/projects/${projectId}`);
  redirectWorkbench("Record updated.", `${WB}/projects/${projectId}`);
}

export async function removeProjectRecord(formData: FormData) {
  await requireMember(WB);
  const id = text(formData, "id");
  const projectId = text(formData, "project_id");
  const confirm = text(formData, "confirm");
  if (!id || !projectId) fail("Missing record.");
  if (confirm !== "yes") fail("Confirmation required.", `${WB}/projects/${projectId}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbench_project_records")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/projects/${projectId}`);
  redirectWorkbench("Record removed from project.", `${WB}/projects/${projectId}`);
}

export async function createWorkbenchTask(formData: FormData) {
  await requireMember(WB);
  const projectId = text(formData, "project_id");
  const title = text(formData, "title");
  if (!projectId || !title) fail("Task title and project are required.");

  const supabase = await createClient();
  const linked = text(formData, "linked_record_ids");
  const linkedIds = linked
    ? linked.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const { error } = await supabase.from("workbench_tasks").insert({
    project_id: projectId,
    title,
    description: optionalText(formData, "description"),
    due_date: optionalText(formData, "due_date"),
    status: text(formData, "status") || "todo",
    priority: text(formData, "priority") || "medium",
    review_type: text(formData, "review_type") || "general",
    linked_record_ids: linkedIds,
    notes: optionalText(formData, "notes"),
    owner_name: optionalText(formData, "owner_name"),
    workflow_stage: optionalText(formData, "workflow_stage"),
  });

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  void trackWorkbenchActivity({
    eventType: "task_created",
    entityType: "task",
    entityId: title,
    projectId,
  });
  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/tasks`);
  redirectWorkbench("Task created.", `${WB}/projects/${projectId}`);
}

export async function updateWorkbenchTask(formData: FormData) {
  await requireMember(WB);
  const id = text(formData, "id");
  const projectId = text(formData, "project_id");
  if (!id || !projectId) fail("Missing task.");

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    title: optionalText(formData, "title") ?? undefined,
    description: optionalText(formData, "description"),
    due_date: optionalText(formData, "due_date"),
    status: text(formData, "status") || undefined,
    priority: text(formData, "priority") || undefined,
    review_type: text(formData, "review_type") || undefined,
    notes: optionalText(formData, "notes"),
    owner_name: optionalText(formData, "owner_name"),
    workflow_stage: optionalText(formData, "workflow_stage"),
  };
  const linked = text(formData, "linked_record_ids");
  if (linked !== undefined) {
    patch.linked_record_ids = linked
      ? linked.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  }

  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) delete patch[key];
  }

  const { error } = await supabase
    .from("workbench_tasks")
    .update(patch)
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/tasks`);
  redirectWorkbench("Task updated.", `${WB}/projects/${projectId}`);
}

export async function deleteWorkbenchTask(formData: FormData) {
  await requireMember(WB);
  const id = text(formData, "id");
  const projectId = text(formData, "project_id");
  if (!id || !projectId) fail("Missing task.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbench_tasks")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/tasks`);
  redirectWorkbench("Task deleted.", `${WB}/projects/${projectId}`);
}

export async function createWorkbenchAnnotation(formData: FormData) {
  await requireMember(WB);
  const projectId = text(formData, "project_id");
  const recordId = text(formData, "record_id");
  const note = text(formData, "note");
  if (!projectId || !recordId || !note) fail("Note, project, and record are required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail("Sign in required.");

  const tagsRaw = text(formData, "tags");
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const { error } = await supabase.from("workbench_annotations").insert({
    project_id: projectId,
    record_id: recordId,
    user_id: user.id,
    note,
    tags,
  });

  if (error) fail(error.message, `${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/projects/${projectId}`);
  revalidatePath(`${WB}/notes`);
  redirectWorkbench("Note saved.", `${WB}/projects/${projectId}`);
}

export async function inviteWorkbenchCollaborator(formData: FormData) {
  const { inviteWorkbenchCollaborator: inviteCollaborator } = await import(
    "@/lib/workbench-collaborator-actions"
  );
  await requireMember(WB);
  const projectId = text(formData, "project_id");
  const invitedEmail = text(formData, "invited_email");
  const role = text(formData, "role") || "viewer";
  const result = await inviteCollaborator({
    projectId,
    email: invitedEmail,
    role,
  });
  if (!result.ok) fail(result.error || "Could not invite collaborator.", `${WB}/projects/${projectId}`);
  redirectWorkbench("Collaborator invited.", `${WB}/projects/${projectId}`);
}

export async function importReadingListToProject(formData: FormData) {
  await requireMember(WB);
  const projectId = text(formData, "project_id");
  const readingListId = text(formData, "reading_list_id");
  if (!projectId || !readingListId) fail("Project and reading list are required.");

  const supabase = await createClient();
  const { data: items, error: iErr } = await supabase
    .from("reading_list_items")
    .select("record_id")
    .eq("reading_list_id", readingListId);

  if (iErr) fail(iErr.message, `${WB}/projects/${projectId}`);

  const rows = (items ?? []).map((row: { record_id: string }) => ({
    project_id: projectId,
    record_id: row.record_id,
    status: "to_review" as ProjectRecordStatusId,
  }));

  if (rows.length) {
    const { error } = await supabase.from("workbench_project_records").upsert(rows, {
      onConflict: "project_id,record_id",
    });
    if (error) fail(error.message, `${WB}/projects/${projectId}`);
  }

  void trackWorkbenchActivity({
    eventType: "record_added_to_project",
    entityType: "project",
    entityId: projectId,
    projectId,
    metadata: { reading_list_id: readingListId, record_count: rows.length },
  });

  revalidatePath(`${WB}/projects/${projectId}`);
  redirectWorkbench(
    `Imported ${rows.length} records from reading list.`,
    `${WB}/projects/${projectId}`,
  );
}

export async function createProjectAndAddRecord(formData: FormData) {
  await requireMember(WB);
  const title = text(formData, "title");
  const recordId = text(formData, "record_id");
  const projectType = text(formData, "project_type") || "custom_project";
  if (!title || !recordId) fail("Title and record are required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail("Sign in required.");

  const { data: project, error } = await supabase
    .from("workbench_projects")
    .insert({
      owner_id: user.id,
      title,
      project_type: projectType,
      description: optionalText(formData, "description"),
    })
    .select("id")
    .single();

  if (error || !project) fail(error?.message ?? "Could not create project.");

  await supabase.from("workbench_project_records").upsert(
    {
      project_id: project.id,
      record_id: recordId,
      status: "to_review",
    },
    { onConflict: "project_id,record_id" },
  );

  void trackWorkbenchActivity({
    eventType: "record_added_to_project",
    entityType: "record",
    entityId: recordId,
    projectId: project.id,
  });

  revalidatePath(WB);
  revalidatePath(`${WB}/projects`);
  redirect(
    `/my/workbench/projects/${project.id}?updated=${encodeURIComponent("Project created with record.")}`,
  );
}
