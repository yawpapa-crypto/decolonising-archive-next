"use client";

import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import ReviewProjectShell from "./ReviewProjectShell";

export default function ReviewReportingClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const project = snapshot.activeProject;
  if (!project) return null;
  const counts = snapshot.prismaCounts;

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="summary">
      <section className="workbench-review-card workbench-review-prisma">
        <div className="workbench-review-card-header">
          <h2>Review flow counts</h2>
          <p>PRISMA-style counts for reporting and export.</p>
        </div>
        <div className="workbench-review-flow">
          <article className="workbench-review-stage-card">
            <span>Records identified</span>
            <strong>{counts.recordsIdentified}</strong>
          </article>
          <article className="workbench-review-stage-card">
            <span>Duplicates removed</span>
            <strong>{counts.duplicatesRemoved}</strong>
          </article>
          <article className="workbench-review-stage-card">
            <span>Screened</span>
            <strong>{counts.recordsScreened}</strong>
          </article>
          <article className="workbench-review-stage-card">
            <span>Excluded</span>
            <strong>{counts.recordsExcluded}</strong>
          </article>
          <article className="workbench-review-stage-card">
            <span>Full text assessed</span>
            <strong>{counts.fullTextAssessed}</strong>
          </article>
          <article className="workbench-review-stage-card">
            <span>Included</span>
            <strong>{counts.finalIncluded}</strong>
          </article>
        </div>
      </section>
    </ReviewProjectShell>
  );
}
