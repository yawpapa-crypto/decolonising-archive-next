"use client";

import type { TemporalCoverage } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  temporal: TemporalCoverage;
  activeYear?: string | null;
  onYearSelect?: (year: string | null) => void;
};

export default function IntelligenceTimeline({ temporal, activeYear, onYearSelect }: Props) {
  const max = Math.max(1, ...temporal.yearSpread.map((entry) => entry.count));
  const interactive = Boolean(onYearSelect);

  return (
    <section className="ri-panel ri-timeline-panel" aria-label="Timeline coverage">
      <div className="ri-panel__head">
        <div>
          <p className="ri-eyebrow">Timeline</p>
          <h2 className="ri-section-shell__title">Temporal coverage</h2>
        </div>
        <p className="ri-timeline-meta">
          {temporal.earliestYear && temporal.latestYear ?
            `${temporal.earliestYear}–${temporal.latestYear}`
          : "No dated records yet"}
          {temporal.decadeGaps.length ?
            ` · Gaps: ${temporal.decadeGaps.join(", ")}`
          : null}
        </p>
      </div>

      {temporal.yearSpread.length ? (
        <div className="ri-timeline-chart" role="img" aria-label="Records by publication year">
          {temporal.yearSpread.map((entry) => {
            const Tag = interactive ? "button" : "div";
            return (
              <Tag
                key={entry.year}
                type={interactive ? "button" : undefined}
                className={cn(
                  "ri-timeline-bar",
                  interactive && "ri-timeline-bar--interactive",
                  activeYear === entry.year && "is-active",
                )}
                title={`${entry.count} records, ${entry.cited} cited`}
                onClick={
                  interactive ?
                    () => onYearSelect?.(activeYear === entry.year ? null : entry.year)
                  : undefined
                }
              >
                <div
                  className="ri-timeline-bar__fill"
                  style={{ height: `${Math.max(8, (entry.count / max) * 100)}%` }}
                />
                <span className="ri-timeline-bar__label">{entry.year}</span>
              </Tag>
            );
          })}
        </div>
      ) : (
        <p className="ri-empty-note">Save records with publication years to see temporal spread.</p>
      )}
    </section>
  );
}
