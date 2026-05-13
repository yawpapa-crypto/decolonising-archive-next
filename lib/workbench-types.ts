export const WORKBENCH_PROJECT_TYPES = [
  { id: "phd_literature_review", label: "PhD Literature Review" },
  { id: "masters_research_archive", label: "Master’s Research Archive" },
  { id: "decolonial_design_reading_list", label: "Decolonial Design Reading List" },
  { id: "community_memory_project", label: "Community Memory Project" },
  { id: "exhibition_research_folder", label: "Exhibition Research Folder" },
  { id: "african_philosophy_bibliography", label: "African Philosophy Bibliography" },
  { id: "visual_culture_case_study", label: "Visual Culture Case Study" },
  { id: "indigenous_knowledge_mapping", label: "Indigenous Knowledge Mapping Project" },
  { id: "teaching_resource", label: "Teaching Resource" },
  { id: "custom_project", label: "Custom Project" },
] as const;

export type WorkbenchProjectTypeId = (typeof WORKBENCH_PROJECT_TYPES)[number]["id"];

export const PROJECT_RECORD_STATUSES = [
  "to_review",
  "reading",
  "to_annotate",
  "metadata_check",
  "rights_check",
  "cultural_review",
  "writing_annotation",
  "ready_to_publish",
  "completed",
  "exclude",
] as const;

export type ProjectRecordStatusId = (typeof PROJECT_RECORD_STATUSES)[number];

export const PROJECT_RECORD_STATUS_LABEL: Record<ProjectRecordStatusId, string> = {
  to_review: "To Review",
  reading: "Reading",
  to_annotate: "To Annotate",
  metadata_check: "Metadata Check",
  rights_check: "Rights Check",
  cultural_review: "Cultural Review",
  writing_annotation: "Writing / Annotation",
  ready_to_publish: "Ready to Publish",
  completed: "Completed",
  exclude: "Exclude",
};

/** Board columns (records + tasks mapped into these columns). */
export const WORKBENCH_BOARD_COLUMNS: ProjectRecordStatusId[] = [
  "to_review",
  "reading",
  "metadata_check",
  "rights_check",
  "cultural_review",
  "writing_annotation",
  "ready_to_publish",
  "completed",
];

export const TASK_STATUSES = ["todo", "in_progress", "waiting", "done", "stuck", "needs_review"] as const;
export type TaskStatusId = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatusId, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  done: "Done",
  stuck: "Stuck",
  needs_review: "Needs Review",
};

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriorityId = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABEL: Record<TaskPriorityId, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TASK_REVIEW_TYPES = [
  "general",
  "source_check",
  "citation_check",
  "metadata_check",
  "rights_check",
  "cultural_review",
  "writing",
  "supervisor_feedback",
  "publication_prep",
] as const;

export type TaskReviewTypeId = (typeof TASK_REVIEW_TYPES)[number];

export const TASK_REVIEW_TYPE_LABEL: Record<TaskReviewTypeId, string> = {
  general: "General",
  source_check: "Source Check",
  citation_check: "Citation Check",
  metadata_check: "Metadata Check",
  rights_check: "Rights Check",
  cultural_review: "Cultural Review",
  writing: "Writing",
  supervisor_feedback: "Supervisor Feedback",
  publication_prep: "Publication Prep",
};

export const ANNOTATION_TAGS = [
  "Theory",
  "Method",
  "Case Study",
  "Citation",
  "Useful Quote",
  "Needs Verification",
  "Rights Concern",
  "Cultural Note",
  "Teaching Use",
  "Exclude",
] as const;

export type AnnotationTagId = (typeof ANNOTATION_TAGS)[number];

export const COLLABORATOR_ROLES = ["owner", "editor", "reviewer", "viewer"] as const;
export type CollaboratorRoleId = (typeof COLLABORATOR_ROLES)[number];

export const PROJECT_VISIBILITY = ["private", "shared", "public"] as const;
export type ProjectVisibilityId = (typeof PROJECT_VISIBILITY)[number];

export const PROJECT_STATUS = ["active", "paused", "completed", "archived"] as const;
export type ProjectStatusId = (typeof PROJECT_STATUS)[number];

export const DEFAULT_RESEARCH_MILESTONES = [
  "Literature Review",
  "Annotated Bibliography",
  "Ethics Notes",
  "Case Study Selection",
  "Data / Source Verification",
  "Writing Draft",
  "Supervisor Feedback",
  "Submission Deadline",
] as const;

export function projectTypeLabel(id: string) {
  return WORKBENCH_PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;
}

/** Map task review type (+ done status) to a board column. */
export function taskBoardColumn(
  reviewType: string,
  taskStatus: string,
): ProjectRecordStatusId {
  if (taskStatus === "done") return "completed";
  switch (reviewType) {
    case "metadata_check":
    case "citation_check":
    case "source_check":
      return "metadata_check";
    case "rights_check":
      return "rights_check";
    case "cultural_review":
      return "cultural_review";
    case "writing":
    case "supervisor_feedback":
      return "writing_annotation";
    case "publication_prep":
      return "ready_to_publish";
    default:
      return "to_review";
  }
}

/** Kanban / table group for a task (explicit workflow_stage wins). */
export function taskWorkflowGroup(task: {
  workflow_stage?: string | null;
  review_type: string;
  status: string;
}): ProjectRecordStatusId {
  const s = task.workflow_stage;
  if (s && (WORKBENCH_BOARD_COLUMNS as readonly string[]).includes(s)) {
    return s as ProjectRecordStatusId;
  }
  return taskBoardColumn(task.review_type, task.status);
}

export function isProjectRecordStatus(value: string): value is ProjectRecordStatusId {
  return (PROJECT_RECORD_STATUSES as readonly string[]).includes(value);
}
