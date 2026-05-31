"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  createAdminKanbanTask,
  deleteAdminKanbanTask,
  fetchAdminKanbanTasks,
  fetchAdminProjects,
  saveAdminKanbanOrder,
  updateAdminKanbanTask,
  type AdminKanbanStatus,
  type AdminKanbanTask,
  type AdminProject,
} from "@/app/(admin)/admin/workspace-tools/actions";

const COLUMNS: { id: AdminKanbanStatus; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "in_progress", title: "In progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
  { id: "blocked", title: "Blocked" },
];

function groupByStatus(tasks: AdminKanbanTask[]): Record<AdminKanbanStatus, AdminKanbanTask[]> {
  const next: Record<AdminKanbanStatus, AdminKanbanTask[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    review: [],
    done: [],
    blocked: [],
  };
  for (const t of tasks) {
    const status = t.status === "backlog" ? "todo" : t.status;
    if (next[status]) next[status].push(t);
  }
  for (const col of COLUMNS) {
    next[col.id].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return next;
}

function orderPayload(cols: Record<AdminKanbanStatus, AdminKanbanTask[]>) {
  const order: Record<AdminKanbanStatus, string[]> = {
    backlog: cols.backlog.map((t) => t.id),
    todo: cols.todo.map((t) => t.id),
    in_progress: cols.in_progress.map((t) => t.id),
    review: cols.review.map((t) => t.id),
    done: cols.done.map((t) => t.id),
    blocked: cols.blocked.map((t) => t.id),
  };
  return order;
}

function findColumnOfTask(
  cols: Record<AdminKanbanStatus, AdminKanbanTask[]>,
  taskId: string,
): AdminKanbanStatus | null {
  for (const { id } of COLUMNS) {
    if (cols[id].some((t) => t.id === taskId)) return id;
  }
  return null;
}

const STATUS_LABEL: Record<AdminKanbanStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

function KanbanCard({
  task,
  columnId,
  dragging,
  projects,
  editingId,
  setEditingId,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editProjectId,
  setEditProjectId,
  onSaveEdit,
  onMove,
  onDelete,
  busy,
}: {
  task: AdminKanbanTask;
  columnId: AdminKanbanStatus;
  dragging?: boolean;
  projects: AdminProject[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editProjectId: string;
  setEditProjectId: (v: string) => void;
  onSaveEdit: () => void;
  onMove: (taskId: string, to: AdminKanbanStatus) => void;
  onDelete: (taskId: string) => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const isEditing = editingId === task.id;

  return (
    <div className="admin-kanban-card-stack">
      <div
        ref={setNodeRef}
        style={style}
        className={`admin-kanban-card ${isDragging || dragging ? "is-dragging" : ""}`}
        {...listeners}
        {...attributes}
      >
        <div className="admin-kanban-card-title-row">
          <span className="admin-kanban-card-title">{task.title}</span>
          <span className="admin-kanban-status-pill">{STATUS_LABEL[task.status]}</span>
        </div>
        {task.description ? (
          <p className="admin-kanban-card-desc">{task.description}</p>
        ) : null}
        {task.project_id && task.project_title ? (
          <p className="admin-kanban-card-project">Project: {task.project_title}</p>
        ) : null}
      </div>
      <div
        className="admin-kanban-card-tools"
        onPointerDown={stop}
        onClick={stop}
      >
        <button
          type="button"
          className="admin-small-button admin-button-secondary"
          disabled={busy}
          onClick={() => {
            if (isEditing) {
              setEditingId(null);
            } else {
              setEditingId(task.id);
              setEditTitle(task.title);
              setEditDescription(task.description ?? "");
              setEditProjectId(task.project_id ?? "");
            }
          }}
        >
          {isEditing ? "Close" : "Edit"}
        </button>
        <label className="admin-kanban-move-label">
          <span className="admin-sr-only">Move to column</span>
          <select
            className="admin-filter admin-filter-compact"
            value={columnId}
            disabled={busy}
            onChange={(e) => onMove(task.id, e.target.value as AdminKanbanStatus)}
            aria-label={`Move “${task.title}”`}
          >
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-small-button admin-danger-button"
          disabled={busy}
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
      {isEditing ? (
        <div className="admin-kanban-edit-panel" onPointerDown={stop}>
          <input
            type="text"
            className="admin-chat-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            aria-label="Task title"
          />
          <textarea
            className="admin-kanban-edit-textarea"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            aria-label="Task description"
          />
          <select
            className="admin-filter"
            value={editProjectId}
            onChange={(e) => setEditProjectId(e.target.value)}
            aria-label="Linked project"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={onSaveEdit}
          >
            Save changes
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  tasks,
  activeId,
  projects,
  editingId,
  setEditingId,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editProjectId,
  setEditProjectId,
  onSaveEdit,
  onMove,
  onDelete,
  busy,
}: {
  id: AdminKanbanStatus;
  title: string;
  tasks: AdminKanbanTask[];
  activeId: string | null;
  projects: AdminProject[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editProjectId: string;
  setEditProjectId: (v: string) => void;
  onSaveEdit: (taskId: string) => void;
  onMove: (taskId: string, to: AdminKanbanStatus) => void;
  onDelete: (taskId: string) => void;
  busy: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`admin-kanban-column ${isOver ? "is-over" : ""}`}>
      <h4 className="admin-kanban-column-title">{title}</h4>
      <div ref={setNodeRef} className="admin-kanban-column-body">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            columnId={id}
            dragging={activeId === task.id}
            projects={projects}
            editingId={editingId}
            setEditingId={setEditingId}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editProjectId={editProjectId}
            setEditProjectId={setEditProjectId}
            onSaveEdit={() => onSaveEdit(task.id)}
            onMove={onMove}
            onDelete={onDelete}
            busy={busy}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminKanbanBoard() {
  const [tasks, setTasks] = useState<AdminKanbanTask[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => groupByStatus(tasks), [tasks]);

  const reload = useCallback(async () => {
    setNotice(null);
    const [tRes, pRes] = await Promise.all([fetchAdminKanbanTasks(), fetchAdminProjects()]);
    if (!tRes.ok) {
      setNotice({ type: "err", text: tRes.error });
      setTasks([]);
    } else {
      setTasks(tRes.data);
    }
    if (!pRes.ok) {
      setNotice({ type: "err", text: pRes.error });
      setProjects([]);
    } else {
      setProjects(pRes.data);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const persistOrder = useCallback(
    async (cols: Record<AdminKanbanStatus, AdminKanbanTask[]>) => {
      setBusy(true);
      setNotice(null);
      const res = await saveAdminKanbanOrder(orderPayload(cols));
      setBusy(false);
      if (!res.ok) {
        setNotice({ type: "err", text: res.error });
        await reload();
        return;
      }
      await reload();
      setNotice({ type: "ok", text: "Board updated." });
    },
    [reload],
  );

  const moveTask = useCallback(
    async (taskId: string, to: AdminKanbanStatus) => {
      const cols = groupByStatus(tasks);
      const from = findColumnOfTask(cols, taskId);
      if (!from || from === to) return;
      const task = cols[from].find((t) => t.id === taskId);
      if (!task) return;
      const next: Record<AdminKanbanStatus, AdminKanbanTask[]> = {
        backlog: [...cols.backlog],
        todo: [...cols.todo],
        in_progress: [...cols.in_progress],
        review: [...cols.review],
        done: [...cols.done],
        blocked: [...cols.blocked],
      };
      next[from] = next[from].filter((t) => t.id !== taskId);
      const moved = { ...task, status: to };
      next[to] = [...next[to], moved];
      setTasks([
        ...next.backlog,
        ...next.todo,
        ...next.in_progress,
        ...next.review,
        ...next.done,
        ...next.blocked,
      ]);
      await persistOrder(next);
    },
    [tasks, persistOrder],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (
        !window.confirm("Delete this Kanban task? This cannot be undone.")
      ) {
        return;
      }
      setBusy(true);
      setNotice(null);
      const res = await deleteAdminKanbanTask(taskId);
      setBusy(false);
      if (!res.ok) {
        setNotice({ type: "err", text: res.error });
        return;
      }
      setEditingId(null);
      await reload();
      setNotice({ type: "ok", text: "Task deleted." });
    },
    [reload],
  );

  const saveEdit = useCallback(
    async (taskId: string) => {
      setBusy(true);
      setNotice(null);
      const res = await updateAdminKanbanTask(taskId, {
        title: editTitle,
        description: editDescription,
        project_id: editProjectId || null,
      });
      setBusy(false);
      if (!res.ok) {
        setNotice({ type: "err", text: res.error });
        return;
      }
      setEditingId(null);
      await reload();
      setNotice({ type: "ok", text: "Task saved." });
    },
    [editTitle, editDescription, editProjectId, reload],
  );

  const addTask = useCallback(async () => {
    const t = newTitle.trim();
    if (!t) return;
    setBusy(true);
    setNotice(null);
    const res = await createAdminKanbanTask({
      title: t,
      description: newDescription.trim() || null,
      project_id: newProjectId || null,
      status: "todo",
    });
    setBusy(false);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewProjectId("");
    await reload();
    setNotice({ type: "ok", text: "Task created." });
  }, [newTitle, newDescription, newProjectId, reload]);

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const activeTaskId = String(active.id);
      const overId = String(over.id);

      const prevCols = groupByStatus(tasks);
      const from = findColumnOfTask(prevCols, activeTaskId);
      if (!from) return;
      const task = prevCols[from].find((t) => t.id === activeTaskId);
      if (!task) return;

      const overIsColumn = COLUMNS.some((c) => c.id === overId);
      const toCol = overIsColumn
        ? (overId as AdminKanbanStatus)
        : findColumnOfTask(prevCols, overId);
      if (!toCol) return;

      const next: Record<AdminKanbanStatus, AdminKanbanTask[]> = {
        backlog: [...prevCols.backlog],
        todo: [...prevCols.todo],
        in_progress: [...prevCols.in_progress],
        review: [...prevCols.review],
        done: [...prevCols.done],
        blocked: [...prevCols.blocked],
      };

      next[from] = next[from].filter((t) => t.id !== activeTaskId);
      const moved = { ...task, status: toCol };

      if (overIsColumn) {
        next[toCol].push(moved);
      } else {
        const idx = next[toCol].findIndex((t) => t.id === overId);
        if (idx < 0) next[toCol].push(moved);
        else next[toCol].splice(idx, 0, moved);
      }

      setTasks([
        ...next.backlog,
        ...next.todo,
        ...next.in_progress,
        ...next.review,
        ...next.done,
        ...next.blocked,
      ]);
      await persistOrder(next);
    },
    [tasks, persistOrder],
  );

  const activeTask =
    activeId == null ? null : (tasks.find((t) => t.id === activeId) ?? null);

  if (loading) {
    return <p className="admin-muted">Loading board…</p>;
  }

  return (
    <div className="admin-kanban-wrap">
      {notice ? (
        <p
          className={notice.type === "err" ? "admin-flash admin-flash-error" : "admin-flash admin-flash-ok"}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      <div className="admin-kanban-add dashboard-toolbar admin-kanban-add-extended">
        <input
          type="text"
          className="admin-chat-input admin-kanban-new-input"
          placeholder="New task title"
          value={newTitle}
          disabled={busy}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addTask())}
        />
        <textarea
          className="admin-kanban-new-desc"
          placeholder="Description (optional)"
          value={newDescription}
          disabled={busy}
          onChange={(e) => setNewDescription(e.target.value)}
          rows={2}
          aria-label="New task description"
        />
        <select
          className="admin-filter"
          value={newProjectId}
          disabled={busy}
          onChange={(e) => setNewProjectId(e.target.value)}
          aria-label="Link to project"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="button" className="admin-button" disabled={busy} onClick={() => void addTask()}>
          Add to To do
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="admin-muted admin-kanban-empty">
          No tasks yet. Create a task to start organising editorial work.
        </p>
      ) : null}

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={(e) => void onDragEnd(e)}
      >
        <div className="admin-kanban-board admin-kanban-board-five">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={columns[col.id]}
              activeId={activeId}
              projects={projects}
              editingId={editingId}
              setEditingId={setEditingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editProjectId={editProjectId}
              setEditProjectId={setEditProjectId}
              onSaveEdit={saveEdit}
              onMove={(id, to) => void moveTask(id, to)}
              onDelete={(id) => void deleteTask(id)}
              busy={busy}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="admin-kanban-card admin-kanban-card-overlay">{activeTask.title}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <p className="admin-kanban-hint">
        Drag cards between columns, use Move, or delete tasks. Changes are saved to the dashboard.
      </p>
    </div>
  );
}
