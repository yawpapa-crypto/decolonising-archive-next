"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateReviewFullText, updateReviewScreening } from "@/lib/workbench-review-actions";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import ReviewProjectShell from "./ReviewProjectShell";
import { resultMessage, statusLabel } from "./review-shared";

export default function ReviewFullTextClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const project = snapshot.activeProject;

  const fullTextByRecord = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    snapshot.fullTexts.forEach((row) => {
      const recordId = typeof row.record_id === "string" ? row.record_id : "";
      if (recordId) map.set(recordId, row);
    });
    return map;
  }, [snapshot.fullTexts]);

  if (!project) return null;
  const projectId = project.id;

  const queue = snapshot.screenings.filter((record) =>
    ["included", "full_text_review", "final_included"].includes(record.status),
  );

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) window.alert(result.error ?? "Action failed.");
      else router.refresh();
      void success;
    });
  }

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="full-text">
      <section className="workbench-review-screening workbench-review-page">
        <div className="workbench-review-card">
          <div className="workbench-review-card-header">
            <div>
              <h2>Full text review</h2>
              <p>Track access status and final inclusion decisions.</p>
            </div>
          </div>
          <div className="workbench-review-screening-list">
            {queue.map((record) => (
              <article key={record.id} className="workbench-review-screening-card">
                <div>
                  <span>{statusLabel(record.status)}</span>
                  <h3>{record.title}</h3>
                  <p>{[record.source, record.year].filter(Boolean).join(" · ") || "Source pending"}</p>
                  <small>
                    Full text:{" "}
                    {String(fullTextByRecord.get(record.recordId)?.access_status ?? record.fullTextStatus ?? "not sought")}
                  </small>
                </div>
                <div className="workbench-review-decision-bar">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () =>
                          updateReviewFullText({
                            projectId: projectId,
                            recordId: record.recordId,
                            url: record.sourceUrl,
                            accessStatus: record.sourceUrl ? "found" : "not_sought",
                          }),
                        "Full text status saved.",
                      )
                    }
                  >
                    Track full text
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () =>
                          updateReviewScreening({
                            projectId: projectId,
                            recordId: record.recordId,
                            screeningStatus: "final_included",
                          }),
                        "Record included.",
                      )
                    }
                  >
                    Include
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () =>
                          updateReviewScreening({
                            projectId: projectId,
                            recordId: record.recordId,
                            screeningStatus: "excluded",
                            exclusionReason: "no_full_text",
                          }),
                        "Record excluded.",
                      )
                    }
                  >
                    Exclude
                  </button>
                </div>
              </article>
            ))}
            {!queue.length ? (
              <div className="workbench-review-empty">
                <strong>No full text records</strong>
                <p>Include records during screening to move them into full text assessment.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </ReviewProjectShell>
  );
}
