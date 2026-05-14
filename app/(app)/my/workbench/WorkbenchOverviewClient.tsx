"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkbenchProjectInline,
  createWorkbenchTaskInline,
  deleteWorkbenchProjectInline,
  deleteWorkbenchTaskInline,
  patchWorkbenchTask,
  renameWorkbenchProjectInline,
  updateWorkbenchProjectInline,
} from "@/lib/workbench-inline-actions";
import {
  PROJECT_STATUS,
  PROJECT_VISIBILITY,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_REVIEW_TYPES,
  TASK_REVIEW_TYPE_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  WORKBENCH_PROJECT_TYPES,
  type TaskPriorityId,
  type TaskReviewTypeId,
  type TaskStatusId,
} from "@/lib/workbench-types";
import type {
  WorkbenchAnnotationRow,
  WorkbenchCollaboratorRow,
  WorkbenchProjectRecordRow,
  WorkbenchProjectRow,
  WorkbenchTaskRow,
} from "@/lib/workbench-data";

export type WorkbenchRecordOption = {
  id: string;
  title: string;
};

type TaskWithProject = WorkbenchTaskRow & { project_title: string };

type ViewTab = "table" | "board" | "timeline" | "records" | "notes";
type GroupBy = "status" | "review_type" | "priority";
type SortMode = "due_asc" | "due_desc" | "priority" | "created_desc";
type TaskFormDraft = {
  title: string;
  description: string;
  linked_record_id: string;
  owner_name: string;
  status: string;
  due_date: string;
  review_type: string;
  priority: string;
  notes: string;
};
type ProjectFormDraft = {
  title: string;
  description: string;
  project_type: string;
  visibility: string;
  status: string;
  deadline: string;
};

const STATUS_ORDER = ["todo", "in_progress", "waiting", "needs_review", "stuck", "done"] as const;

const COLUMN_LABELS = {
  linkedRecord: "Linked record",
  owner: "Owner",
  status: "Status",
  dueDate: "Due date",
  reviewType: "Review type",
  priority: "Priority",
} as const;

type HideColumnKey = keyof typeof COLUMN_LABELS;

const STATUS_GROUP_LABEL: Record<string, string> = {
  todo: "To-Do",
  in_progress: "Working on it",
  waiting: "Waiting",
  needs_review: "Needs review",
  stuck: "Stuck",
  done: "Completed",
};

function statusLabel(value: string) {
  return TASK_STATUS_LABEL[value as TaskStatusId] || STATUS_GROUP_LABEL[value] || value;
}

function statusTone(value: string) {
  if (value === "done") return "done";
  if (value === "stuck") return "stuck";
  if (value === "waiting") return "waiting";
  if (value === "needs_review") return "needs-review";
  if (value === "todo") return "todo";
  return "working";
}

function reviewLabel(value: string) {
  const label = TASK_REVIEW_TYPE_LABEL[value as TaskReviewTypeId] || value;
  return label === "Writing" ? "Writing / annotation" : label;
}

function priorityLabel(value: string) {
  return TASK_PRIORITY_LABEL[value as TaskPriorityId] || value || "Medium";
}

function ownerInitials(name?: string | null) {
  const clean = (name || "Unassigned").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function taskOwner(task: TaskWithProject) {
  return task.owner_name || task.assigned_to || "Unassigned";
}

function linkedRecordId(task: TaskWithProject) {
  return task.linked_record_ids?.[0] || "";
}

function isDone(task: TaskWithProject) {
  return task.status === "done";
}

function priorityWeight(value: string) {
  return { urgent: 4, high: 3, medium: 2, low: 1 }[value as TaskPriorityId] || 0;
}

function textDate(value: string | null | undefined) {
  return value || "No date";
}

function defaultProjectTitle() {
  return `Archive research project ${new Date().toLocaleDateString("en-AU")}`;
}

function projectFormFromProject(project: WorkbenchProjectRow | null): ProjectFormDraft {
  return {
    title: project?.title || defaultProjectTitle(),
    description: project?.description || "",
    project_type: project?.project_type || "custom_project",
    visibility: project?.visibility || "private",
    status: project?.status || "active",
    deadline: project?.deadline || "",
  };
}

function taskGridTemplateColumns(hidden: Record<HideColumnKey, boolean>): string {
  const parts = ["44px", "minmax(220px, 1.4fr)"];
  if (!hidden.linkedRecord) parts.push("minmax(180px, 1fr)");
  if (!hidden.owner) parts.push("120px");
  if (!hidden.status) parts.push("150px");
  if (!hidden.dueDate) parts.push("140px");
  if (!hidden.reviewType) parts.push("180px");
  if (!hidden.priority) parts.push("130px");
  parts.push("150px");
  return parts.join(" ");
}

function WorkbenchModalFrame(props: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  errorSlot?: ReactNode | null;
}) {
  const { title, titleId, onClose, children, footer, errorSlot } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="workbench-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="workbench-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="workbench-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="workbench-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {errorSlot ? <div className="workbench-modal-alert">{errorSlot}</div> : null}
        <div className="workbench-modal-body">{children}</div>
        <footer className="workbench-modal-footer">{footer}</footer>
      </div>
    </div>
  );
}

