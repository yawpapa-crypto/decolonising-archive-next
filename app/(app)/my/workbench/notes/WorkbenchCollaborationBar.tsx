"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CircleHelp,
  Ellipsis,
  History,
  Kanban,
  LayoutGrid,
  MessageSquare,
  PanelRight,
  Settings2,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import type { WorkbenchNoteRow } from "@/lib/workbench-data";
import {
  listWorkbenchNoteVersions,
  restoreWorkbenchNoteVersion,
  addWorkbenchProjectComment,
} from "@/lib/workbench-project-collaboration-actions";
import {
  isCanvasLockActive,
  noteModeLabel,
  presenceColor,
  presenceInitials,
  type WorkbenchNoteVersionRow,
  type WorkbenchProjectActivityRow,
  type WorkbenchProjectCommentRow,
} from "@/lib/workbench-project-collaboration";
import type { CollaborationPeer } from "./useWorkbenchProjectCollaboration";

type Props = {
  peers: CollaborationPeer[];
  activities: WorkbenchProjectActivityRow[];
  remoteChangesPending: boolean;
  onApplyRemoteChanges: () => void;
  onDismissRemoteChanges: () => void;
  projectId: string | null;
  noteId: string | null;
  canEdit: boolean;
  canRestoreVersions: boolean;
  onVersionRestored: (note: WorkbenchNoteRow) => void;
  comments: WorkbenchProjectCommentRow[];
  onCommentsChange: () => void;
  onCommentsOpenChange?: (open: boolean) => void;
  currentUserId: string | null;
  peerNamesByUserId: Record<string, string | null>;
  onShareClick: () => void;
  shareOpen?: boolean;
  compact?: boolean;
  documentMoreActions?: {
    showSettings?: boolean;
    onOpenSettings?: () => void;
    onOpenHelp?: () => void;
    onModeChange?: (mode: "canvas" | "board") => void;
    inspectorOpen?: boolean;
    onToggleInspector?: () => void;
    extraMenuItems?: Array<{
      id: string;
      label: string;
      onClick: () => void;
      disabled?: boolean;
    }>;
  };
};

function activityActorLabel(
  row: WorkbenchProjectActivityRow,
  names: Record<string, string | null>,
  currentUserId: string | null,
): string {
  if (row.user_id === currentUserId) return "You";
  return names[row.user_id]?.trim() || "Collaborator";
}

