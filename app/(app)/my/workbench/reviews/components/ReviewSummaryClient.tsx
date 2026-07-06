"use client";

import Link from "next/link";
import { useTransition } from "react";
import { exportReviewCounts } from "@/lib/workbench-review-actions";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import ReviewNextStepBanner from "./ReviewNextStepBanner";
import ReviewProjectShell from "./ReviewProjectShell";
import StagePanel from "./StagePanel";
import { formatReviewDate } from "./review-shared";

export default function ReviewSummaryClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const [isPending, startTransition] = useTransition();
  const project = snapshot.activeProject;
  const counts = snapshot.stageCounts;
  const recentImports = snapshot.imports.slice(0, 3);

  function handleExport() {
    if (!project) return;
    startTransition(async () => {
      const result = await exportReviewCounts(project.id);
      if (!result.ok || !result.csv) {
        window.alert(result.error ?? "Export failed.");
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-counts.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  if (!project) return null;

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="summary" onExport={handleExport}>
      <div className="workbench-review-stack">
        <ReviewNextStepBanner projectId={project.id} counts={counts} />

        <StagePanel
          title="Import references"
          detail="Saved records, reading lists, or bibliographic file exports."
          href={`/my/workbench/reviews/${project.id}/import`}
          actionLabel="Import"
          stats={[
            { label: "In review", value: counts.importTotal, highlight: true },
            { label: "Duplicates", value: counts.duplicatesRemoved },
            { label: "Imports", value: recentImports.length },
          ]}
        />

        {recentImports.length ? (
          <section className="workbench-review-card workbench-review-subcard">
            <div className="workbench-review-card-header">
              <h2>Recent imports</h2>
            </div>
            <ul className="workbench-review-import-history is-compact">
              {recentImports.map((row) => (
                <li key={row.id} className={row.status === "failed" ? "is-error" : undefined}>
                  <div>
                    <time dateTime={row.createdAt}>{formatReviewDate(row.createdAt)}</time>
                    <strong>{row.filename ?? "Import batch"}</strong>
                  </div>
                  <span>
                    +{row.addedToScreeningCount} · {row.duplicatesCount} dup.
                  </span>
                  {row.errorMessage ? <em>{row.errorMessage}</em> : null}
                </li>
              ))}
            </ul>
            <Link href={`/my/workbench/reviews/${project.id}/import`} className="workbench-review-text-link">
              View full import history
            </Link>
          </section>
        ) : null}

        <StagePanel
          title="Title & abstract screening"
          detail="Include, exclude, or mark studies for full-text review."
          href={`/my/workbench/reviews/${project.id}/screening`}
          actionLabel="Screen"
          stats={[
            { label: "Awaiting", value: counts.awaitingScreening, highlight: true },
            { label: "Screened", value: counts.screened },
            { label: "Excluded", value: counts.excluded },
            { label: "Conflicts", value: counts.conflicts },
          ]}
        />

        <StagePanel
          title="Full text review"
          detail="Confirm access and final inclusion at full-text stage."
          href={`/my/workbench/reviews/${project.id}/full-text`}
          actionLabel="Review"
          stats={[
            { label: "Queue", value: counts.fullTextQueue, highlight: true },
            { label: "Included", value: counts.fullTextDone },
          ]}
        />

        <StagePanel
          title="Extraction"
          detail="Structured fields for included studies."
          href={`/my/workbench/reviews/${project.id}/extraction`}
          actionLabel="Extract"
          stats={[
            { label: "Studies", value: counts.extractionQueue, highlight: true },
            { label: "Fields", value: snapshot.fields.length },
            { label: "Saved", value: snapshot.extractions.length },
          ]}
        />
      </div>
      {isPending ? <p className="workbench-review-flash">Preparing export…</p> : null}
    </ReviewProjectShell>
  );
}
