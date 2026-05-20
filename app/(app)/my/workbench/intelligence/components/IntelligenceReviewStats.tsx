"use client";

import {
  AlertTriangle,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  GitMerge,
  Layers3,
  ListChecks,
} from "lucide-react";
import type { ReviewIntelligenceDetail } from "@/lib/workbench-intelligence-types";

type Props = {
  reviews: ReviewIntelligenceDetail;
};

function ReviewStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof FolderKanban;
}) {
  return (
    <article className="ri-overview-stat">
      <div className="ri-overview-stat__head">
        <span>{label}</span>
        <Icon size={15} aria-hidden />
      </div>
      <strong>{value}</strong>
      <span>{hint}</span>
    </article>
  );
}

export default function IntelligenceReviewStats({ reviews }: Props) {
  const screened = reviews.recordsScreened + reviews.recordsExcluded + reviews.fullTextAssessed;

  return (
    <section className="ri-panel ri-review-stats" aria-label="Review intelligence">
      <div className="ri-panel__head">
        <div>
          <p className="ri-eyebrow">Reviews</p>
          <h2 className="ri-section-shell__title">Review intelligence</h2>
        </div>
        {reviews.unresolvedConflicts ? (
          <p className="ri-warning-banner ri-warning-banner--inline">
            <AlertTriangle size={14} aria-hidden />
            {reviews.unresolvedConflicts} unresolved conflict{reviews.unresolvedConflicts === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="ri-review-stats__grid">
        <ReviewStat
          label="Active reviews"
          value={String(reviews.activeReviewProjects)}
          hint={`${reviews.projects.length} total project${reviews.projects.length === 1 ? "" : "s"}`}
          icon={FolderKanban}
        />
        <ReviewStat
          label="Imported records"
          value={reviews.recordsIdentified.toLocaleString()}
          hint={`${reviews.duplicatesRemoved} duplicates removed`}
          icon={Layers3}
        />
        <ReviewStat
          label="Screened"
          value={screened.toLocaleString()}
          hint={`${reviews.awaitingScreening} awaiting screening`}
          icon={ListChecks}
        />
        <ReviewStat
          label="Included / excluded"
          value={`${reviews.finalIncluded} / ${reviews.recordsExcluded}`}
          hint={`${reviews.maybeCount} marked maybe`}
          icon={ClipboardCheck}
        />
        <ReviewStat
          label="Conflicts"
          value={String(reviews.unresolvedConflicts)}
          hint="Open screening disagreements"
          icon={GitMerge}
        />
        <ReviewStat
          label="Extraction progress"
          value={`${reviews.extractionProgressPercent}%`}
          hint="Data extraction completion"
          icon={FileCheck2}
        />
      </div>

      {reviews.databasesUsed.length ? (
        <p className="ri-review-stats__meta">
          Databases searched: {reviews.databasesUsed.join(", ")}
        </p>
      ) : (
        <p className="ri-empty-note">Create a review project and import your saved corpus to track screening progress.</p>
      )}
    </section>
  );
}
