"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSubmissionReview,
  type CuratorActionResult,
} from "./actions";

export type CuratorSubmissionDTO = {
  id: string;
  title: string;
  content_type: string;
  description: string;
  source_url: string | null;
  review_status: string;
  reviewer_note: string | null;
  updated_at: string | null;
};

const STATUSES = ["submitted", "in_review", "accepted", "declined"] as const;

function dirty(a: CuratorSubmissionDTO, b: CuratorSubmissionDTO) {
  return (
    a.review_status !== b.review_status ||
    (a.reviewer_note ?? "") !== (b.reviewer_note ?? "")
  );
}

export default function CuratorSubmissionReviewEditor({
  submission,
}: {
  submission: CuratorSubmissionDTO;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(submission);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isDirty = useMemo(() => dirty(draft, submission), [draft, submission]);

  function runAction(fn: () => Promise<CuratorActionResult>) {
    setFlash(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setFlash({ kind: "ok", text: "Review saved." });
        router.refresh();
      } else {
        setFlash({ kind: "err", text: res.error });
      }
    });
  }

  function handleSave() {
    runAction(() =>
      updateSubmissionReview({
        id: draft.id,
        review_status: draft.review_status,
        reviewer_note: draft.reviewer_note,
      }),
    );
  }

  function handleDiscard() {
    setFlash(null);
    setDraft(submission);
  }

  const formattedUpdated =
    submission.updated_at &&
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(submission.updated_at));

  return (
    <article className="curator-editor-card curator-editor-card-queue">
      <header className="curator-editor-header">
        <div className="curator-editor-title-row">
          <h3 className="curator-editor-heading">{submission.title}</h3>
          <span className={`curator-status-badge is-${draft.review_status}`}>
            {draft.review_status.replace("_", " ")}
          </span>
          {isDirty ? (
            <span className="curator-unsaved-badge">Unsaved changes</span>
          ) : null}
        </div>
        <p className="curator-queue-meta">
          <span>{submission.content_type}</span>
          {formattedUpdated ? <span>Updated {formattedUpdated}</span> : null}
        </p>
      </header>

      <p className="curator-queue-description">{submission.description}</p>
      {submission.source_url ? (
        <p className="curator-queue-source">
          <a href={submission.source_url} className="workspace-link" target="_blank" rel="noreferrer">
            Source
          </a>
        </p>
      ) : null}

      <div className="curator-editor-form">
        <label>
          <span>Review status</span>
          <select
            value={draft.review_status}
            onChange={(e) =>
              setDraft({ ...draft, review_status: e.target.value })
            }
            disabled={pending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Reviewer note</span>
          <textarea
            rows={3}
            value={draft.reviewer_note ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                reviewer_note: e.target.value || null,
              })
            }
            disabled={pending}
            placeholder="Decision note (visible to curators)"
          />
        </label>
      </div>

      <div className="curator-editor-actions">
        <button
          type="button"
          className="workspace-cta"
          disabled={pending || !isDirty}
          onClick={handleSave}
        >
          {pending ? "Saving…" : "Save review"}
        </button>
        <button
          type="button"
          className="curator-secondary-button"
          disabled={pending || !isDirty}
          onClick={handleDiscard}
        >
          Discard
        </button>
      </div>

      <p className="curator-queue-hint">
        Submissions cannot be deleted from this queue by curators — members own their drafts until accepted.
      </p>

      {flash ? (
        <p className={flash.kind === "ok" ? "auth-notice" : "auth-error"} role="status">
          {flash.text}
        </p>
      ) : null}
    </article>
  );
}
