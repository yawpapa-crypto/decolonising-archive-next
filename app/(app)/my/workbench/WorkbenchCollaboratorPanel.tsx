"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkbenchCollaboratorRow } from "@/lib/workbench-data";
import {
  inviteWorkbenchCollaborator,
  removeWorkbenchCollaborator,
  updateWorkbenchCollaboratorRole,
} from "@/lib/workbench-collaborator-actions";

type Props = {
  projectId: string;
  collaborators: WorkbenchCollaboratorRow[];
  canManage: boolean;
  compact?: boolean;
  onCollaboratorsChange?: (rows: WorkbenchCollaboratorRow[]) => void;
};

function displayEmail(row: WorkbenchCollaboratorRow) {
  return row.invited_email || row.user_id || "—";
}

function displayStatus(row: WorkbenchCollaboratorRow) {
  if (row.status === "removed") return "removed";
  if (row.user_id || row.status === "accepted") return "accepted";
  return row.status || "pending";
}

export default function WorkbenchCollaboratorPanel({
  projectId,
  collaborators: initialCollaborators,
  canManage,
  compact = false,
  onCollaboratorsChange,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialCollaborators);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const visibleRows = useMemo(
    () => rows.filter((row) => row.project_id === projectId && displayStatus(row) !== "removed"),
    [rows, projectId],
  );

  function syncRows(next: WorkbenchCollaboratorRow[]) {
    setRows(next);
    onCollaboratorsChange?.(next);
  }

  function invite() {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await inviteWorkbenchCollaborator({ projectId, email, role });
      if (!result.ok) {
        setError(result.error || "Could not invite collaborator.");
        return;
      }
      if (result.collaborator) {
        syncRows([...rows.filter((r) => r.id !== result.collaborator!.id), result.collaborator]);
      }
      setEmail("");
      setNotice("Collaborator invited.");
      router.refresh();
    });
  }

  function remove(collaboratorId: string) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await removeWorkbenchCollaborator({ projectId, collaboratorId });
      if (!result.ok) {
        setError(result.error || "Could not remove collaborator.");
        return;
      }
      syncRows(rows.filter((row) => row.id !== collaboratorId));
      setNotice("Collaborator removed.");
      router.refresh();
    });
  }

  function changeRole(collaboratorId: string, nextRole: string) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await updateWorkbenchCollaboratorRole({
        projectId,
        collaboratorId,
        role: nextRole,
      });
      if (!result.ok) {
        setError(result.error || "Could not update role.");
        return;
      }
      if (result.collaborator) {
        syncRows(rows.map((row) => (row.id === collaboratorId ? result.collaborator! : row)));
      }
      setNotice("Role updated.");
      router.refresh();
    });
  }

  return (
    <div className={compact ? "workbench-collab-panel workbench-collab-panel--compact workbench-collab-panel--fixed" : "workbench-collab-panel workbench-collab-panel--fixed"}>
      {notice ? (
        <p className="workbench-collab-notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="workbench-collab-error" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <form
          className="workbench-collab-form"
          onSubmit={(e) => {
            e.preventDefault();
            invite();
          }}
        >
          <label>
            <span>Email</span>
            <input
              className="workbench-input workbench-collab-email-input"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={isPending}
            />
          </label>
          <label>
            <span>Role</span>
            <select
              className="workbench-select workbench-collab-role-select"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isPending}
            >
              <option value="viewer">Viewer</option>
              <option value="reviewer">Reviewer</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          <button
            type="submit"
            className="workbench-button workbench-button-primary workbench-collab-invite"
            disabled={isPending}
          >
            {isPending ? "Inviting…" : "Invite"}
          </button>
        </form>
      ) : (
        <p className="workbench-collab-help">Only the project owner or an editor can invite collaborators.</p>
      )}

      {visibleRows.length ? (
        <ul className="workbench-collab-list">
          {visibleRows.map((row) => (
            <li key={row.id} className="workbench-collab-row">
              <div className="workbench-collab-row__main">
                <strong>{displayEmail(row)}</strong>
                <span className={`workbench-collab-status workbench-collab-status--${displayStatus(row)}`}>
                  {displayStatus(row)}
                </span>
              </div>
              <div className="workbench-collab-actions">
                {canManage ? (
                  <>
                    <select
                      className="workbench-select workbench-collab-role-select"
                      value={row.role}
                      onChange={(e) => changeRole(row.id, e.target.value)}
                      disabled={isPending}
                      aria-label={`Role for ${displayEmail(row)}`}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="button"
                      className="workbench-button workbench-button-secondary workbench-collab-remove"
                      onClick={() => remove(row.id)}
                      disabled={isPending}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="workbench-collab-role">{row.role}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="workbench-collab-empty">
          <strong>No collaborators yet.</strong>
          <span>Invite collaborators to view, review, or edit this project.</span>
        </div>
      )}
    </div>
  );
}
