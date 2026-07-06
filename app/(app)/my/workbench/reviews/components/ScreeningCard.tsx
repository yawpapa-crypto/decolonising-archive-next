"use client";

import { FormEvent } from "react";
import type { WorkbenchReviewDecision, WorkbenchReviewScreening } from "@/lib/workbench-review-module";
import type { ReviewExclusionReason, ReviewScreeningStatus } from "@/lib/workbench-intelligence-types";
import { statusLabel } from "./review-shared";

function decisionLabel(decision: string) {
  if (decision === "include") return "Include";
  if (decision === "exclude") return "Exclude";
  if (decision === "maybe") return "Maybe";
  if (decision === "not_sure") return "Not sure";
  return decision;
}

export default function ScreeningCard({
  record,
  isPending,
  exclusionReason,
  teamDecisions = [],
  onDecide,
  onSaveNote,
}: {
  record: WorkbenchReviewScreening;
  isPending: boolean;
  exclusionReason: ReviewExclusionReason;
  teamDecisions?: WorkbenchReviewDecision[];
  onDecide: (status: ReviewScreeningStatus) => void;
  onSaveNote: (notes: string) => void;
}) {
  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSaveNote(String(form.get("notes") ?? ""));
  }

  return (
    <article className="workbench-review-screening-card">
      <div className="workbench-review-screening-main">
        <div className="workbench-review-screening-meta">
          <span className="workbench-review-status-pill">{statusLabel(record.status)}</span>
          {record.conflictStatus && record.conflictStatus !== "none" ? (
            <span className="workbench-review-status-pill is-conflict">Conflict</span>
          ) : null}
        </div>
        <h3>{record.title}</h3>
        <p className="workbench-review-record-source">
          {[record.source, record.recordType, record.year].filter(Boolean).join(" · ") || "Source pending"}
        </p>
        {record.sourceUrl ? (
          <a href={record.sourceUrl} className="workbench-review-text-link" target="_blank" rel="noreferrer">
            Open source
          </a>
        ) : null}
        {teamDecisions.length ? (
          <ul className="workbench-review-team-decisions" aria-label="Team decisions">
            {teamDecisions.map((decision, index) => (
              <li key={decision.id}>
                <span>{decisionLabel(decision.decision)}</span>
                <em>Reviewer {index + 1}</em>
              </li>
            ))}
          </ul>
        ) : null}
        {record.notes ? <p className="workbench-review-record-note">{record.notes}</p> : null}
      </div>

      <div className="workbench-review-decision-bar">
        <button type="button" className="is-include" disabled={isPending} onClick={() => onDecide("included")}>
          Include
        </button>
        <button type="button" className="is-maybe" disabled={isPending} onClick={() => onDecide("maybe")}>
          Maybe
        </button>
        <button type="button" className="is-exclude" disabled={isPending} onClick={() => onDecide("excluded")}>
          Exclude
        </button>
        <button type="button" className="is-fulltext" disabled={isPending} onClick={() => onDecide("full_text_review")}>
          Full text
        </button>
      </div>

      {record.status === "excluded" ? (
        <p className="workbench-review-reason">Excluded: {record.exclusionReason || exclusionReason}</p>
      ) : null}

      <form className="workbench-review-note-form" onSubmit={submitNote}>
        <input
          name="notes"
          defaultValue={record.notes ?? ""}
          placeholder="Add a reviewer note…"
          aria-label={`Note for ${record.title}`}
        />
        <button type="submit" className="workbench-review-ghost" disabled={isPending}>
          Save
        </button>
      </form>
    </article>
  );
}