function emptyTaskDraft(status = "todo"): TaskFormDraft {
  return {
    title: "",
    description: "",
    linked_record_id: "",
    owner_name: "",
    status,
    due_date: "",
    review_type: "metadata_check",
    priority: "medium",
    notes: "",
  };
}

function draftFromTask(task: TaskWithProject): TaskFormDraft {
  return {
    title: task.title || "",
    description: task.description || "",
    linked_record_id: linkedRecordId(task),
    owner_name: task.owner_name || "",
    status: task.status || "todo",
    due_date: task.due_date || "",
    review_type: task.review_type || "metadata_check",
    priority: task.priority || "medium",
    notes: task.notes || "",
  };
}

export default function WorkbenchOverviewClient(props: {
  projects: WorkbenchProjectRow[];
  tasks: TaskWithProject[];
  projectRecords: WorkbenchProjectRecordRow[];
  annotations: Array<WorkbenchAnnotationRow & { project_title?: string; record_title?: string }>;
  collaborators: WorkbenchCollaboratorRow[];
  recordOptions: WorkbenchRecordOption[];
  initialNotice?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(props.projects);
  const [tasks, setTasks] = useState(props.tasks);
  const [projectRecords, setProjectRecords] = useState(props.projectRecords);
  const [annotations, setAnnotations] = useState(props.annotations);
  const [selectedProjectId, setSelectedProjectId] = useState(props.projects[0]?.id || "");
  const [view, setView] = useState<ViewTab>("table");
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("due_asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [hidden, setHidden] = useState<Record<HideColumnKey, boolean>>({
    linkedRecord: false,
    owner: false,
    status: false,
    dueDate: false,
    reviewType: false,
    priority: false,
  });
  const [notice, setNotice] = useState(props.initialNotice || "");
  const [error, setError] = useState(props.initialError || "");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isRenameProjectOpen, setIsRenameProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [renameProjectTitle, setRenameProjectTitle] = useState("");
  const [editProjectForm, setEditProjectForm] = useState<ProjectFormDraft>(projectFormFromProject(props.projects[0] || null));
  const [projectActionError, setProjectActionError] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<TaskFormDraft>(emptyTaskDraft());
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [taskActionError, setTaskActionError] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskFormDraft>(emptyTaskDraft());
  const [projectDraft, setProjectDraft] = useState({
    title: defaultProjectTitle(),
    description: "",
  });

  const closeRenameProjectModal = useCallback(() => {
    setIsRenameProjectOpen(false);
    setProjectActionError("");
  }, []);

  const closeEditProjectModal = useCallback(() => {
    setIsEditProjectOpen(false);
    setProjectActionError("");
  }, []);

  const closeDeleteProjectModal = useCallback(() => {
    setIsDeleteProjectOpen(false);
    setProjectActionError("");
  }, []);

  const closeNewTaskModal = useCallback(() => {
    setNewTaskOpen(false);
    setTaskActionError("");
  }, []);

  const closeEditTaskModal = useCallback(() => {
    setEditingTaskId(null);
    setTaskActionError("");
  }, []);

  const closeDeleteTaskModal = useCallback(() => {
    setDeletingTaskId(null);
    setTaskActionError("");
  }, []);

  const closeCreateProjectModal = useCallback(() => {
    setProjectOpen(false);
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  const activeProjectId = selectedProject?.id || "";
  const recordMap = useMemo(() => new Map(props.recordOptions.map((r) => [r.id, r.title])), [props.recordOptions]);
  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    tasks.forEach((task) => owners.add(taskOwner(task)));
    props.collaborators.forEach((c) => {
      if (c.invited_email) owners.add(c.invited_email);
      if (c.user_id) owners.add(c.user_id);
    });
    owners.add("Unassigned");
    return Array.from(owners).sort();
  }, [tasks, props.collaborators]);

  const visibleTasks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tasks
      .filter((task) => !activeProjectId || task.project_id === activeProjectId)
      .filter((task) => {
        const rid = linkedRecordId(task);
        const recordTitle = rid ? recordMap.get(rid) || rid : "";
        const haystack = [
          task.title,
          task.notes,
          task.review_type,
          reviewLabel(task.review_type),
          rid,
          recordTitle,
        ].join(" ").toLowerCase();
        if (term && !haystack.includes(term)) return false;
        if (ownerFilter && taskOwner(task) !== ownerFilter) return false;
        if (statusFilter && task.status !== statusFilter) return false;
        if (priorityFilter && task.priority !== priorityFilter) return false;
        if (reviewFilter && task.review_type !== reviewFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "due_desc") return String(b.due_date || "9999").localeCompare(String(a.due_date || "9999"));
        if (sortMode === "priority") return priorityWeight(b.priority) - priorityWeight(a.priority);
        if (sortMode === "created_desc") return String(b.created_at).localeCompare(String(a.created_at));
        return String(a.due_date || "9999").localeCompare(String(b.due_date || "9999"));
      });
  }, [activeProjectId, ownerFilter, priorityFilter, query, recordMap, reviewFilter, sortMode, statusFilter, tasks]);

  const selectedProjectRecords = projectRecords.filter((record) => record.project_id === activeProjectId);
  const selectedProjectAnnotations = annotations.filter((annotation) => annotation.project_id === activeProjectId);

  function mutateTask(taskId: string, patch: Partial<TaskWithProject>) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }

  function mutateProject(project: WorkbenchProjectRow) {
    setProjects((current) => current.map((p) => (p.id === project.id ? project : p)));
  }

  function runAction(action: () => Promise<void>) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function savePatch(task: TaskWithProject, patch: Parameters<typeof patchWorkbenchTask>[0]["patch"]) {
    mutateTask(task.id, patch as Partial<TaskWithProject>);
    runAction(async () => {
      const result = await patchWorkbenchTask({ projectId: task.project_id, taskId: task.id, patch });
      if (!result.ok || !result.task) throw new Error(result.error || "Could not update task.");
      mutateTask(task.id, { ...result.task, project_title: task.project_title });
      router.refresh();
    });
  }

  function openNewTask(status = "todo") {
    if (!activeProjectId) {
      setNotice("Create a research project before adding tasks.");
      setProjectOpen(true);
      return;
    }
    setTaskActionError("");
    setTaskDraft(emptyTaskDraft(status));
    setNewTaskOpen(true);
  }

  function submitTask() {
    if (!activeProjectId) return;
    if (!taskDraft.title.trim()) {
      setError("Task title is required.");
      return;
    }
    const projectTitle = selectedProject?.title || "Project";
    runAction(async () => {
      const result = await createWorkbenchTaskInline({
        projectId: activeProjectId,
        title: taskDraft.title,
        description: taskDraft.description || null,
        status: taskDraft.status,
        priority: taskDraft.priority,
        review_type: taskDraft.review_type,
        due_date: taskDraft.due_date || null,
        owner_name: taskDraft.owner_name || null,
        notes: taskDraft.notes || null,
        linked_record_ids: taskDraft.linked_record_id ? [taskDraft.linked_record_id] : [],
      });
      if (!result.ok || !result.task) throw new Error(result.error || "Could not create task.");
      const createdTask: TaskWithProject = { ...result.task, project_title: projectTitle };
      setTasks((current) => [createdTask, ...current]);
      setNewTaskOpen(false);
      setTaskDraft(emptyTaskDraft());
      router.refresh();
    });
  }

  function openEditTask(task: TaskWithProject) {
    setTaskActionError("");
    setEditingTaskId(task.id);
    setEditTaskForm(draftFromTask(task));
  }

  async function submitTaskEdit() {
    const task = tasks.find((t) => t.id === editingTaskId);
    if (!task) return;
    if (!editTaskForm.title.trim()) {
      setTaskActionError("Task title is required.");
      return;
    }

    setIsSavingTask(true);
    setTaskActionError("");
    const patch: Parameters<typeof patchWorkbenchTask>[0]["patch"] = {
      title: editTaskForm.title,
      description: editTaskForm.description || null,
      owner_name: editTaskForm.owner_name || null,
      due_date: editTaskForm.due_date || null,
      status: editTaskForm.status,
      priority: editTaskForm.priority,
      review_type: editTaskForm.review_type,
      notes: editTaskForm.notes || null,
      linked_record_ids: editTaskForm.linked_record_id ? [editTaskForm.linked_record_id] : [],
    };

    const result = await patchWorkbenchTask({ projectId: task.project_id, taskId: task.id, patch });
    setIsSavingTask(false);
    if (!result.ok || !result.task) {
      setTaskActionError(result.error || "Could not update task.");
      return;
    }
    mutateTask(task.id, { ...result.task, project_title: task.project_title });
    setEditingTaskId(null);
    setNotice("Task updated.");
    router.refresh();
  }

  function submitProject() {
    if (!projectDraft.title.trim()) {
      setError("Project title is required.");
      return;
    }
    runAction(async () => {
      const result = await createWorkbenchProjectInline({
        title: projectDraft.title,
        description: projectDraft.description,
        project_type: "custom_project",
        visibility: "private",
      });
      if (!result.ok || !result.project) throw new Error(result.error || "Could not create project.");
      setProjects((current) => [result.project!, ...current]);
      setSelectedProjectId(result.project.id);
      setProjectOpen(false);
      setNotice("Project created. You can add tasks now.");
      router.refresh();
    });
  }

  function openProjectMenu() {
    if (!selectedProject) {
      setProjectOpen(true);
      return;
    }
    setProjectActionError("");
    setIsProjectMenuOpen((open) => !open);
  }

  function openRenameProject() {
    if (!selectedProject) return;
    setRenameProjectTitle(selectedProject.title);
    setProjectActionError("");
    setIsProjectMenuOpen(false);
    setIsRenameProjectOpen(true);
  }

  function openEditProject() {
    if (!selectedProject) return;
    setEditProjectForm(projectFormFromProject(selectedProject));
    setProjectActionError("");
    setIsProjectMenuOpen(false);
    setIsEditProjectOpen(true);
  }

  function openDeleteProject() {
    if (!selectedProject) return;
    setProjectActionError("");
    setIsProjectMenuOpen(false);
    setIsDeleteProjectOpen(true);
  }

  async function submitProjectRename() {
    if (!selectedProject) return;
    if (!renameProjectTitle.trim()) {
      setProjectActionError("Project title is required.");
      return;
    }
    setIsSavingProject(true);
    setProjectActionError("");
    const result = await renameWorkbenchProjectInline({
      projectId: selectedProject.id,
      title: renameProjectTitle,
    });
    setIsSavingProject(false);
    if (!result.ok || !result.project) {
      setProjectActionError(result.error || "Could not rename project.");
      return;
    }
    mutateProject(result.project);
    setIsRenameProjectOpen(false);
    setNotice("Project renamed.");
    router.refresh();
  }

  async function submitProjectEdit() {
    if (!selectedProject) return;
    if (!editProjectForm.title.trim()) {
      setProjectActionError("Project title is required.");
      return;
    }
    setIsSavingProject(true);
    setProjectActionError("");
    const result = await updateWorkbenchProjectInline({
      projectId: selectedProject.id,
      patch: {
        title: editProjectForm.title,
        description: editProjectForm.description || null,
        project_type: editProjectForm.project_type,
        visibility: editProjectForm.visibility,
        status: editProjectForm.status,
        deadline: editProjectForm.deadline || null,
      },
    });
    setIsSavingProject(false);
    if (!result.ok || !result.project) {
      setProjectActionError(result.error || "Could not update project.");
      return;
    }
    mutateProject(result.project);
    setIsEditProjectOpen(false);
    setNotice("Project updated.");
    router.refresh();
  }

  async function confirmDeleteProject() {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    setIsDeletingProject(true);
    setProjectActionError("");
    const result = await deleteWorkbenchProjectInline({ projectId });
    setIsDeletingProject(false);
    if (!result.ok) {
      setProjectActionError(result.error || "Could not delete project.");
      return;
    }

    const remainingProjects = projects.filter((project) => project.id !== projectId);
    setProjects(remainingProjects);
    setTasks((current) => current.filter((task) => task.project_id !== projectId));
    setProjectRecords((current) => current.filter((record) => record.project_id !== projectId));
    setAnnotations((current) => current.filter((annotation) => annotation.project_id !== projectId));
    setSelectedProjectId(remainingProjects[0]?.id || "");
    setIsDeleteProjectOpen(false);
    setNotice("Project deleted.");
    router.push("/my/workbench");
    router.refresh();
  }

  async function confirmDeleteTask() {
    const task = tasks.find((t) => t.id === deletingTaskId);
    if (!task) return;
    setIsDeletingTask(true);
    setTaskActionError("");
    const result = await deleteWorkbenchTaskInline({ projectId: task.project_id, taskId: task.id });
    setIsDeletingTask(false);
    if (!result.ok) {
      setTaskActionError(result.error || "Could not delete task.");
      return;
    }
    setTasks((current) => current.filter((t) => t.id !== task.id));
    setDeletingTaskId(null);
    setNotice("Task deleted.");
    router.refresh();
  }

  function groupedTasks() {
    const map = new Map<string, TaskWithProject[]>();
    visibleTasks.forEach((task) => {
      const key = groupBy === "status" ? task.status : groupBy === "priority" ? task.priority : task.review_type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    if (groupBy === "status") {
      STATUS_ORDER.forEach((status) => {
        if ((status === "todo" || status === "done") && !map.has(status)) map.set(status, []);
      });
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (groupBy === "status") return STATUS_ORDER.indexOf(a as TaskStatusId) - STATUS_ORDER.indexOf(b as TaskStatusId);
      if (groupBy === "priority") return priorityWeight(b) - priorityWeight(a);
      return reviewLabel(a).localeCompare(reviewLabel(b));
    });
  }

  const comingSoon = (label: string) => setNotice(`${label} is coming soon. Core task and project tools are active now.`);

  return (
    <div className="workbench-board-page">
      {(notice || error) ? (
        <p className={`workbench-flash ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>
          {error || notice}
        </p>
      ) : null}

      <header className="workbench-board-header">
        <div>
          <div className="workbench-board-title-row">
            <h1>{selectedProject ? selectedProject.title : "Archive Workbench"}</h1>
            <div className="workbench-project-actions">
              <button
                className="workbench-board-title-menu"
                type="button"
                onClick={openProjectMenu}
                aria-expanded={isProjectMenuOpen}
                aria-haspopup="menu"
                aria-label="Open project menu"
              >
                ▾
              </button>
              {isProjectMenuOpen ? (
                <div className="workbench-project-menu" role="menu">
                  <button type="button" role="menuitem" onClick={openRenameProject}>
                    Rename project
                  </button>
                  <button type="button" role="menuitem" onClick={openEditProject}>
                    Edit project details
                  </button>
                  <button type="button" role="menuitem" className="is-danger" onClick={openDeleteProject}>
                    Delete project
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <p>Research project board for metadata, rights, cultural review, citation and publication work.</p>
          {projects.length ? (
            <label className="workbench-board-project-select">
              <span>Project</span>
              <select value={activeProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                {projects.map((project) => (
                  <option value={project.id} key={project.id}>{project.title}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="workbench-board-actions" aria-label="Board actions">
          <button type="button" onClick={() => comingSoon("AI suggestions")}>AI suggestions</button>
          <button type="button" onClick={() => comingSoon("Integrations")}>Integrate</button>
          <button type="button" onClick={() => comingSoon("Automations")}>Automate</button>
          <button type="button" onClick={() => comingSoon("Collaborator management")}>Collaborators</button>
          <button type="button" className="workbench-board-invite" onClick={() => comingSoon("Invites")}>Invite / 1</button>
          <button type="button" onClick={() => comingSoon("More board actions")} aria-label="More actions">•••</button>
        </div>
      </header>

      <nav className="workbench-board-tabs" aria-label="Workbench views">
        {[
          ["table", "Main table"],
          ["board", "Board"],
          ["timeline", "Timeline"],
          ["records", "Records"],
          ["notes", "Notes"],
        ].map(([id, label]) => (
          <button type="button" className={view === id ? "is-active" : undefined} onClick={() => setView(id as ViewTab)} key={id}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => comingSoon("Custom views")} aria-label="Add view">+</button>
      </nav>

      <div className="workbench-board-toolbar" aria-label="Board toolbar">
        <button type="button" className="workbench-board-new-task" onClick={() => openNewTask("todo")}>New task</button>
        <label><span>Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" /></label>
        <label><span>Person</span><select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}><option value="">All owners</option>{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
        <label><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
        <label><span>Priority</span><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="">All priorities</option>{TASK_PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}</select></label>
        <label><span>Review</span><select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}><option value="">All review types</option>{TASK_REVIEW_TYPES.map((r) => <option key={r} value={r}>{reviewLabel(r)}</option>)}</select></label>
        <label><span>Sort</span><select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}><option value="due_asc">Due date ascending</option><option value="due_desc">Due date descending</option><option value="priority">Priority</option><option value="created_desc">Created newest</option></select></label>
        <label><span>Group by</span><select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}><option value="status">Status</option><option value="review_type">Review type</option><option value="priority">Priority</option></select></label>
        <details className="workbench-hide-menu"><summary>Hide</summary>{Object.entries(COLUMN_LABELS).map(([key, label]) => <label key={key}><input type="checkbox" checked={!hidden[key as HideColumnKey]} onChange={() => setHidden((h) => ({ ...h, [key]: !h[key as HideColumnKey] }))} />{label}</label>)}</details>
        <button type="button" onClick={() => comingSoon("Additional toolbar tools")}>More</button>
      </div>

      {projects.length ? (
        <section className="workbench-summary-strip" aria-label="Workbench summary">
          <article>
            <span>To-Do</span>
            <strong>{visibleTasks.filter((task) => task.status === "todo").length}</strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{visibleTasks.filter((task) => task.status === "done").length}</strong>
          </article>
          <article>
            <span>Needs review</span>
            <strong>{visibleTasks.filter((task) => task.status === "needs_review").length}</strong>
          </article>
          <article>
            <span>Linked records</span>
            <strong>{selectedProjectRecords.length}</strong>
          </article>
        </section>
      ) : null}

      {!projects.length ? (
        <div className="workbench-board-empty empty-state" role="status">
          <strong>No research project yet</strong>
          Create a project to start tracking source checks, rights review, cultural review and publication tasks.
          <button type="button" className="workbench-board-new-task" onClick={() => setProjectOpen(true)}>Create research project</button>
        </div>
      ) : view === "table" ? (
        <MainTable grouped={groupedTasks()} hidden={hidden} recordMap={recordMap} onAdd={openNewTask} onPatch={savePatch} onEdit={openEditTask} onDelete={(task) => setDeletingTaskId(task.id)} />
      ) : view === "board" ? (
        <BoardView tasks={visibleTasks} recordMap={recordMap} onPatch={savePatch} onEdit={openEditTask} onDelete={(task) => setDeletingTaskId(task.id)} />
      ) : view === "timeline" ? (
        <TimelineView tasks={visibleTasks} />
      ) : view === "records" ? (
        <RecordsView records={selectedProjectRecords} recordMap={recordMap} />
      ) : (
        <NotesView annotations={selectedProjectAnnotations} tasks={visibleTasks} />
      )}

      {projects.length ? <button className="workbench-add-group" type="button" onClick={() => comingSoon("Custom task groups")}>+ Add new group</button> : null}

      {isRenameProjectOpen ? (
        <WorkbenchModalFrame
          title="Rename project"
          titleId="rename-project-title"
          onClose={closeRenameProjectModal}
          errorSlot={projectActionError ? <p className="workbench-form-error" role="alert">{projectActionError}</p> : null}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeRenameProjectModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-primary" onClick={submitProjectRename} disabled={isSavingProject}>
                {isSavingProject ? "Saving..." : "Save name"}
              </button>
            </>
          }
        >
          <label className="workbench-field">
            <span>Project title</span>
            <input value={renameProjectTitle} onChange={(e) => setRenameProjectTitle(e.target.value)} autoFocus />
          </label>
        </WorkbenchModalFrame>
      ) : null}

      {isEditProjectOpen ? (
        <WorkbenchModalFrame
          title="Edit project details"
          titleId="edit-project-title"
          onClose={closeEditProjectModal}
          errorSlot={projectActionError ? <p className="workbench-form-error" role="alert">{projectActionError}</p> : null}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeEditProjectModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-primary" onClick={submitProjectEdit} disabled={isSavingProject}>
                {isSavingProject ? "Saving..." : "Save project"}
              </button>
            </>
          }
        >
          <ProjectForm draft={editProjectForm} setDraft={setEditProjectForm} />
        </WorkbenchModalFrame>
      ) : null}

      {isDeleteProjectOpen ? (
        <WorkbenchModalFrame
          title="Delete project"
          titleId="delete-project-title"
          onClose={closeDeleteProjectModal}
          errorSlot={projectActionError ? <p className="workbench-form-error" role="alert">{projectActionError}</p> : null}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeDeleteProjectModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-danger" onClick={confirmDeleteProject} disabled={isDeletingProject}>
                {isDeletingProject ? "Deleting..." : "Delete project"}
              </button>
            </>
          }
        >
          <p className="workbench-modal-lede">
            Delete this project? This will remove its linked records, tasks, milestones and annotations. This cannot be undone.
          </p>
        </WorkbenchModalFrame>
      ) : null}

      {newTaskOpen ? (
        <WorkbenchModalFrame
          title="New task"
          titleId="new-task-title"
          onClose={closeNewTaskModal}
          errorSlot={taskActionError ? <p className="workbench-form-error" role="alert">{taskActionError}</p> : null}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeNewTaskModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-primary" onClick={submitTask} disabled={isPending}>
                {isPending ? "Saving..." : "Save task"}
              </button>
            </>
          }
        >
          <TaskForm draft={taskDraft} setDraft={setTaskDraft} recordOptions={props.recordOptions} autoFocusTitle />
        </WorkbenchModalFrame>
      ) : null}

      {editingTaskId ? (
        <WorkbenchModalFrame
          title="Edit task"
          titleId="edit-task-title"
          onClose={closeEditTaskModal}
          errorSlot={taskActionError ? <p className="workbench-form-error" role="alert">{taskActionError}</p> : null}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeEditTaskModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-primary" onClick={submitTaskEdit} disabled={isSavingTask}>
                {isSavingTask ? "Saving..." : "Save changes"}
              </button>
            </>
          }
        >
          <TaskForm draft={editTaskForm} setDraft={setEditTaskForm} recordOptions={props.recordOptions} autoFocusTitle />
        </WorkbenchModalFrame>
      ) : null}

      {deletingTaskId ? (
        <WorkbenchModalFrame
          title="Delete task"
          titleId="delete-task-title"
          onClose={closeDeleteTaskModal}
          errorSlot={taskActionError ? <p className="workbench-form-error" role="alert">{taskActionError}</p> : null}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeDeleteTaskModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-danger" onClick={confirmDeleteTask} disabled={isDeletingTask}>
                {isDeletingTask ? "Deleting..." : "Delete"}
              </button>
            </>
          }
        >
          <p className="workbench-modal-lede">Delete this task? This cannot be undone.</p>
        </WorkbenchModalFrame>
      ) : null}

      {projectOpen ? (
        <WorkbenchModalFrame
          title="Create research project"
          titleId="new-project-title"
          onClose={closeCreateProjectModal}
          footer={
            <>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-secondary" onClick={closeCreateProjectModal}>
                Cancel
              </button>
              <button type="button" className="workbench-modal-btn workbench-modal-btn-primary" onClick={submitProject} disabled={isPending}>
                {isPending ? "Creating..." : "Create project"}
              </button>
            </>
          }
        >
          <label className="workbench-field">
            <span>Project title</span>
            <input value={projectDraft.title} onChange={(e) => setProjectDraft((d) => ({ ...d, title: e.target.value }))} autoFocus />
          </label>
          <label className="workbench-field">
            <span>Description</span>
            <textarea value={projectDraft.description} onChange={(e) => setProjectDraft((d) => ({ ...d, description: e.target.value }))} rows={3} />
          </label>
        </WorkbenchModalFrame>
      ) : null}
    </div>
  );
}

function TaskForm(props: {
  draft: TaskFormDraft;
  setDraft: Dispatch<SetStateAction<TaskFormDraft>>;
  recordOptions: WorkbenchRecordOption[];
  autoFocusTitle?: boolean;
}) {
  const { draft, setDraft, autoFocusTitle } = props;
  return (
    <div className="workbench-task-form workbench-task-form--modal">
      <label className="workbench-field">
        <span>Task title</span>
        <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} autoFocus={autoFocusTitle} />
      </label>
      <label className="workbench-field">
        <span>Description</span>
        <input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      </label>
      <label className="workbench-field">
        <span>Linked record</span>
        <select value={draft.linked_record_id} onChange={(e) => setDraft((d) => ({ ...d, linked_record_id: e.target.value }))}>
          <option value="">No linked record</option>
          {props.recordOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </label>
      <label className="workbench-field">
        <span>Owner</span>
        <input value={draft.owner_name} onChange={(e) => setDraft((d) => ({ ...d, owner_name: e.target.value }))} placeholder="Unassigned" />
      </label>
      <label className="workbench-field">
        <span>Status</span>
        <select
          className={`workbench-status workbench-status--${statusTone(draft.status)}`}
          value={draft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <label className="workbench-field">
        <span>Due date</span>
        <input type="date" value={draft.due_date} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} />
      </label>
      <label className="workbench-field">
        <span>Review type</span>
        <select value={draft.review_type} onChange={(e) => setDraft((d) => ({ ...d, review_type: e.target.value }))}>
          {TASK_REVIEW_TYPES.map((r) => (
            <option key={r} value={r}>
              {reviewLabel(r)}
            </option>
          ))}
        </select>
      </label>
      <label className="workbench-field">
        <span>Priority</span>
        <select
          className={`workbench-priority workbench-priority--${draft.priority}`}
          value={draft.priority}
          onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {priorityLabel(p)}
            </option>
          ))}
        </select>
      </label>
      <label className="workbench-field workbench-task-form-wide">
        <span>Notes</span>
        <textarea rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </label>
    </div>
  );
}

function ProjectForm(props: {
  draft: ProjectFormDraft;
  setDraft: Dispatch<SetStateAction<ProjectFormDraft>>;
}) {
  const { draft, setDraft } = props;
  return (
    <div className="workbench-form workbench-project-form">
      <label className="workbench-field">
        <span>Title</span>
        <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} autoFocus />
      </label>
      <label className="workbench-field">
        <span>Deadline</span>
        <input type="date" value={draft.deadline} onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))} />
      </label>
      <label className="workbench-field workbench-form-wide">
        <span>Description</span>
        <textarea rows={3} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      </label>
      <label className="workbench-field">
        <span>Project type</span>
        <select value={draft.project_type} onChange={(e) => setDraft((d) => ({ ...d, project_type: e.target.value }))}>
          {WORKBENCH_PROJECT_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="workbench-field">
        <span>Visibility</span>
        <select value={draft.visibility} onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value }))}>
          {PROJECT_VISIBILITY.map((visibility) => (
            <option key={visibility} value={visibility}>
              {visibility[0].toUpperCase() + visibility.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="workbench-field">
        <span>Status</span>
        <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
          {PROJECT_STATUS.map((status) => (
            <option key={status} value={status}>
              {status[0].toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

type TaskGroupProps = {
  groupKey: string;
  rows: TaskWithProject[];
  hidden: Record<HideColumnKey, boolean>;
  recordMap: Map<string, string>;
  onAdd: (status: string) => void;
  onPatch: (task: TaskWithProject, patch: Parameters<typeof patchWorkbenchTask>[0]["patch"]) => void;
  onEdit: (task: TaskWithProject) => void;
  onDelete: (task: TaskWithProject) => void;
};

function MainTable(props: {
  grouped: Array<[string, TaskWithProject[]]>;
  hidden: Record<HideColumnKey, boolean>;
  recordMap: Map<string, string>;
  onAdd: (status: string) => void;
  onPatch: (task: TaskWithProject, patch: Parameters<typeof patchWorkbenchTask>[0]["patch"]) => void;
  onEdit: (task: TaskWithProject) => void;
  onDelete: (task: TaskWithProject) => void;
}) {
  const { grouped, ...groupProps } = props;
  return (
    <div className="workbench-board-table-scroll workbench-task-table">
      {grouped.map(([key, rows]) => (
        <TaskGroup key={key} groupKey={key} rows={rows} {...groupProps} />
      ))}
    </div>
  );
}

function TaskGroup({ groupKey, rows, hidden, recordMap, onAdd, onPatch, onEdit, onDelete }: TaskGroupProps) {
  const addStatus = TASK_STATUSES.includes(groupKey as TaskStatusId) ? groupKey : "todo";
  const title = STATUS_GROUP_LABEL[groupKey] || reviewLabel(groupKey) || priorityLabel(groupKey);
  const gridTemplateColumns = taskGridTemplateColumns(hidden);
  return (
    <section className={`workbench-task-group ${groupKey === "done" ? "workbench-task-group--completed" : ""}`}>
      <div className="workbench-task-group-title">
        <span aria-hidden="true" />
        <h2>{title}</h2>
        <em>{rows.length}</em>
      </div>
      <div className="workbench-task-table-panel">
        <div className="workbench-task-grid" role="table" aria-label={`${title} tasks`} style={{ gridTemplateColumns }}>
          <div className="workbench-task-row workbench-task-row--head" role="row">
            <div role="columnheader" />
            <div role="columnheader">Task</div>
            {!hidden.linkedRecord ? <div role="columnheader">Linked record</div> : null}
            {!hidden.owner ? <div role="columnheader">Owner</div> : null}
            {!hidden.status ? <div role="columnheader">Status</div> : null}
            {!hidden.dueDate ? <div role="columnheader">Due date</div> : null}
            {!hidden.reviewType ? <div role="columnheader">Review type</div> : null}
            {!hidden.priority ? <div role="columnheader">Priority</div> : null}
            <div role="columnheader">Actions</div>
          </div>
          {rows.map((task) => (
            <TaskRow key={task.id} task={task} hidden={hidden} recordMap={recordMap} onPatch={onPatch} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
        <button className="workbench-task-add-row" type="button" onClick={() => onAdd(addStatus)}>
          <span aria-hidden="true">+</span>
          <span>Add task</span>
        </button>
      </div>
    </section>
  );
}

function TaskRow({ task, hidden, recordMap, onPatch, onEdit, onDelete }: {
  task: TaskWithProject;
  hidden: Record<HideColumnKey, boolean>;
  recordMap: Map<string, string>;
  onPatch: (task: TaskWithProject, patch: Parameters<typeof patchWorkbenchTask>[0]["patch"]) => void;
  onEdit: (task: TaskWithProject) => void;
  onDelete: (task: TaskWithProject) => void;
}) {
  const rid = linkedRecordId(task);
  return (
    <div className="workbench-task-row" role="row">
      <div role="cell" className="workbench-task-check"><input type="checkbox" checked={isDone(task)} onChange={(e) => onPatch(task, { status: e.target.checked ? "done" : "todo" })} aria-label={`Complete ${task.title}`} /></div>
      <div role="cell" className="workbench-task-title-cell"><input defaultValue={task.title} onBlur={(e) => e.target.value !== task.title ? onPatch(task, { title: e.target.value }) : undefined} aria-label="Task title" /><small>{task.project_title}</small></div>
      {!hidden.linkedRecord ? <div role="cell"><select value={rid} onChange={(e) => onPatch(task, { linked_record_ids: e.target.value ? [e.target.value] : [] })}><option value="">No linked record</option>{rid && !recordMap.has(rid) ? <option value={rid}>{rid}</option> : null}{Array.from(recordMap.entries()).slice(0, 200).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></div> : null}
      {!hidden.owner ? <div role="cell"><span className="workbench-owner-avatar">{ownerInitials(taskOwner(task))}</span><input defaultValue={task.owner_name || ""} onBlur={(e) => e.target.value !== (task.owner_name || "") ? onPatch(task, { owner_name: e.target.value || null }) : undefined} aria-label="Owner" /></div> : null}
      {!hidden.status ? <div role="cell"><select className={`workbench-status workbench-status--${statusTone(task.status)}`} value={task.status} onChange={(e) => onPatch(task, { status: e.target.value })}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div> : null}
      {!hidden.dueDate ? <div role="cell"><input type="date" value={task.due_date || ""} onChange={(e) => onPatch(task, { due_date: e.target.value || null })} /></div> : null}
      {!hidden.reviewType ? <div role="cell"><select value={task.review_type} onChange={(e) => onPatch(task, { review_type: e.target.value })}>{TASK_REVIEW_TYPES.map((r) => <option key={r} value={r}>{reviewLabel(r)}</option>)}</select></div> : null}
      {!hidden.priority ? <div role="cell"><select className={`workbench-priority workbench-priority--${task.priority}`} value={task.priority} onChange={(e) => onPatch(task, { priority: e.target.value })}>{TASK_PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}</select></div> : null}
      <div role="cell" className="workbench-task-actions">
        <button type="button" className="workbench-task-edit" onClick={() => onEdit(task)}>Edit</button>
        <button type="button" className="workbench-task-delete" onClick={() => onDelete(task)}>Delete</button>
      </div>
    </div>
  );
}

function BoardView({
  tasks,
  recordMap,
  onPatch,
  onEdit,
  onDelete,
}: {
  tasks: TaskWithProject[];
  recordMap: Map<string, string>;
  onPatch: (task: TaskWithProject, patch: Parameters<typeof patchWorkbenchTask>[0]["patch"]) => void;
  onEdit: (task: TaskWithProject) => void;
  onDelete: (task: TaskWithProject) => void;
}) {
  return (
    <div className="workbench-kanban-scroll">
      <div className="workbench-kanban">
        {STATUS_ORDER.map((status) => (
          <section key={status} className="workbench-kanban-col">
            <h2>{STATUS_GROUP_LABEL[status]}</h2>
            {tasks.filter((t) => t.status === status).map((task) => (
              <article className="workbench-kanban-card" key={task.id}>
                <button type="button" onClick={() => onPatch(task, { status: status === "done" ? "todo" : "done" })}>
                  <strong>{task.title}</strong>
                  <span>{linkedRecordId(task) ? recordMap.get(linkedRecordId(task)) || linkedRecordId(task) : "No linked record"}</span>
                </button>
                <div className="workbench-task-actions">
                  <button type="button" className="workbench-task-edit" onClick={() => onEdit(task)}>Edit</button>
                  <button type="button" className="workbench-task-delete" onClick={() => onDelete(task)}>Delete</button>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function TimelineView({ tasks }: { tasks: TaskWithProject[] }) {
  const dated = [...tasks].sort((a, b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")));
  return <section className="workbench-alt-view"><h2>Timeline</h2>{dated.length ? dated.map((task) => <div className="workbench-timeline-row" key={task.id}><strong>{textDate(task.due_date)}</strong><span>{task.title}</span><em>{statusLabel(task.status)}</em></div>) : <p>No due-date tasks yet.</p>}</section>;
}

function RecordsView({ records, recordMap }: { records: WorkbenchProjectRecordRow[]; recordMap: Map<string, string> }) {
  return <section className="workbench-alt-view"><h2>Project-linked records</h2>{records.length ? records.map((record) => <div className="workbench-record-row" key={record.id}><strong>{recordMap.get(record.record_id) || record.record_id}</strong><span>{record.status}</span><em>Metadata {record.metadata_review_needed ? "needed" : "ok"} · Rights {record.rights_checked ? "checked" : "unchecked"}</em></div>) : <p>No linked records yet.</p>}</section>;
}

function NotesView({ annotations, tasks }: { annotations: Array<WorkbenchAnnotationRow & { record_title?: string }>; tasks: TaskWithProject[] }) {
  const taskNotes = tasks.filter((task) => task.notes?.trim());
  return <section className="workbench-alt-view"><h2>Notes</h2>{annotations.map((a) => <div className="workbench-note-row" key={a.id}><strong>{a.record_title || a.record_id}</strong><p>{a.note}</p></div>)}{taskNotes.map((task) => <div className="workbench-note-row" key={task.id}><strong>{task.title}</strong><p>{task.notes}</p></div>)}{!annotations.length && !taskNotes.length ? <p>No project or task notes yet.</p> : null}</section>;
}
