"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { resolveReviewConflict, updateReviewScreening } from "@/lib/workbench-review-actions";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import type { ReviewExclusionReason } from "@/lib/workbench-intelligence-types";
import ReviewCollaboratorsSection from "./ReviewCollaboratorsSection";
import ReviewProjectShell from "./ReviewProjectShell";
import ScreeningCard from "./ScreeningCard";
import { resultMessage } from "./review-shared";

const EXCLUSION_REASONS: Array<{ value: ReviewExclusionReason; label: string }> = [
  { value: "wrong_topic", label: "Wrong topic" },
  { value: "wrong_geography", label: "Wrong geography" },
  { value: "wrong_method", label: "Wrong method" },
  { value: "duplicate", label: "Duplicate" },
  { value: "no_full_text", label: "No full text" },
  { value: "outside_date_range", label: "Outside date range" },
  { value: "other", label: "Other" },
];

type QueueView = "awaiting" | "conflicts" | "done" | "all";

export default function ReviewScreeningClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [exclusionReason, setExclusionReason] = useState<ReviewExclusionReason>("wrong_topic");
  const [view, setView] = useState<QueueView>("awaiting");
  const project = snapshot.activeProject;
  if (!project) return null;
  const projectId = project.id;

  const openConflicts = useMemo(
    () => snapshot.conflicts.filter((row) => row.status === "open"),
    [snapshot.conflicts],
  );

  const openConflictRecordIds = useMemo(
    () => new Set(openConflicts.map((row) => row.recordId)),
    [openConflicts],
  );

  const decisionsByRecord = useMemo(() => {
    const map = new Map<string, typeof snapshot.decisions>();
    snapshot.decisions.forEach((decision) => {
      const existing = map.get(decision.recordId) ?? [];
      existing.push(decision);
      map.set(decision.recordId, existing);
    });
    return map;
  }, [snapshot.decisions]);

  const awaiting = useMemo(
    () =>
      snapshot.screenings.filter((record) =>
        ["imported", "title_abstract_screening", "maybe"].includes(record.status),
      ),
    [snapshot.screenings],
  );

  const done = useMemo(
    () =>
      snapshot.screenings.filter((record) =>
        ["included", "excluded", "full_text_review", "final_included"].includes(record.status),
      ),
    [snapshot.screenings],
  );

  const conflictRecords = useMemo(
    () => snapshot.screenings.filter((record) => openConflictRecordIds.has(record.recordId)),
    [snapshot.screenings, openConflictRecordIds],
  );

  const visibleRecords = useMemo(() => {
    if (view === "awaiting") return awaiting;
    if (view === "conflicts") return conflictRecords;
    if (view === "done") return done;
    return snapshot.screenings;
  }, [awaiting, conflictRecords, done, snapshot.screenings, view]);

  const viewCounts = {
    awaiting: awaiting.length,
    conflicts: openConflicts.length,
    done: done.length,
    all: snapshot.screenings.length,
  };

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      setMessage(resultMessage(result, success));
      router.refresh();
    });
  }

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="screening">
      <section className="workbench-review-screening workbench-review-page">
        {message ? <p className="workbench-review-flash">{message}</p> : null}

        <ReviewCollaboratorsSection snapshot={snapshot} compact />

        <div className="workbench-review-card">
          <div className="workbench-review-card-header">
            <div>
              <h2>Title and abstract screening</h2>
              <p>
                Work through your queue one record at a time. Invite reviewers to screen independently — conflicts
                surface when decisions disagree.
              </p>
            </div>
            <label className="workbench-review-inline-select">
              <span>Default exclusion reason</span>
              <select
                value={exclusionReason}
                onChange={(event) => setExclusionReason(event.target.value as ReviewExclusionReason)}
              >
                {EXCLUSION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="workbench-review-screening-toolbar">
            <div className="workbench-review-segmented" role="tablist" aria-label="Screening queue filter">
              {(
                [
                  ["awaiting", "Awaiting"],
                  ["conflicts", "Conflicts"],
                  ["done", "Decided"],
                  ["all", "All"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  className={view === key ? "is-active" : undefined}
                  onClick={() => setView(key)}
                >
                  {label} ({viewCounts[key]})
                </button>
              ))}
            </div>
          </div>

          {openConflicts.length ? (
            <div className="workbench-review-conflict-banner">
              <strong>Conflicts to resolve</strong>
              <p className="workbench-review-conflict-copy">
                Reviewers disagreed on these records. Choose a final decision to continue.
              </p>
              <ul>
                {openConflicts.map((conflict) => (
                  <li key={conflict.id}>
                    <span>{conflict.title}</span>
                    <div className="workbench-review-conflict-actions">
                      {(["include", "maybe", "exclude"] as const).map((decision) => (
                        <button
                          key={decision}
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runAction(
                              () =>
                                resolveReviewConflict({
                                  projectId,
                                  recordId: conflict.recordId,
                                  stage: "title_abstract",
                                  resolutionDecision: decision,
                                }),
                              `Resolved as ${decision}.`,
                            )
                          }
                        >
                          {decision === "include" ? "Include" : decision === "maybe" ? "Maybe" : "Exclude"}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="workbench-review-screening-list">
            {visibleRecords.map((record) => (
              <ScreeningCard
                key={record.id}
                record={record}
                teamDecisions={decisionsByRecord.get(record.recordId) ?? []}
                isPending={isPending}
                exclusionReason={exclusionReason}
                onDecide={(status) =>
                  runAction(
                    () =>
                      updateReviewScreening({
                        projectId,
                        recordId: record.recordId,
                        screeningStatus: status,
                        exclusionReason: status === "excluded" ? exclusionReason : null,
                      }),
                    "Screening decision saved.",
                  )
                }
                onSaveNote={(notes) =>
                  runAction(
                    () =>
                      updateReviewScreening({
                        projectId,
                        recordId: record.recordId,
                        screeningStatus: record.status,
                        exclusionReason: record.exclusionReason as ReviewExclusionReason | null,
                        notes,
                      }),
                    "Reviewer note saved.",
                  )
                }
              />
            ))}
            {!snapshot.screenings.length ? (
              <div className="workbench-review-empty">
                <strong>No records in your screening queue</strong>
                <p>Import references first, or ask the review owner to invite you as a reviewer.</p>
              </div>
            ) : !visibleRecords.length ? (
              <div className="workbench-review-empty">
                <strong>No records in this view</strong>
                <p>
                  {view === "conflicts"
                    ? "No open conflicts right now."
                    : view === "awaiting"
                      ? "You have screened everything in your queue."
                      : "Try another filter to see more records."}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </ReviewProjectShell>
  );
}
