"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  WorkbenchAnnotationRow,
  WorkbenchMilestoneRow,
  WorkbenchProjectRecordRow,
  WorkbenchProjectRow,
  WorkbenchTaskRow,
} from "@/lib/workbench-data";
import { snapshotRecordRights, type RecordRightsSnapshot } from "@/lib/workbench-shared";
import {
  createWorkbenchAnnotation,
  importReadingListToProject,
  inviteWorkbenchCollaborator,
  removeProjectRecord,
  updateProjectRecord,
  updateWorkbenchProject,
} from "@/lib/workbench-actions";
import {
  createWorkbenchTaskInline,
  deleteWorkbenchTaskInline,
  moveWorkbenchTaskStage,
  patchWorkbenchTask,
  saveWorkbenchProjectNotes,
} from "@/lib/workbench-inline-actions";
import {
  PROJECT_RECORD_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_REVIEW_TYPE_LABEL,
  TASK_STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_REVIEW_TYPES,
  TASK_STATUSES,
  WORKBENCH_BOARD_COLUMNS,
  taskWorkflowGroup,
  type ProjectRecordStatusId,
} from "@/lib/workbench-types";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";

export type WorkbenchArchiveLite = {
  id: string;
  title: string;
  creator: string;
  source: string;
  snapshot: RecordRightsSnapshot;
};

type ViewTab = "table" | "board" | "timeline" | "records" | "notes";

type TableCol =
  | "checkbox"
  | "title"
  | "record"
  | "owner"
  | "status"
  | "priority"
  | "due"
  | "review"
  | "notes"
  | "actions";

const TABLE_COLS: { id: TableCol; label: string }[] = [
  { id: "checkbox", label: "Done" },
  { id: "title", label: "Task" },
  { id: "record", label: "Linked record" },
  { id: "owner", label: "Owner" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "due", label: "Due" },
  { id: "review", label: "Review" },
  { id: "notes", label: "Notes" },
  { id: "actions", label: "" },
];

const COL_STORAGE = (projectId: string) => `wb-pm-cols-${projectId}`;

function notesLineCount(notes: string | null | undefined) {
  if (!notes?.trim()) return 0;
  return notes.split(/\n/).filter((l) => l.trim().length > 0).length;
}

function recordTitle(map: Map<string, WorkbenchArchiveLite>, id: string) {
  return map.get(id)?.title ?? id;
}

