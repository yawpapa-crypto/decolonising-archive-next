"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import type { IntelligenceFacetFilters, IntelligenceResearchGap } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  gaps: IntelligenceResearchGap[];
  onApplyFilter: (hint?: IntelligenceFacetFilters) => void;
};

export default function IntelligenceGaps({ gaps, onApplyFilter }: Props) {
  if (!gaps.length) return null;

  return (
    <section className="ri-panel ri-dash-gaps" aria-label="Research gaps">
      <h3 className="ri-section-title">Research gaps</h3>
      <ul className="ri-dash-gaps__list">
        {gaps.map((gap) => (
          <li key={gap.id} className={cn("ri-dash-gap", `is-${gap.severity}`)}>
            <span className="ri-dash-gap__icon" aria-hidden>
              <AlertTriangle size={16} />
            </span>
            <div className="ri-dash-gap__body">
              <strong>{gap.title}</strong>
              <p>{gap.detail}</p>
              {gap.metric ? <span className="ri-dash-gap__metric">{gap.metric}</span> : null}
            </div>
            {gap.filterHint ? (
              <button type="button" className="ri-dash-gap__action" onClick={() => onApplyFilter(gap.filterHint)}>
                Explore
                <ChevronRight size={14} aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
