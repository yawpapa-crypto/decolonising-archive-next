"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveReviewProject,
  deleteReviewProject,
  restoreReviewProject,
} from "@/lib/workbench-review-actions";
import type { WorkbenchReviewProject } from "@/lib/workbench-review-module";

export default function ReviewActionMenu({ project }: { project: WorkbenchReviewProject }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successPath?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        window.alert(result.error ?? "Action failed.");
        return;
      }
      setOpen(false);
      router.refresh();
      if (successPath) router.push(successPath);
    });
  }

  return (
    <div className="workbench-review-action-menu" ref={rootRef}>
      <button
        type="button"
        className="workbench-review-action-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${project.title}`}
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
      >
        ···
      </button>
      {open ? (
        <div className="workbench-review-action-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => router.push(`/my/workbench/reviews/${project.id}/settings`)}
          >
            Edit review
          </button>
          {project.status === "archived" ? (
            <button type="button" role="menuitem" onClick={() => run(() => restoreReviewProject(project.id))}>
              Restore
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => run(() => archiveReviewProject(project.id))}>
              Archive
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${project.title}"? This removes the review workflow and cannot be undone.`,
                )
              ) {
                run(() => deleteReviewProject(project.id), "/my/workbench/reviews");
              }
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