export default function ProjectWorkbenchClient(props: {
  projectId: string;
  project: WorkbenchProjectRow;
  records: WorkbenchProjectRecordRow[];
  tasks: WorkbenchTaskRow[];
  milestones: WorkbenchMilestoneRow[];
  annotations: WorkbenchAnnotationRow[];
  collaborators: { id: string; invited_email: string | null; user_id: string | null; role: string }[];
  readingLists: { id: string; title: string }[];
  archiveById: WorkbenchArchiveLite[];
  flashUpdated?: string;
  flashError?: string;
}) {
  const {
    projectId,
    project,
    records,
    tasks,
    milestones,
    annotations,
    collaborators,
    readingLists,
    archiveById: archiveList,
    flashUpdated,
    flashError,
  } = props;

  const router = useRouter();
  const sp = useSearchParams();
  const view = (sp.get("view") as ViewTab | null) || "table";
  const [isPending, startTransition] = useTransition();

  const archiveMap = useMemo(() => new Map(archiveList.map((a) => [a.id, a])), [archiveList]);

  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [sortDue, setSortDue] = useState<"asc" | "desc" | "">("");
  const [groupBy, setGroupBy] = useState<"workflow" | "status" | "review_type" | "owner_name">(
    "workflow",
  );
  const [visibleCols, setVisibleCols] = useState<Record<TableCol, boolean> | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [projectNotes, setProjectNotes] = useState(project.notes ?? "");

  useEffect(() => {
    setProjectNotes(project.notes ?? "");
  }, [project.notes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COL_STORAGE(projectId));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<TableCol, boolean>;
        setVisibleCols({ ...defaultVisible(), ...parsed });
      } else {
        setVisibleCols(defaultVisible());
      }
    } catch {
      setVisibleCols(defaultVisible());
    }
  }, [projectId]);

  const owners = useMemo(() => {
    const s = new Set<string>();
    let hasUnassigned = false;
    for (const t of tasks) {
      const o = (t.owner_name || "").trim();
      if (o) s.add(o);
      else hasUnassigned = true;
    }
    const list = [...s].sort();
    if (hasUnassigned) list.unshift("Unassigned");
    return list;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((t) => {
        const blob = [
          t.title,
          ...(t.linked_record_ids ?? []),
          t.owner_name ?? "",
          t.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(qq);
      });
    }
    if (ownerFilter) {
      if (ownerFilter === "Unassigned") {
        list = list.filter((t) => !(t.owner_name || "").trim());
      } else {
        list = list.filter((t) => (t.owner_name || "").trim() === ownerFilter);
      }
    }
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (reviewFilter) list = list.filter((t) => t.review_type === reviewFilter);
    if (sortDue === "asc") {
      list.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
    } else if (sortDue === "desc") {
      list.sort((a, b) => (b.due_date || "").localeCompare(a.due_date || ""));
    }
    return list;
  }, [tasks, q, ownerFilter, statusFilter, reviewFilter, sortDue]);

  const groupedForTable = useMemo(() => {
    const groups = new Map<string, WorkbenchTaskRow[]>();
    for (const col of WORKBENCH_BOARD_COLUMNS) {
      groups.set(col, []);
    }
    for (const t of filteredTasks) {
      let key: string;
      if (groupBy === "workflow") key = taskWorkflowGroup(t);
      else if (groupBy === "status") key = t.status;
      else if (groupBy === "review_type") key = t.review_type;
      else key = (t.owner_name || "Unassigned").trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    if (groupBy !== "workflow") {
      return [...groups.entries()].filter(([, rows]) => rows.length);
    }
    return WORKBENCH_BOARD_COLUMNS.map((col) => [col, groups.get(col) ?? []] as const);
  }, [filteredTasks, groupBy]);

  const setView = useCallback(
    (next: ViewTab) => {
      const p = new URLSearchParams(sp.toString());
      p.set("view", next);
      if (typeof window !== "undefined") {
        const labels: Record<ViewTab, string> = {
          table: "Opening table…",
          board: "Opening board…",
          timeline: "Opening timeline…",
          records: "Opening records…",
          notes: "Opening notes…",
        };
        window.dispatchEvent(
          new CustomEvent("app:loading:start", {
            detail: { message: labels[next] },
          }),
        );
      }
      router.push(`/my/workbench/projects/${projectId}?${p.toString()}`, { scroll: false });
    },
    [router, projectId, sp],
  );

  const run = useCallback(
    (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      startTransition(async () => {
        const res = await fn();
        if (!res.ok && res.error) {
          window.alert(res.error);
        }
        router.refresh();
      });
    },
    [router],
  );

  const showCol = (c: TableCol) => visibleCols?.[c] !== false;

  const visibleColCount = TABLE_COLS.filter((c) => showCol(c.id)).length;

  const tabBtn = (id: ViewTab, label: string) => (
    <button
      key={id}
      type="button"
      className={`workbench-pm-tab ${view === id ? "is-active" : ""}`}
      onClick={() => setView(id)}
      aria-current={view === id ? "page" : undefined}
    >
      {label}
    </button>
  );

  const tasksByRecord = useMemo(() => {
    const m = new Map<string, WorkbenchTaskRow[]>();
    for (const t of tasks) {
      for (const rid of t.linked_record_ids ?? []) {
        if (!m.has(rid)) m.set(rid, []);
        m.get(rid)!.push(t);
      }
    }
    return m;
  }, [tasks]);

  const timelineRows = useMemo(() => {
    const rows: { kind: "task" | "milestone"; date: string; label: string; id: string }[] = [];
    for (const t of tasks) {
      if (t.due_date) rows.push({ kind: "task", date: t.due_date, label: t.title, id: t.id });
    }
    for (const m of milestones) {
      if (m.due_date) rows.push({ kind: "milestone", date: m.due_date, label: m.title, id: m.id });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }, [tasks, milestones]);

  return (
    <>
      {flashUpdated ? (
        <p className="workbench-flash" role="status">
          {flashUpdated}
        </p>
      ) : null}
      {flashError ? (
        <p className="workbench-flash is-error" role="alert">
          {flashError}
        </p>
      ) : null}

      <header className="workbench-pm-header">
        <div>
          <p className="workbench-kicker">Project</p>
          <h1 className="workbench-page-title">{project.title}</h1>
          {project.description ? <p className="workbench-lede">{project.description}</p> : null}
        </div>
      </header>

      <div className="workbench-pm-tabs" role="tablist" aria-label="Project views">
        {tabBtn("table", "Main table")}
        {tabBtn("board", "Board")}
        {tabBtn("timeline", "Timeline")}
        {tabBtn("records", "Records")}
        {tabBtn("notes", "Notes")}
      </div>

      {isPending ? <p className="workbench-pm-pending" aria-live="polite">Saving…</p> : null}

      {view === "table" ? (
        <section className="workbench-panel workbench-pm-panel">
          <WorkbenchToolbar
            projectId={projectId}
            q={q}
            setQ={setQ}
            ownerFilter={ownerFilter}
            setOwnerFilter={setOwnerFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            reviewFilter={reviewFilter}
            setReviewFilter={setReviewFilter}
            sortDue={sortDue}
            setSortDue={setSortDue}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            visibleCols={visibleCols}
            setVisibleCols={setVisibleCols}
            owners={owners}
            run={run}
          />
          <div className="workbench-pm-table-scroll workbench-task-table">
            <table className="workbench-pm-table">
              <thead>
                <tr>
                  {TABLE_COLS.filter((c) => showCol(c.id)).map((c) => (
                    <th key={c.id} scope="col">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedForTable.map(([groupKey, rows]) => (
                  <FragmentRows
                    key={String(groupKey)}
                    groupKey={String(groupKey)}
                    groupBy={groupBy}
                    rows={rows}
                    projectId={projectId}
                    archiveMap={archiveMap}
                    showCol={showCol}
                    run={run}
                    colSpan={visibleColCount}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "board" ? (
        <section className="workbench-panel workbench-pm-panel">
          <div className="workbench-board-wrap workbench-pm-board-wrap">
            <div className="workbench-board workbench-pm-board">
              {WORKBENCH_BOARD_COLUMNS.map((col) => {
                const colTasks = tasks.filter((t) => taskWorkflowGroup(t) === col);
                return (
                  <div
                    key={col}
                    className="workbench-board-col"
                    data-wb-col={col}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/task-id") || dragTaskId;
                      if (!id) return;
                      run(() => moveWorkbenchTaskStage({ projectId, taskId: id, workflow_stage: col }));
                      setDragTaskId(null);
                    }}
                  >
                    <h3>{PROJECT_RECORD_STATUS_LABEL[col]}</h3>
                    <div className="workbench-board-cards">
                      {colTasks.map((t) => (
                        <article
                          key={t.id}
                          className="workbench-board-card is-task"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/task-id", t.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDragTaskId(t.id);
                          }}
                          onDragEnd={() => setDragTaskId(null)}
                        >
                          <p className="title">{t.title}</p>
                          <div className="meta">
                            {(t.linked_record_ids ?? [])[0]
                              ? recordTitle(archiveMap, (t.linked_record_ids ?? [])[0]!)
                              : "No linked record"}
                          </div>
                          <div className="chips">
                            <span className="workbench-chip">
                              Status: {TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL] ?? t.status}
                            </span>
                            <span className="workbench-chip workbench-chip--pri-medium">
                              Priority:{" "}
                              {TASK_PRIORITY_LABEL[t.priority as keyof typeof TASK_PRIORITY_LABEL] ??
                                t.priority}
                            </span>
                          </div>
                        </article>
                      ))}
                      {!colTasks.length ? (
                        <div className="workbench-board-card workbench-board-card--empty" role="status">
                          <strong>Empty column</strong>
                          Drag a task card here or create a task for this stage.
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {view === "timeline" ? (
        <section className="workbench-panel workbench-pm-panel">
          <h2>Timeline</h2>
          {timelineRows.length ? (
            <ul className="workbench-list workbench-pm-timeline">
              {timelineRows.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <span className="workbench-pm-timeline-date">{row.date}</span>
                  <span className="workbench-pm-timeline-kind">{row.kind}</span>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="workbench-empty" role="status">
              <strong>No upcoming deadlines</strong>
              Add due dates to tasks or milestones to populate this timeline.
            </div>
          )}
        </section>
      ) : null}

      {view === "records" ? (
        <RecordsSection
          project={project}
          records={records}
          archiveMap={archiveMap}
          tasksByRecord={tasksByRecord}
        />
      ) : null}

      {view === "notes" ? (
        <NotesSection
          projectId={projectId}
          projectNotes={projectNotes}
          setProjectNotes={setProjectNotes}
          annotations={annotations}
          records={records}
          run={run}
          notesActionPending={isPending}
        />
      ) : null}

      <details className="workbench-pm-admin">
        <summary>Project settings &amp; administration</summary>
        <AdminForms
          project={project}
          readingLists={readingLists}
          collaborators={collaborators}
        />
      </details>
    </>
  );
}

function defaultVisible(): Record<TableCol, boolean> {
  return Object.fromEntries(TABLE_COLS.map((c) => [c.id, true])) as Record<TableCol, boolean>;
}

function FragmentRows(props: {
  groupKey: string;
  groupBy: string;
  rows: WorkbenchTaskRow[];
  projectId: string;
  archiveMap: Map<string, WorkbenchArchiveLite>;
  showCol: (c: TableCol) => boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  colSpan: number;
}) {
  const { groupKey, groupBy, rows, projectId, archiveMap, showCol, run, colSpan } = props;
  const label =
    groupBy === "workflow"
      ? PROJECT_RECORD_STATUS_LABEL[groupKey as ProjectRecordStatusId] ?? groupKey
      : groupKey;
  return (
    <>
      <tr className="workbench-pm-group-row">
        <td colSpan={colSpan}>
          <strong>{label}</strong>{" "}
          <span className="workbench-muted">
            {rows.length} task{rows.length === 1 ? "" : "s"}
          </span>
        </td>
      </tr>
      {rows.map((t) => (
        <TaskRow
          key={`${t.id}-${t.updated_at}`}
          t={t}
          projectId={projectId}
          archiveMap={archiveMap}
          showCol={showCol}
          run={run}
        />
      ))}
    </>
  );
}

function TaskRow(props: {
  t: WorkbenchTaskRow;
  projectId: string;
  archiveMap: Map<string, WorkbenchArchiveLite>;
  showCol: (c: TableCol) => boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const { t, projectId, archiveMap, showCol, run } = props;
  const linked = (t.linked_record_ids ?? [])[0] ?? "";
  const nNotes = notesLineCount(t.notes);
  const done = t.status === "done";

  return (
    <tr className="workbench-pm-row">
      {showCol("checkbox") ? (
        <td>
          <input
            type="checkbox"
            checked={done}
            aria-label={`Mark complete: ${t.title}`}
            onChange={(e) => {
              const next = e.target.checked;
              run(() =>
                patchWorkbenchTask({
                  projectId,
                  taskId: t.id,
                  patch: next
                    ? { status: "done", workflow_stage: "completed" }
                    : { status: "todo", workflow_stage: "to_review" },
                }),
              );
            }}
          />
        </td>
      ) : null}
      {showCol("title") ? (
        <td>
          <input
            className="workbench-pm-inline-input"
            defaultValue={t.title}
            aria-label="Task title"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== t.title) {
                run(() => patchWorkbenchTask({ projectId, taskId: t.id, patch: { title: v } }));
              }
            }}
          />
        </td>
      ) : null}
      {showCol("record") ? (
        <td>
          <select
            className="workbench-select workbench-pm-select"
            defaultValue={linked}
            aria-label="Linked archive record"
            onChange={(e) => {
              const v = e.target.value;
              run(() =>
                patchWorkbenchTask({
                  projectId,
                  taskId: t.id,
                  patch: { linked_record_ids: v ? [v] : [] },
                }),
              );
            }}
          >
            <option value="">— None —</option>
            {[...archiveMap.keys()].map((id) => (
              <option key={id} value={id}>
                {archiveMap.get(id)?.title ?? id}
              </option>
            ))}
          </select>
        </td>
      ) : null}
      {showCol("owner") ? (
        <td>
          <input
            className="workbench-pm-inline-input"
            defaultValue={t.owner_name ?? ""}
            aria-label="Owner"
            placeholder="Name"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (t.owner_name ?? "")) {
                run(() => patchWorkbenchTask({ projectId, taskId: t.id, patch: { owner_name: v || null } }));
              }
            }}
          />
        </td>
      ) : null}
      {showCol("status") ? (
        <td>
          <select
            className="workbench-select workbench-pm-select"
            defaultValue={t.status}
            aria-label="Status"
            onChange={(e) =>
              run(() =>
                patchWorkbenchTask({ projectId, taskId: t.id, patch: { status: e.target.value } }),
              )
            }
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </td>
      ) : null}
      {showCol("priority") ? (
        <td>
          <select
            className="workbench-select workbench-pm-select"
            defaultValue={t.priority}
            aria-label="Priority"
            onChange={(e) =>
              run(() =>
                patchWorkbenchTask({ projectId, taskId: t.id, patch: { priority: e.target.value } }),
              )
            }
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </td>
      ) : null}
      {showCol("due") ? (
        <td>
          <input
            type="date"
            className="workbench-input workbench-pm-date"
            defaultValue={t.due_date ?? ""}
            aria-label="Due date"
            onBlur={(e) => {
              const v = e.target.value || null;
              if (v !== (t.due_date ?? null)) {
                run(() =>
                  patchWorkbenchTask({
                    projectId,
                    taskId: t.id,
                    patch: { due_date: v },
                  }),
                );
              }
            }}
          />
        </td>
      ) : null}
      {showCol("review") ? (
        <td>
          <select
            className="workbench-select workbench-pm-select"
            defaultValue={t.review_type}
            aria-label="Review type"
            onChange={(e) =>
              run(() =>
                patchWorkbenchTask({
                  projectId,
                  taskId: t.id,
                  patch: { review_type: e.target.value },
                }),
              )
            }
          >
            {TASK_REVIEW_TYPES.map((r) => (
              <option key={r} value={r}>
                {TASK_REVIEW_TYPE_LABEL[r]}
              </option>
            ))}
          </select>
        </td>
      ) : null}
      {showCol("notes") ? (
        <td>
          <span className="workbench-pm-notes-count" aria-label={`Notes blocks: ${nNotes}`}>
            {nNotes}
          </span>
          <textarea
            className="workbench-textarea workbench-pm-notes"
            defaultValue={t.notes ?? ""}
            aria-label="Task notes"
            rows={2}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (t.notes ?? "")) {
                run(() => patchWorkbenchTask({ projectId, taskId: t.id, patch: { notes: v || null } }));
              }
            }}
          />
        </td>
      ) : null}
      {showCol("actions") ? (
        <td>
          <button
            type="button"
            className="workbench-btn workbench-btn-secondary workbench-pm-icon-btn"
            onClick={() => {
              if (window.confirm("Delete this task?")) {
                run(() => deleteWorkbenchTaskInline({ projectId, taskId: t.id }));
              }
            }}
          >
            Delete
          </button>
        </td>
      ) : null}
    </tr>
  );
}

function WorkbenchToolbar(props: {
  projectId: string;
  q: string;
  setQ: (v: string) => void;
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  reviewFilter: string;
  setReviewFilter: (v: string) => void;
  sortDue: "" | "asc" | "desc";
  setSortDue: (v: "" | "asc" | "desc") => void;
  groupBy: "workflow" | "status" | "review_type" | "owner_name";
  setGroupBy: (v: "workflow" | "status" | "review_type" | "owner_name") => void;
  visibleCols: Record<TableCol, boolean> | null;
  setVisibleCols: (v: Record<TableCol, boolean> | null) => void;
  owners: string[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const {
    projectId,
    q,
    setQ,
    ownerFilter,
    setOwnerFilter,
    statusFilter,
    setStatusFilter,
    reviewFilter,
    setReviewFilter,
    sortDue,
    setSortDue,
    groupBy,
    setGroupBy,
    visibleCols,
    setVisibleCols,
    owners,
    run,
  } = props;
  const [newOpen, setNewOpen] = useState(false);
  const [ntTitle, setNtTitle] = useState("");
  const [ntOwner, setNtOwner] = useState("");
  const [ntDue, setNtDue] = useState("");
  const [ntReview, setNtReview] = useState("general");
  const [ntPri, setNtPri] = useState("medium");
  const [ntRec, setNtRec] = useState("");

  const persistCols = (next: Record<TableCol, boolean>) => {
    setVisibleCols(next);
    try {
      localStorage.setItem(COL_STORAGE(projectId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="workbench-pm-toolbar">
      <div className="workbench-pm-toolbar-row">
        <button type="button" className="workbench-btn" onClick={() => setNewOpen((o) => !o)}>
          New task
        </button>
        <label className="workbench-pm-field">
          <span>Search</span>
          <input
            className="workbench-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
          />
        </label>
        <label className="workbench-pm-field">
          <span>Person</span>
          <select
            className="workbench-select"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="">All</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="workbench-pm-field">
          <span>Status</span>
          <select
            className="workbench-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="workbench-pm-field">
          <span>Review</span>
          <select
            className="workbench-select"
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
          >
            <option value="">All</option>
            {TASK_REVIEW_TYPES.map((r) => (
              <option key={r} value={r}>
                {TASK_REVIEW_TYPE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="workbench-pm-field">
          <span>Sort due</span>
          <select
            className="workbench-select"
            value={sortDue}
            onChange={(e) => setSortDue(e.target.value as "" | "asc" | "desc")}
          >
            <option value="">None</option>
            <option value="asc">Due ↑</option>
            <option value="desc">Due ↓</option>
          </select>
        </label>
        <label className="workbench-pm-field">
          <span>Group</span>
          <select
            className="workbench-select"
            value={groupBy}
            onChange={(e) =>
              setGroupBy(e.target.value as "workflow" | "status" | "review_type" | "owner_name")
            }
          >
            <option value="workflow">Workflow stage</option>
            <option value="status">Status</option>
            <option value="review_type">Review type</option>
            <option value="owner_name">Owner</option>
          </select>
        </label>
      </div>
      {newOpen ? (
        <div className="workbench-pm-new-task" role="region" aria-label="Create task">
          <input
            className="workbench-input"
            placeholder="Task title"
            value={ntTitle}
            onChange={(e) => setNtTitle(e.target.value)}
          />
          <input
            className="workbench-input"
            placeholder="Owner name"
            value={ntOwner}
            onChange={(e) => setNtOwner(e.target.value)}
          />
          <input
            type="date"
            className="workbench-input"
            value={ntDue}
            onChange={(e) => setNtDue(e.target.value)}
          />
          <select className="workbench-select" value={ntReview} onChange={(e) => setNtReview(e.target.value)}>
            {TASK_REVIEW_TYPES.map((r) => (
              <option key={r} value={r}>
                {TASK_REVIEW_TYPE_LABEL[r]}
              </option>
            ))}
          </select>
          <select className="workbench-select" value={ntPri} onChange={(e) => setNtPri(e.target.value)}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <input
            className="workbench-input"
            placeholder="Record ID (optional)"
            value={ntRec}
            onChange={(e) => setNtRec(e.target.value)}
          />
          <button
            type="button"
            className="workbench-btn"
            onClick={() => {
              const title = ntTitle.trim();
              if (!title) return;
              run(() =>
                createWorkbenchTaskInline({
                  projectId,
                  title,
                  owner_name: ntOwner.trim() || null,
                  due_date: ntDue || null,
                  review_type: ntReview,
                  priority: ntPri,
                  linked_record_ids: ntRec.trim() ? [ntRec.trim()] : [],
                }),
              );
              setNtTitle("");
              setNtOwner("");
              setNtDue("");
              setNtRec("");
              setNewOpen(false);
            }}
          >
            Create
          </button>
        </div>
      ) : null}
      <details className="workbench-pm-columns">
        <summary>Columns</summary>
        <div className="workbench-pm-column-toggles">
          {TABLE_COLS.filter((c) => c.id !== "actions").map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={visibleCols?.[c.id] !== false}
                onChange={(e) => {
                  const base = visibleCols ?? defaultVisible();
                  persistCols({ ...base, [c.id]: e.target.checked });
                }}
              />{" "}
              {c.label || c.id}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

function RecordsSection(props: {
  project: WorkbenchProjectRow;
  records: WorkbenchProjectRecordRow[];
  archiveMap: Map<string, WorkbenchArchiveLite>;
  tasksByRecord: Map<string, WorkbenchTaskRow[]>;
}) {
  const { project, records, archiveMap, tasksByRecord } = props;
  return (
    <section className="workbench-panel workbench-pm-panel">
      <h2>Linked records</h2>
      <div className="workbench-pm-table-scroll">
        <table className="workbench-meta-table workbench-pm-records">
          <thead>
            <tr>
              <th>Title</th>
              <th>Creator</th>
              <th>Source</th>
              <th>Rights</th>
              <th>Access</th>
              <th>Review</th>
              <th>Linked tasks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const ar = archiveMap.get(r.record_id);
              const snap = ar?.snapshot ?? snapshotRecordRights(undefined);
              const href = getRecordHref({
                record_id: r.record_id,
                id: ar?.id,
                source_url: snap.sourceUrl,
              });
              const linkedTs = tasksByRecord.get(r.record_id) ?? [];
              return (
                <tr key={r.id}>
                  <td>
                    <div className="workbench-pm-rec-title">{ar?.title ?? r.record_id}</div>
                    {href ? (
                      <a
                        className="workbench-link"
                        href={href}
                        {...(isExternalHref(href) ? { target: "_blank", rel: "noreferrer" } : {})}
                      >
                        Open record
                      </a>
                    ) : null}
                  </td>
                  <td>{ar?.creator ?? "—"}</td>
                  <td>{ar?.source ?? "—"}</td>
                  <td>{snap.rightsStatus || "—"}</td>
                  <td>{snap.accessType || "—"}</td>
                  <td>{snap.verificationStatus || "—"}</td>
                  <td>
                    {linkedTs.length
                      ? linkedTs.map((t) => (
                          <div key={t.id} className="workbench-pm-linked-task">
                            {t.title}
                          </div>
                        ))
                      : "—"}
                  </td>
                  <td>
                    <form action={updateProjectRecord} className="workbench-pm-mini-form">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <select className="workbench-select" name="status" defaultValue={r.status}>
                        {Object.entries(PROJECT_RECORD_STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <PendingSubmitButton
                        className="workbench-btn workbench-btn-secondary"
                        pendingLabel="Updating…"
                      >
                        Move
                      </PendingSubmitButton>
                    </form>
                    <form action={removeProjectRecord} className="workbench-pm-mini-form">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="confirm" value="yes" />
                      <PendingSubmitButton
                        className="workbench-btn workbench-btn-secondary"
                        pendingLabel="Removing…"
                      >
                        Remove
                      </PendingSubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!records.length ? (
        <div className="workbench-empty" role="status">
          <strong>No linked records yet</strong>
          Import a reading list or add records from the archive.
        </div>
      ) : null}
    </section>
  );
}

function NotesSection(props: {
  projectId: string;
  projectNotes: string;
  setProjectNotes: (v: string) => void;
  annotations: WorkbenchAnnotationRow[];
  records: WorkbenchProjectRecordRow[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  notesActionPending: boolean;
}) {
  const { projectId, projectNotes, setProjectNotes, annotations, records, run, notesActionPending } = props;
  return (
    <section className="workbench-panel workbench-pm-panel">
      <h2>Project notes</h2>
      <textarea
        className="workbench-textarea"
        rows={5}
        value={projectNotes}
        onChange={(e) => setProjectNotes(e.target.value)}
        aria-label="Project-level notes"
      />
      <button
        type="button"
        className="workbench-btn workbench-btn-secondary"
        disabled={notesActionPending}
        aria-busy={notesActionPending}
        onClick={() =>
          run(() => saveWorkbenchProjectNotes({ projectId, notes: projectNotes }))
        }
      >
        {notesActionPending ? "Saving…" : "Save project notes"}
      </button>

      <h3 className="workbench-pm-subh">Record annotations</h3>
      <ul className="workbench-list">
        {annotations.slice(0, 40).map((a) => (
          <li key={a.id}>
            <div>{a.note}</div>
            <div className="workbench-muted">
              {a.record_id}
              {(a.tags ?? []).length ? ` · ${(a.tags ?? []).join(", ")}` : ""}
            </div>
          </li>
        ))}
      </ul>
      <form action={createWorkbenchAnnotation} className="workbench-form-grid">
        <input type="hidden" name="project_id" value={projectId} />
        <label>
          <span>Record</span>
          <select className="workbench-select" name="record_id" required defaultValue="">
            <option value="" disabled>
              Choose linked record
            </option>
            {records.map((r) => (
              <option key={r.id} value={r.record_id}>
                {r.record_id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Note</span>
          <textarea className="workbench-textarea" name="note" rows={3} required />
        </label>
        <label>
          <span>Tags</span>
          <input className="workbench-input" name="tags" placeholder="Theory, Citation" />
        </label>
        <PendingSubmitButton
          className="workbench-btn workbench-btn-secondary"
          pendingLabel="Adding…"
        >
          Add annotation
        </PendingSubmitButton>
      </form>
    </section>
  );
}

function AdminForms(props: {
  project: WorkbenchProjectRow;
  readingLists: { id: string; title: string }[];
  collaborators: { id: string; invited_email: string | null; user_id: string | null; role: string }[];
}) {
  const { project, readingLists, collaborators } = props;
  return (
    <div className="workbench-pm-admin-grid">
      <section className="workbench-panel">
        <h2>Settings</h2>
        <form action={updateWorkbenchProject} className="workbench-form-grid">
          <input type="hidden" name="project_id" value={project.id} />
          <label>
            <span>Title</span>
            <input className="workbench-input" name="title" defaultValue={project.title} />
          </label>
          <label>
            <span>Description</span>
            <textarea className="workbench-textarea" name="description" rows={3} defaultValue={project.description ?? ""} />
          </label>
          <label>
            <span>Deadline</span>
            <input className="workbench-input" type="date" name="deadline" defaultValue={project.deadline ?? ""} />
          </label>
          <label>
            <span>Status</span>
            <select className="workbench-select" name="status" defaultValue={project.status}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>
            <span>Visibility</span>
            <select className="workbench-select" name="visibility" defaultValue={project.visibility}>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label>
            <span>Project notes (also on Notes tab)</span>
            <textarea className="workbench-textarea" name="project_notes" rows={3} defaultValue={project.notes ?? ""} />
          </label>
          <label>
            <input type="checkbox" name="is_curated_public" defaultChecked={project.is_curated_public} /> Curated public intent
          </label>
          <PendingSubmitButton
            className="workbench-btn workbench-btn-secondary"
            pendingLabel="Saving…"
          >
            Save settings
          </PendingSubmitButton>
        </form>
      </section>
      <section className="workbench-panel">
        <h2>Import reading list</h2>
        <form action={importReadingListToProject} className="workbench-form-grid">
          <input type="hidden" name="project_id" value={project.id} />
          <label>
            <span>Reading list</span>
            <select className="workbench-select" name="reading_list_id" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {readingLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmitButton
            className="workbench-btn workbench-btn-secondary"
            pendingLabel="Importing…"
          >
            Import
          </PendingSubmitButton>
        </form>
      </section>
      <section className="workbench-panel">
        <h2>Collaborators</h2>
        <form action={inviteWorkbenchCollaborator} className="workbench-form-grid">
          <input type="hidden" name="project_id" value={project.id} />
          <label>
            <span>Email</span>
            <input className="workbench-input" type="email" name="invited_email" required />
          </label>
          <label>
            <span>Role</span>
            <select className="workbench-select" name="role" defaultValue="viewer">
              <option value="editor">Editor</option>
              <option value="reviewer">Reviewer</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <PendingSubmitButton
            className="workbench-btn workbench-btn-secondary"
            pendingLabel="Sending…"
          >
            Invite
          </PendingSubmitButton>
        </form>
        <ul className="workbench-list">
          {collaborators.map((c) => (
            <li key={c.id}>
              {c.invited_email ?? c.user_id ?? "—"} · {c.role}
            </li>
          ))}
        </ul>
      </section>
      <section className="workbench-panel">
        <h2>Exports</h2>
        <div className="workbench-pm-export-row">
          <a className="workbench-btn workbench-btn-secondary" data-no-loader="true" href={`/api/workbench/export?projectId=${project.id}&format=txt`}>
            Citations
          </a>
          <a className="workbench-btn workbench-btn-secondary" data-no-loader="true" href={`/api/workbench/export?projectId=${project.id}&format=md`}>
            Markdown
          </a>
          <a className="workbench-btn workbench-btn-secondary" data-no-loader="true" href={`/api/workbench/export?projectId=${project.id}&format=csv`}>
            CSV
          </a>
          <a className="workbench-btn workbench-btn-secondary" data-no-loader="true" href={`/api/workbench/export?projectId=${project.id}&format=json`}>
            JSON
          </a>
        </div>
      </section>
    </div>
  );
}
