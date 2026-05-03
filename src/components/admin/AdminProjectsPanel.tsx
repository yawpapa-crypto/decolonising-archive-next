"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminProject,
  deleteAdminProject,
  fetchAdminProjects,
  updateAdminProject,
  type AdminProject,
  type AdminProjectStatus,
} from "@/app/(admin)/admin/workspace-tools/actions";

const STATUSES: AdminProjectStatus[] = ["active", "paused", "completed", "archived"];

function projectDirty(a: AdminProject, b: AdminProject) {
  return (
    a.title !== b.title ||
    (a.description ?? "") !== (b.description ?? "") ||
    a.status !== b.status ||
    (a.owner ?? "") !== (b.owner ?? "") ||
    (a.due_date ?? "") !== (b.due_date ?? "")
  );
}

export default function AdminProjectsPanel() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, AdminProject>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<AdminProjectStatus>("active");
  const [newOwner, setNewOwner] = useState("");
  const [newDue, setNewDue] = useState("");

  const reload = useCallback(async () => {
    setNotice(null);
    const res = await fetchAdminProjects();
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      setProjects([]);
      setSnapshots({});
      return;
    }
    setProjects(res.data);
    setSnapshots(Object.fromEntries(res.data.map((p) => [p.id, { ...p }])));
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

  const dirtyMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const p of projects) {
      const s = snapshots[p.id];
      m[p.id] = s ? projectDirty(p, s) : false;
    }
    return m;
  }, [projects, snapshots]);

  const updateLocal = useCallback((id: string, patch: Partial<AdminProject>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const addProject = useCallback(async () => {
    const t = newTitle.trim();
    if (!t) return;
    setBusyId("__new__");
    setNotice(null);
    const res = await createAdminProject({
      title: t,
      description: newDescription.trim() || null,
      status: newStatus,
      owner: newOwner.trim() || null,
      due_date: newDue.trim() || null,
    });
    setBusyId(null);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewStatus("active");
    setNewOwner("");
    setNewDue("");
    await reload();
    setNotice({ type: "ok", text: "Project created." });
  }, [newTitle, newDescription, newStatus, newOwner, newDue, reload]);

  const saveProject = useCallback(
    async (id: string) => {
      const p = projects.find((x) => x.id === id);
      if (!p) return;
      setBusyId(id);
      setNotice(null);
      const res = await updateAdminProject(id, {
        title: p.title,
        description: p.description,
        status: p.status,
        owner: p.owner,
        due_date: p.due_date,
      });
      setBusyId(null);
      if (!res.ok) {
        setNotice({ type: "err", text: res.error });
        return;
      }
      setSnapshots((prev) => ({ ...prev, [id]: { ...res.data } }));
      setProjects((prev) => prev.map((x) => (x.id === id ? res.data : x)));
      setNotice({ type: "ok", text: "Project saved." });
    },
    [projects],
  );

  const discardProject = useCallback((id: string) => {
    const snap = snapshots[id];
    if (!snap) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...snap } : p)));
  }, [snapshots]);

  const removeProject = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this project? This cannot be undone.")) return;
      setBusyId(id);
      setNotice(null);
      const res = await deleteAdminProject(id);
      setBusyId(null);
      if (!res.ok) {
        setNotice({ type: "err", text: res.error });
        return;
      }
      await reload();
      setNotice({ type: "ok", text: "Project deleted." });
    },
    [reload],
  );

  if (loading) {
    return <p className="admin-muted">Loading projects…</p>;
  }

  return (
    <div className="admin-apps-placeholder admin-projects-panel">
      <p className="admin-apps-placeholder-title">Projects</p>
      <p className="admin-muted">
        Track editorial initiatives on the dashboard. Changes are saved when you choose Save.
      </p>

      {notice ? (
        <p
          className={notice.type === "err" ? "admin-flash admin-flash-error" : "admin-flash admin-flash-ok"}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      <div className="admin-projects-form dashboard-toolbar admin-projects-form-extended">
        <input
          type="text"
          className="admin-chat-input admin-projects-title-input"
          placeholder="Project title"
          value={newTitle}
          disabled={busyId !== null}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addProject())}
        />
        <textarea
          className="admin-projects-desc-input"
          placeholder="Description (optional)"
          value={newDescription}
          disabled={busyId !== null}
          onChange={(e) => setNewDescription(e.target.value)}
          rows={2}
          aria-label="New project description"
        />
        <input
          type="text"
          className="admin-chat-input admin-projects-owner-input"
          placeholder="Owner (optional)"
          value={newOwner}
          disabled={busyId !== null}
          onChange={(e) => setNewOwner(e.target.value)}
        />
        <input
          type="date"
          className="admin-filter admin-projects-date-input"
          value={newDue}
          disabled={busyId !== null}
          onChange={(e) => setNewDue(e.target.value)}
          aria-label="Due date"
        />
        <select
          className="admin-filter"
          value={newStatus}
          disabled={busyId !== null}
          onChange={(e) => setNewStatus(e.target.value as AdminProjectStatus)}
          aria-label="Status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-button"
          disabled={busyId !== null}
          onClick={() => void addProject()}
        >
          Add project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="admin-muted admin-projects-empty">
          No projects yet. Create a project to track archive work.
        </p>
      ) : (
        <ul className="admin-apps-project-list">
          {projects.map((p) => {
            const dirty = dirtyMap[p.id];
            const busy = busyId === p.id;
            return (
              <li key={p.id}>
                <div className="admin-project-row-head">
                  <span className={`admin-project-status-badge admin-project-status-${p.status}`}>
                    {p.status}
                  </span>
                  <button
                    type="button"
                    className="admin-small-button admin-danger-button"
                    disabled={busyId !== null}
                    onClick={() => void removeProject(p.id)}
                  >
                    Delete
                  </button>
                </div>
                <label className="admin-sr-only" htmlFor={`proj-title-${p.id}`}>
                  Title
                </label>
                <input
                  id={`proj-title-${p.id}`}
                  type="text"
                  className="admin-project-title-input"
                  value={p.title}
                  disabled={busy}
                  onChange={(e) => updateLocal(p.id, { title: e.target.value })}
                />
                <label className="admin-sr-only" htmlFor={`proj-desc-${p.id}`}>
                  Description
                </label>
                <textarea
                  id={`proj-desc-${p.id}`}
                  className="admin-projects-desc-input admin-project-body-input"
                  value={p.description ?? ""}
                  disabled={busy}
                  onChange={(e) => updateLocal(p.id, { description: e.target.value || null })}
                  placeholder="Description"
                  rows={3}
                />
                <div className="admin-project-row-meta admin-project-row-meta-grid">
                  <label className="admin-project-field">
                    <span className="admin-project-field-label">Owner</span>
                    <input
                      type="text"
                      className="admin-chat-input"
                      value={p.owner ?? ""}
                      disabled={busy}
                      onChange={(e) => updateLocal(p.id, { owner: e.target.value || null })}
                    />
                  </label>
                  <label className="admin-project-field">
                    <span className="admin-project-field-label">Due</span>
                    <input
                      type="date"
                      className="admin-filter"
                      value={p.due_date ?? ""}
                      disabled={busy}
                      onChange={(e) => updateLocal(p.id, { due_date: e.target.value || null })}
                    />
                  </label>
                  <label className="admin-project-field">
                    <span className="admin-project-field-label">Status</span>
                    <select
                      className="admin-filter admin-filter-compact"
                      value={p.status}
                      disabled={busy}
                      onChange={(e) =>
                        updateLocal(p.id, { status: e.target.value as AdminProjectStatus })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin-project-actions">
                  <button
                    type="button"
                    className="admin-button"
                    disabled={busy || !dirty}
                    onClick={() => void saveProject(p.id)}
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    disabled={busy || !dirty}
                    onClick={() => discardProject(p.id)}
                  >
                    Discard changes
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
