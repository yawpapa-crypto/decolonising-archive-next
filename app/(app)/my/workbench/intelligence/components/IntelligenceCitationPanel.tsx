"use client";

import { AlertCircle, BookOpen, Link2, Users } from "lucide-react";
import type { CitationIntelligence } from "@/lib/workbench-intelligence-types";
import IntelligenceDistributionBars from "./IntelligenceDistributionBars";

type Props = {
  citation: CitationIntelligence;
  onFilterRecords?: (filter: "cited" | "uncited" | "needs_metadata") => void;
  onAuthorSelect?: (author: string | null) => void;
  activeAuthor?: string | null;
};

export default function IntelligenceCitationPanel({
  citation,
  onFilterRecords,
  onAuthorSelect,
  activeAuthor,
}: Props) {
  return (
    <section className="ri-panel ri-citation-panel" aria-label="Citation intelligence">
      <div className="ri-panel__head">
        <div>
          <p className="ri-eyebrow">Citations</p>
          <h2 className="ri-section-shell__title">Citation intelligence</h2>
        </div>
      </div>

      <div className="ri-citation-stats">
        <button
          type="button"
          className="ri-overview-stat ri-overview-stat--interactive"
          onClick={() => onFilterRecords?.("cited")}
        >
          <div className="ri-overview-stat__head">
            <span>Cited sources</span>
            <BookOpen size={15} aria-hidden />
          </div>
          <strong>{citation.citedSourcesCount}</strong>
          <span>{citation.totalCitations} in-note citations</span>
        </button>
        <button
          type="button"
          className="ri-overview-stat ri-overview-stat--interactive"
          onClick={() => onFilterRecords?.("uncited")}
        >
          <div className="ri-overview-stat__head">
            <span>Uncited notes</span>
            <AlertCircle size={15} aria-hidden />
          </div>
          <strong>{citation.uncitedNotesCount}</strong>
          <span>Notes without citations</span>
        </button>
        <button
          type="button"
          className="ri-overview-stat ri-overview-stat--interactive"
          onClick={() => onFilterRecords?.("needs_metadata")}
        >
          <div className="ri-overview-stat__head">
            <span>Missing DOI/URL</span>
            <Link2 size={15} aria-hidden />
          </div>
          <strong>{citation.missingDoiOrUrl}</strong>
          <span>Citations needing identifiers</span>
        </button>
        <article className="ri-overview-stat">
          <div className="ri-overview-stat__head">
            <span>Style drift</span>
            <Users size={15} aria-hidden />
          </div>
          <strong>{citation.styleIssues}</strong>
          <span>Mixed citation styles detected</span>
        </article>
      </div>

      {citation.weakDiversityWarning ? (
        <p className="ri-warning-banner">{citation.weakDiversityWarning}</p>
      ) : null}

      <div className="ri-overview-charts ri-overview-charts--two">
        <IntelligenceDistributionBars
          title="Most cited authors"
          entries={citation.topAuthors}
          onSelect={onAuthorSelect ? (label) => onAuthorSelect(activeAuthor === label ? null : label) : undefined}
          activeKey={activeAuthor ?? null}
          emptyLabel="Add citations in notes to see author frequency."
        />
        <IntelligenceDistributionBars
          title="Cited records by year"
          entries={citation.sourceAgeSpread}
          emptyLabel="No dated citations yet."
        />
      </div>

      {citation.coveragePrompts.length ? (
        <ul className="ri-citation-prompts">
          {citation.coveragePrompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
