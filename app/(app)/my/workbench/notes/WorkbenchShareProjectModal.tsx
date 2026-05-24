"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { WorkbenchCollaboratorRow } from "@/lib/workbench-data";
import type { WorkbenchProjectAccessRole } from "@/lib/workbench-collaboration";
import {
  inviteWorkbenchCollaborator,
  listWorkbenchProjectCollaborators,
  removeWorkbenchCollaborator,
  updateWorkbenchCollaboratorRole,
} from "@/lib/workbench-collaborator-actions";
import {
  WORKBENCH_MAX_COLLABORATORS,
  countsTowardCollaboratorLimit,
  displayCollaboratorStatus,
  displayCollaboratorStatusLabel,
  workbenchInviteUrl,
} from "@/lib/workbench-collaboration";
import { createClient } from "@/src/lib/supabase/client";
import type { WorkbenchProjectActivityRow } from "@/lib/workbench-project-collaboration";
import {
  WORKBENCH_NOTE_EXPORT_OPTIONS,
  type WorkbenchNoteExportFormat,
} from "@/lib/workbench-note-export";

type ShareModalTab = "share" | "activity" | "export";

type Props = {
  open: boolean;
  projectId: string | null;
  projectTitle: string;
  ownerId: string | null;
  currentUserId: string | null;
  accessRole?: WorkbenchProjectAccessRole;
  noteTitle?: string | null;
  canExportNote?: boolean;
  onExportNote?: (format: WorkbenchNoteExportFormat) => void;
  onOpenSettings?: () => void;
  onClose: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function displayEmail(row: WorkbenchCollaboratorRow) {
  return row.invited_email || row.user_id || "—";
}

function roleLabel(role: string) {
  if (role === "editor") return "Editor";
  if (role === "owner") return "Owner";
  return "Viewer";
}

function normalizeInviteEmail(value: string) {
  return value.trim().toLowerCase();
}

export function WorkbenchShareProjectModal({
  open,
  projectId,
  projectTitle,
  ownerId,
  currentUserId,
  accessRole = "none",
  noteTitle,
  canExportNote = false,
  onExportNote,
  onOpenSettings,
  onClose,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [collaborators, setCollaborators] = useState<WorkbenchCollaboratorRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ShareModalTab>("share");
  const [activity, setActivity] = useState<WorkbenchProjectActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("workbench-share-dialog-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("workbench-share-dialog-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setTab(projectId ? "share" : canExportNote && onExportNote ? "export" : "share");
    setNotice("");
    setError("");
    if (!projectId) {
      setCollaborators([]);
      setCanManage(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    void listWorkbenchProjectCollaborators(projectId).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error || "Could not load collaborators.");
        return;
      }
      setCollaborators(result.collaborators);
      setCanManage(result.canManage);
    });
  }, [open, projectId, canExportNote, onExportNote]);

  useEffect(() => {
    if (!open || tab !== "activity" || !projectId) return;
    setActivityLoading(true);
    const supabase = createClient();
    void supabase
      .from("workbench_project_activity")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error: activityError }) => {
        setActivityLoading(false);
        if (activityError) return;
        setActivity((data ?? []) as WorkbenchProjectActivityRow[]);
      });
  }, [open, tab, projectId]);

  if (!open || !mounted) return null;

  const resolvedProjectId = projectId;
  const ownerLabel = ownerId && ownerId === currentUserId ? "You" : "Project owner";
  const isViewer = accessRole === "viewer";
  const activeCollaboratorCount = collaborators.filter((row) =>
    countsTowardCollaboratorLimit(displayCollaboratorStatus(row)),
  ).length;
  const atCollaboratorLimit = activeCollaboratorCount >= WORKBENCH_MAX_COLLABORATORS;
  const canInvite = Boolean(resolvedProjectId && canManage && !isViewer && !atCollaboratorLimit);
  const showExportTab = Boolean(canExportNote && onExportNote);
  const exportNoteLabel = noteTitle?.trim() || "Current note";

  function exportNote(format: WorkbenchNoteExportFormat) {
    if (!onExportNote || !canExportNote) return;
    onExportNote(format);
    const option = WORKBENCH_NOTE_EXPORT_OPTIONS.find((row) => row.id === format);
    setNotice(
      format === "pdf"
        ? "Print dialog opened — choose Save as PDF to download."
        : format === "jpeg"
          ? "JPEG export started — check your downloads."
          : `Downloading ${option?.label ?? format} export…`,
    );
    setError("");
  }

  function invite(event: FormEvent) {
    event.preventDefault();
    if (!resolvedProjectId || !canInvite) return;

    const normalized = normalizeInviteEmail(email);
    if (!normalized) {
      setError("Enter an email address.");
      return;
    }
    if (!EMAIL_RE.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }

    const duplicate = collaborators.some(
      (row) =>
        normalizeInviteEmail(row.invited_email || "") === normalized &&
        displayCollaboratorStatus(row) !== "removed",
    );
    if (duplicate) {
      setError("This email is already invited or on the project.");
      return;
    }

    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await inviteWorkbenchCollaborator({
        projectId: resolvedProjectId,
        email: normalized,
        role,
      });
      if (!result.ok) {
        setError(result.error || "Could not send invite.");
        return;
      }
      if (result.collaborator) {
        setCollaborators((rows) => [
          ...rows.filter((r) => r.id !== result.collaborator!.id),
          result.collaborator!,
        ]);
      }
      setEmail("");
      setNotice(
        "Invitation saved. Email delivery is not configured yet — share the project link with your collaborator.",
      );
      router.refresh();
    });
  }

  function remove(collaboratorId: string) {
    if (!resolvedProjectId || !canManage) return;
    startTransition(async () => {
      const result = await removeWorkbenchCollaborator({
        projectId: resolvedProjectId,
        collaboratorId,
      });
      if (!result.ok) {
        setError(result.error || "Could not remove collaborator.");
        return;
      }
      setCollaborators((rows) => rows.filter((row) => row.id !== collaboratorId));
      setNotice("Collaborator removed.");
      router.refresh();
    });
  }

  function changeRole(collaboratorId: string, nextRole: "editor" | "viewer") {
    if (!resolvedProjectId || !canManage) return;
    startTransition(async () => {
      const result = await updateWorkbenchCollaboratorRole({
        projectId: resolvedProjectId,
        collaboratorId,
        role: nextRole,
      });
      if (!result.ok) {
        setError(result.error || "Could not update role.");
        return;
      }
      if (result.collaborator) {
        setCollaborators((rows) =>
          rows.map((row) => (row.id === collaboratorId ? result.collaborator! : row)),
        );
      }
      router.refresh();
    });
  }

  const dialog = (
    <div
      className="workbench-share-dialog"
      role="presentation"
      onClick={onClose}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="workbench-share-dialog-backdrop" aria-hidden />
      <div
        className="workbench-share-dialog-card workbench-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workbench-share-modal-title"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workbench-share-modal__head">
          <div>
            <p className="workbench-share-modal__eyebrow">Share & export</p>
            <h2 id="workbench-share-modal-title">Share & export</h2>
            <p className="workbench-share-modal__lead">
              Invite collaborators or download this note in common formats.
            </p>
            {projectTitle ? (
              <p className="workbench-share-modal__project-name">{projectTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="workbench-share-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        {resolvedProjectId || showExportTab ? (
          <div className="workbench-share-modal__tabs" role="tablist">
            {resolvedProjectId ? (
              <>
                <button
                  type="button"
                  role="tab"
                  className={tab === "share" ? "is-active" : ""}
                  aria-selected={tab === "share"}
                  onClick={() => setTab("share")}
                >
                  Share
                </button>
                <button
                  type="button"
                  role="tab"
                  className={tab === "activity" ? "is-active" : ""}
                  aria-selected={tab === "activity"}
                  onClick={() => setTab("activity")}
                >
                  Activity
                </button>
              </>
            ) : null}
            {showExportTab ? (
              <button
                type="button"
                role="tab"
                className={tab === "export" ? "is-active" : ""}
                aria-selected={tab === "export"}
                onClick={() => setTab("export")}
              >
                Export
              </button>
            ) : null}
            {canManage && onOpenSettings ? (
              <button type="button" className="workbench-share-modal__settings-link" onClick={onOpenSettings}>
                Project settings
              </button>
            ) : null}
          </div>
        ) : null}

        {!resolvedProjectId && tab === "share" ? (
          <p className="workbench-share-modal__error" role="alert">
            This workbench is not attached to a shared project yet. Create or save it as a project
            before inviting collaborators. You can still export the note from the Export tab.
          </p>
        ) : null}

        {notice ? (
          <p className="workbench-share-modal__notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="workbench-share-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        {resolvedProjectId && tab === "activity" ? (
          <section className="workbench-activity-list" aria-busy={activityLoading}>
            {activityLoading ? <p className="workbench-share-modal__muted">Loading activity…</p> : null}
            {!activityLoading && activity.length === 0 ? (
              <p className="workbench-share-modal__muted">No activity yet.</p>
            ) : null}
            <ul>
              {activity.map((row) => (
                <li key={row.id}>
                  <span>{row.summary}</span>
                  <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showExportTab && tab === "export" ? (
          <section className="workbench-share-modal__export" aria-labelledby="workbench-share-export-heading">
            <h3 id="workbench-share-export-heading">Export note</h3>
            <p className="workbench-share-modal__muted workbench-share-modal__export-lead">
              Download <strong>{exportNoteLabel}</strong> in your preferred format.
            </p>
            <ul className="workbench-share-modal__export-grid">
              {WORKBENCH_NOTE_EXPORT_OPTIONS.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className="workbench-share-modal__export-option"
                    onClick={() => exportNote(option.id)}
                  >
                    <span className="workbench-share-modal__export-option-label">{option.label}</span>
                    <span className="workbench-share-modal__export-option-ext">{option.extension}</span>
                    <span className="workbench-share-modal__export-option-desc">{option.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {resolvedProjectId && tab === "share" ? (
          <>
            <div className="workbench-share-modal__owner">
              <span className="workbench-share-modal__owner-badge workbench-share-role-badge">
                Owner
              </span>
              <strong>{ownerLabel}</strong>
            </div>

            {atCollaboratorLimit ? (
              <p className="workbench-share-modal__error" role="status">
                Collaborator limit reached. This project supports up to {WORKBENCH_MAX_COLLABORATORS}{" "}
                collaborators for now.
              </p>
            ) : null}

            {canInvite ? (
              <form className="workbench-share-modal__form" onSubmit={invite}>
                <label className="workbench-share-modal__field workbench-share-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={isPending}
                    autoComplete="email"
                  />
                </label>
                <label className="workbench-share-modal__field workbench-share-field workbench-share-modal__field--role">
                  <span>Role</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as "editor" | "viewer")}
                    disabled={isPending}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </label>
                <button type="submit" className="workbench-share-modal__submit" disabled={isPending}>
                  {isPending ? "Sending…" : "Send invite"}
                </button>
              </form>
            ) : !atCollaboratorLimit ? (
              <p className="workbench-share-modal__help">
                {isViewer
                  ? "You have view-only access. Only the project owner can invite collaborators."
                  : "Only the project owner can invite or manage collaborators."}
              </p>
            ) : null}

            <section className="workbench-share-modal__list workbench-share-member-list" aria-busy={loading}>
              <h3>People on this project</h3>
              {loading ? <p className="workbench-share-modal__muted">Loading…</p> : null}
              {!loading && collaborators.length === 0 ? (
                <p className="workbench-share-modal__muted">No collaborators yet.</p>
              ) : null}
              <ul>
                {collaborators.map((row) => {
                  const status = displayCollaboratorStatus(row);
                  return (
                    <li key={row.id} className="workbench-share-modal__member">
                      <div>
                        <strong>{displayEmail(row)}</strong>
                        <span className="workbench-share-modal__member-meta">
                          <span
                            className={`workbench-share-modal__role workbench-share-role-badge is-${row.role}`}
                          >
                            {roleLabel(row.role)}
                          </span>
                          <span
                            className={`workbench-share-modal__status workbench-share-status-badge is-${status}`}
                          >
                            {displayCollaboratorStatusLabel(status)}
                          </span>
                        </span>
                      </div>
                      <div className="workbench-share-modal__member-actions">
                        {status === "invited" ? (
                          <CopyInviteLinkButton
                            collaboratorId={row.id}
                            onCopied={() => setCopyNotice("Invite link copied.")}
                            onError={(message) => setCopyNotice(message)}
                          />
                        ) : null}
                        {canManage ? (
                          <>
                            <select
                              value={row.role === "editor" ? "editor" : "viewer"}
                              onChange={(event) =>
                                changeRole(row.id, event.target.value as "editor" | "viewer")
                              }
                              disabled={isPending}
                              aria-label={`Role for ${displayEmail(row)}`}
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              type="button"
                              className="workbench-share-modal__remove"
                              onClick={() => remove(row.id)}
                              disabled={isPending}
                            >
                              Remove
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {copyNotice ? <p className="workbench-share-modal__notice">{copyNotice}</p> : null}
            <p className="workbench-share-modal__footnote">
              Up to {WORKBENCH_MAX_COLLABORATORS} collaborators per project (owner not counted).
              Saves sync on refresh for now.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

function CopyInviteLinkButton({
  collaboratorId,
  onCopied,
  onError,
}: {
  collaboratorId: string;
  onCopied: () => void;
  onError: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = workbenchInviteUrl(collaboratorId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onError("Could not copy invite link. Copy the URL from the address bar after opening the invite page.");
    }
  }

  return (
    <button type="button" className="workbench-share-copy-link" onClick={() => void copy()}>
      {copied ? "Copied" : "Copy invite link"}
    </button>
  );
}