export function WorkbenchCollaborationBar({
  peers,
  activities,
  remoteChangesPending,
  onApplyRemoteChanges,
  onDismissRemoteChanges,
  projectId,
  noteId,
  canEdit,
  canRestoreVersions,
  onVersionRestored,
  comments,
  onCommentsChange,
  onCommentsOpenChange,
  currentUserId,
  peerNamesByUserId,
  onShareClick,
  shareOpen = false,
  compact = false,
  documentMoreActions,
}: Props) {
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [versions, setVersions] = useState<WorkbenchNoteVersionRow[]>([]);
  const [versionError, setVersionError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [isPending, startTransition] = useTransition();
  const compactMoreRef = useRef<HTMLDivElement>(null);

  const recentActivities = useMemo(() => activities.slice(0, 5), [activities]);
  const hasSharedProject = Boolean(projectId);
  const shareButton = (
    <button
      type="button"
      className="workbench-notes-share-btn"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onShareClick();
      }}
      aria-haspopup="dialog"
      aria-expanded={shareOpen}
    >
      Share
    </button>
  );
  const compactShareButton = (
    <button
      type="button"
      className="workbench-document-taskbar-button workbench-document-taskbar-button--share"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onShareClick();
      }}
      aria-haspopup="dialog"
      aria-expanded={shareOpen}
      aria-label="Share"
      data-tooltip="Share"
    >
      <Share2 size={18} strokeWidth={1.75} aria-hidden />
    </button>
  );

  function loadVersions() {
    if (!noteId) return;
    setVersionError("");
    void listWorkbenchNoteVersions(noteId).then((result) => {
      if (!result.ok) {
        setVersionError(result.error || "Could not load versions.");
        return;
      }
      setVersions(result.versions ?? []);
    });
  }

  function restoreVersion(versionId: string) {
    if (!noteId || !canRestoreVersions) return;
    startTransition(async () => {
      const result = await restoreWorkbenchNoteVersion({ noteId, versionId });
      if (!result.ok) {
        setVersionError(result.error || "Could not restore version.");
        return;
      }
      setVersionsOpen(false);
      if (result.note) onVersionRestored(result.note);
    });
  }

  function submitComment() {
    if (!projectId || !commentBody.trim()) return;
    setCommentError("");
    startTransition(async () => {
      const result = await addWorkbenchProjectComment({
        projectId,
        noteId,
        body: commentBody,
        anchorType: "project",
      });
      if (!result.ok) {
        setCommentError(result.error || "Could not add comment.");
        return;
      }
      setCommentBody("");
      onCommentsChange();
    });
  }

  function setCommentsPanelOpen(open: boolean) {
    setCommentsOpen(open);
    if (compact) onCommentsOpenChange?.(open);
  }

  function toggleCommentsPanel() {
    setCommentsPanelOpen(!commentsOpen);
  }

  useEffect(() => {
    if (!compact || !moreOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!compactMoreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [compact, moreOpen]);

  useEffect(() => {
    if (!compact || !commentsOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setCommentsOpen(false);
      onCommentsOpenChange?.(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commentsOpen, compact, onCommentsOpenChange]);

  if (compact) {
    const presenceTip =
      peers.length === 0
        ? "Only you here"
        : `${peers.length} collaborator${peers.length === 1 ? "" : "s"} here`;

    return (
      <div className="workbench-document-taskbar-collaboration" role="group" aria-label="Collaboration">
        <div
          className="workbench-document-taskbar-presence"
          aria-label={presenceTip}
          data-tooltip={presenceTip}
        >
          {peers.length === 0 ? (
            <>
              <UserRound size={18} strokeWidth={1.75} aria-hidden />
              <span className="workbench-document-taskbar-presence__label">Only you here</span>
            </>
          ) : (
            peers.map((peer) => (
              <span
                key={peer.userId}
                className="workbench-collaboration-avatar"
                style={{ backgroundColor: presenceColor(peer.userId) }}
                aria-label={`${peer.displayName ?? "Collaborator"} — ${noteModeLabel(peer.noteMode)}`}
                data-tooltip={`${peer.displayName ?? "Collaborator"} · ${noteModeLabel(peer.noteMode)}`}
              >
                {presenceInitials(peer.displayName, peer.userId)}
              </span>
            ))
          )}
        </div>

        {hasSharedProject ? (
          <button
            type="button"
            className={`workbench-document-taskbar-button workbench-document-taskbar-comment-toggle${
              commentsOpen ? " is-active" : ""
            }`}
            onClick={() => {
              setVersionsOpen(false);
              toggleCommentsPanel();
            }}
            aria-expanded={commentsOpen}
            aria-label={comments.length ? `Comments (${comments.length})` : "Comments"}
            data-tooltip="Comments"
          >
            <MessageSquare size={18} strokeWidth={1.75} aria-hidden />
            {comments.length ? (
              <span className="workbench-document-taskbar-badge">{comments.length}</span>
            ) : null}
          </button>
        ) : null}

        {compactShareButton}

        <div className="workbench-document-taskbar-more" ref={compactMoreRef}>
          <button
            type="button"
            className={`workbench-document-taskbar-button${moreOpen ? " is-active" : ""}`}
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-label="More"
            data-tooltip="More"
          >
            <Ellipsis size={18} strokeWidth={1.75} aria-hidden />
          </button>
          {moreOpen ? (
            <div className="workbench-document-taskbar-menu" role="menu" aria-label="More document actions">
              {hasSharedProject ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    setVersionsOpen(false);
                    toggleCommentsPanel();
                  }}
                >
                  <MessageSquare size={16} strokeWidth={1.75} aria-hidden />
                  <span>Comments</span>
                </button>
              ) : null}
              {hasSharedProject && noteId && canRestoreVersions ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    setCommentsPanelOpen(false);
                    setVersionsOpen((open) => !open);
                    if (!versionsOpen) loadVersions();
                  }}
                >
                  <History size={16} strokeWidth={1.75} aria-hidden />
                  <span>Versions</span>
                </button>
              ) : null}
              {documentMoreActions?.extraMenuItems?.length ? (
                <>
                  <span className="workbench-document-taskbar-menu__label">Insert & tools</span>
                  {documentMoreActions.extraMenuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        setMoreOpen(false);
                        item.onClick();
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </>
              ) : null}
              {documentMoreActions?.showSettings && documentMoreActions.onOpenSettings ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    documentMoreActions.onOpenSettings?.();
                  }}
                >
                  <Settings2 size={16} strokeWidth={1.75} aria-hidden />
                  <span>Settings</span>
                </button>
              ) : null}
              {documentMoreActions?.onOpenHelp ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    documentMoreActions.onOpenHelp?.();
                  }}
                >
                  <CircleHelp size={16} strokeWidth={1.75} aria-hidden />
                  <span>Keyboard shortcuts</span>
                </button>
              ) : null}
              {documentMoreActions?.onToggleInspector ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    documentMoreActions.onToggleInspector?.();
                  }}
                >
                  <PanelRight size={16} strokeWidth={1.75} aria-hidden />
                  <span>{documentMoreActions.inspectorOpen ? "Close inspector" : "Open inspector"}</span>
                </button>
              ) : null}
              {documentMoreActions?.onModeChange ? (
                <>
                  <span className="workbench-document-taskbar-menu__label">View</span>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      documentMoreActions.onModeChange?.("canvas");
                    }}
                  >
                    <LayoutGrid size={16} strokeWidth={1.75} aria-hidden />
                    <span>Canvas</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      documentMoreActions.onModeChange?.("board");
                    }}
                  >
                    <Kanban size={16} strokeWidth={1.75} aria-hidden />
                    <span>Board</span>
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasSharedProject && remoteChangesPending ? (
          <div className="workbench-collaboration-banner is-taskbar-popover" role="status">
            <span>New changes are available. Review or reload before saving.</span>
            <div className="workbench-collaboration-banner__actions">
              <button type="button" className="workbench-button workbench-button-primary" onClick={onApplyRemoteChanges}>
                Load changes
              </button>
              <button type="button" className="workbench-button" onClick={onDismissRemoteChanges}>
                Keep mine
              </button>
            </div>
          </div>
        ) : null}

        {versionsOpen && noteId ? (
          <div className="workbench-collaboration-panel is-taskbar-popover">
            <h3>Version history</h3>
            {versionError ? <p className="workbench-collaboration-error">{versionError}</p> : null}
            {versions.length === 0 ? (
              <p className="workbench-collaboration-muted">No saved versions yet.</p>
            ) : (
              <ul className="workbench-collaboration-versions">
                {versions.map((version) => (
                  <li key={version.id}>
                    <span>
                      {new Date(version.created_at).toLocaleString()} · {version.title}
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => restoreVersion(version.id)}
                      >
                        Restore
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {commentsOpen ? (
          <aside
            className="workbench-collaboration-panel workbench-document-comments-rail is-taskbar-popover"
            aria-label="Document comments"
          >
            <header className="workbench-document-comments-rail__header">
              <div>
                <p className="workbench-document-comments-rail__eyebrow">Discussion</p>
                <h3>Comments</h3>
              </div>
              <button
                type="button"
                className="workbench-document-comments-rail__close"
                onClick={() => setCommentsPanelOpen(false)}
                aria-label="Close comments"
                data-tooltip="Close comments"
              >
                <X size={17} strokeWidth={1.75} aria-hidden />
              </button>
            </header>
            {commentError ? <p className="workbench-collaboration-error">{commentError}</p> : null}
            <ul className="workbench-collaboration-comments">
              {comments.length === 0 ? (
                <li className="workbench-collaboration-muted">No comments yet.</li>
              ) : (
                comments.map((comment) => (
                  <li key={comment.id}>
                    <p>{comment.body}</p>
                    <time dateTime={comment.created_at}>
                      {new Date(comment.created_at).toLocaleString()}
                    </time>
                  </li>
                ))
              )}
            </ul>
            {canEdit ? (
              <div className="workbench-collaboration-comment-form">
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Leave a note for the team…"
                  rows={2}
                />
                <button
                  type="button"
                  className="workbench-button workbench-button-primary"
                  disabled={isPending || !commentBody.trim()}
                  onClick={submitComment}
                >
                  Add comment
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="workbench-collaboration-bar"
      role="region"
      aria-label="Project collaboration"
    >
      <div className="workbench-collaboration-bar__share-row">
        {shareButton}
        {!hasSharedProject ? (
          <span className="workbench-collaboration-muted">
            Save this note to a project to invite collaborators.
          </span>
        ) : null}
      </div>

      {!hasSharedProject ? null : remoteChangesPending ? (
        <div className="workbench-collaboration-banner" role="status">
          <span>New changes are available. Review or reload before saving.</span>
          <div className="workbench-collaboration-banner__actions">
            <button type="button" className="workbench-button workbench-button-primary" onClick={onApplyRemoteChanges}>
              Load changes
            </button>
            <button type="button" className="workbench-button" onClick={onDismissRemoteChanges}>
              Keep mine
            </button>
          </div>
        </div>
      ) : null}

      {!hasSharedProject ? null : (
        <>
      <div className="workbench-collaboration-bar__row">
        <div className="workbench-collaboration-presence" aria-label="Active collaborators">
          {peers.length === 0 ? (
            <span className="workbench-collaboration-presence__solo">Only you here</span>
          ) : (
            peers.map((peer) => (
              <span
                key={peer.userId}
                className="workbench-collaboration-avatar"
                style={{ backgroundColor: presenceColor(peer.userId) }}
                title={`${peer.displayName ?? "Collaborator"} · ${noteModeLabel(peer.noteMode)}`}
              >
                {presenceInitials(peer.displayName, peer.userId)}
              </span>
            ))
          )}
        </div>

        {recentActivities.length ? (
          <ul className="workbench-collaboration-activity" aria-live="polite">
            {recentActivities.map((row) => (
              <li key={row.id}>
                <strong>{activityActorLabel(row, peerNamesByUserId, currentUserId)}</strong> {row.summary}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="workbench-collaboration-tools">
          {noteId && canRestoreVersions ? (
            <button
              type="button"
              className="workbench-collaboration-tool-btn"
              onClick={() => {
                setVersionsOpen((open) => !open);
                if (!versionsOpen) loadVersions();
              }}
              aria-expanded={versionsOpen}
            >
              Versions
            </button>
          ) : null}
          <button
            type="button"
            className="workbench-collaboration-tool-btn"
            onClick={() => setCommentsOpen((open) => !open)}
            aria-expanded={commentsOpen}
          >
            Comments{comments.length ? ` (${comments.length})` : ""}
          </button>
        </div>
      </div>

      {versionsOpen && noteId ? (
        <div className="workbench-collaboration-panel">
          <h3>Version history</h3>
          {versionError ? <p className="workbench-collaboration-error">{versionError}</p> : null}
          {versions.length === 0 ? (
            <p className="workbench-collaboration-muted">No saved versions yet.</p>
          ) : (
            <ul className="workbench-collaboration-versions">
              {versions.map((version) => (
                <li key={version.id}>
                  <span>
                    {new Date(version.created_at).toLocaleString()} · {version.title}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => restoreVersion(version.id)}
                    >
                      Restore
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {commentsOpen ? (
        <div className="workbench-collaboration-panel">
          <h3>Project comments</h3>
          {commentError ? <p className="workbench-collaboration-error">{commentError}</p> : null}
          <ul className="workbench-collaboration-comments">
            {comments.length === 0 ? (
              <li className="workbench-collaboration-muted">No comments yet.</li>
            ) : (
              comments.map((comment) => (
                <li key={comment.id}>
                  <p>{comment.body}</p>
                  <time dateTime={comment.created_at}>
                    {new Date(comment.created_at).toLocaleString()}
                  </time>
                </li>
              ))
            )}
          </ul>
          {canEdit ? (
            <div className="workbench-collaboration-comment-form">
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Leave a note for the team…"
                rows={2}
              />
              <button
                type="button"
                className="workbench-button workbench-button-primary"
                disabled={isPending || !commentBody.trim()}
                onClick={submitComment}
              >
                Add comment
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}

export function getCanvasLockForObject(
  locks: import("@/lib/workbench-project-collaboration").WorkbenchCanvasObjectLockRow[],
  objectId: string,
  currentUserId: string | null,
) {
  const lock = locks.find((row) => row.object_id === objectId);
  if (!lock || !isCanvasLockActive(lock)) return null;
  if (lock.user_id === currentUserId) return null;
  return lock;
}
