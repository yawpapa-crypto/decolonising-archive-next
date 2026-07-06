"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import type { WorkbenchProjectRow } from "@/lib/workbench-data";
import type { WorkbenchProjectAccessRole } from "@/lib/workbench-collaboration";
import {
  deleteWorkbenchProjectInline,
  updateWorkbenchProjectInline,
} from "@/lib/workbench-inline-actions";

type Props = {
  open: boolean;
  project: WorkbenchProjectRow | null;
  accessRole: WorkbenchProjectAccessRole;
  onClose: () => void;
  onOpenShare: () => void;
};

export function WorkbenchProjectSettingsModal({
  open,
  project,
  accessRole,
  onClose,
  onOpenShare,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canManage = accessRole === "owner";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTitle(project?.title ?? "");
    setDescription(project?.description ?? "");
    setConfirmDelete("");
    setNotice("");
    setError("");
  }, [open, project]);

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

  if (!open || !mounted) return null;

  function saveProject(event: FormEvent) {
    event.preventDefault();
    if (!project || !canManage) return;
    setError("");
    startTransition(async () => {
      const result = await updateWorkbenchProjectInline({
        projectId: project.id,
        patch: {
          title: title.trim() || project.title,
          description: description.trim() || null,
          project_type: project.project_type,
          visibility: project.visibility,
          status: project.status,
          deadline: project.deadline,
        },
      });
      if (!result.ok) {
        setError(result.error || "Could not save project settings.");
        return;
      }
      setNotice("Project settings saved.");
      router.refresh();
    });
  }

  function deleteProject() {
    if (!project || !canManage) return;
    if (confirmDelete !== project.title) {
      setError("Type the project title exactly to confirm deletion.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await deleteWorkbenchProjectInline({ projectId: project.id });
      if (!result.ok) {
        setError(result.error || "Could not delete project.");
        return;
      }
      onClose();
      router.push("/my/workbench/projects");
      router.refresh();
    });
  }

  const dialog = (
    <div
      className="workbench-share-dialog workbench-project-settings-dialog"
      role="presentation"
      onClick={onClose}
    >
      <div className="workbench-share-dialog-backdrop" aria-hidden />
      <div
        className="workbench-share-dialog-card workbench-share-modal workbench-project-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workbench-project-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="workbench-share-modal__head workbench-project-settings-modal__head">
          <div>
            <p className="workbench-share-modal__eyebrow">Project</p>
            <h2 id="workbench-project-settings-title">Project settings</h2>
            <p className="workbench-share-modal__lead">
              Rename the project, manage collaborators, or delete the shared workspace.
            </p>
          </div>
          <button
            type="button"
            className="workbench-share-modal__close workbench-project-settings-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {!project ? (
          <p className="workbench-share-modal__error" role="alert">
            This note is not attached to a project yet.
          </p>
        ) : (
          <div className="workbench-project-settings-modal__body">
            {notice ? (
              <p className="workbench-share-modal__notice workbench-project-settings-modal__notice" role="status">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="workbench-share-modal__error workbench-project-settings-modal__error" role="alert">
                {error}
              </p>
            ) : null}

            <form className="workbench-project-settings-modal__form" onSubmit={saveProject}>
              <label className="workbench-share-modal__field">
                <span>Project name</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canManage || isPending}
                  readOnly={!canManage}
                  autoComplete="off"
                />
              </label>
              <label className="workbench-share-modal__field">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={!canManage || isPending}
                  readOnly={!canManage}
                  placeholder="Optional project summary for collaborators"
                />
              </label>
              {canManage ? (
                <button
                  type="submit"
                  className="workbench-share-modal__submit workbench-project-settings-modal__submit"
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Save settings"}
                </button>
              ) : (
                <p className="workbench-share-modal__help">Only the project owner can change settings.</p>
              )}
            </form>

            <div className="workbench-project-settings-modal__section">
              <button
                type="button"
                className="workbench-project-settings-modal__secondary"
                onClick={onOpenShare}
              >
                <Users size={18} strokeWidth={2} aria-hidden />
                <span>Manage collaborators</span>
              </button>
            </div>

            {canManage ? (
              <section className="workbench-project-settings-danger" aria-labelledby="workbench-project-settings-delete-title">
                <div className="workbench-project-settings-danger__intro">
                  <h3 id="workbench-project-settings-delete-title">Delete project</h3>
                  <p>
                    This permanently removes the shared document, board, canvases, and collaborator
                    access. This cannot be undone.
                  </p>
                </div>
                <label className="workbench-share-modal__field">
                  <span>Type project title to confirm</span>
                  <input
                    type="text"
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    placeholder={project.title}
                    disabled={isPending}
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="workbench-project-settings-danger__button"
                  disabled={isPending || confirmDelete !== project.title}
                  onClick={deleteProject}
                >
                  Delete project
                </button>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
