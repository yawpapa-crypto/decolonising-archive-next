import Link from "next/link";
import type { WorkbenchReviewStageCounts } from "@/lib/workbench-review-module";

export default function ReviewNextStepBanner({
  projectId,
  counts,
}: {
  projectId: string;
  counts: WorkbenchReviewStageCounts;
}) {
  let title = "Get started";
  let detail = "Create your review protocol, then import references to begin screening.";
  let href = `/my/workbench/reviews/${projectId}/import`;
  let action = "Import references";

  if (counts.importTotal === 0) {
    title = "Import references";
    detail = "Add saved records, a reading list, or a bibliographic file export.";
  } else if (counts.awaitingScreening > 0) {
    title = "Screen title and abstracts";
    detail = `${counts.awaitingScreening} record${counts.awaitingScreening === 1 ? "" : "s"} awaiting your decision.`;
    href = `/my/workbench/reviews/${projectId}/screening`;
    action = "Start screening";
  } else if (counts.conflicts > 0) {
    title = "Resolve screening conflicts";
    detail = `${counts.conflicts} conflict${counts.conflicts === 1 ? "" : "s"} need a final decision before you continue.`;
    href = `/my/workbench/reviews/${projectId}/screening`;
    action = "Resolve conflicts";
  } else if (counts.fullTextQueue > counts.fullTextDone) {
    title = "Review full texts";
    detail = `${counts.fullTextQueue - counts.fullTextDone} stud${counts.fullTextQueue - counts.fullTextDone === 1 ? "y" : "ies"} ready for full-text assessment.`;
    href = `/my/workbench/reviews/${projectId}/full-text`;
    action = "Full-text review";
  } else if (counts.extractionQueue > 0 && counts.extractionDone < counts.extractionQueue) {
    title = "Extract study data";
    detail = "Included studies are ready for structured extraction.";
    href = `/my/workbench/reviews/${projectId}/extraction`;
    action = "Open extraction";
  } else if (counts.importTotal > 0) {
    title = "Review complete for now";
    detail = "Export counts or open PRISMA reporting when you are ready to write up.";
    href = `/my/workbench/reviews/${projectId}/reporting`;
    action = "View PRISMA";
  }

  return (
    <aside className="workbench-review-next-step">
      <div>
        <p className="workbench-review-eyebrow">Suggested next step</p>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <Link href={href} className="workbench-review-primary">
        {action}
      </Link>
    </aside>
  );
}
