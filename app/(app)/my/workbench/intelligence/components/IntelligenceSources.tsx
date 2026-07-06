"use client";

import type { IntelligenceSourcePerformance } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  sources: IntelligenceSourcePerformance[];
};

export default function IntelligenceSources({ sources }: Props) {
  return (
    <section className="ri-panel ri-dash-sources" aria-label="Source performance">
      <h3 className="ri-section-title">Source performance</h3>
      <div className="ri-dash-sources__grid">
        {sources.map((source) => (
          <article key={source.id} className={cn("ri-dash-source-card", `is-${source.status}`)}>
            <div className="ri-dash-source-card__head">
              <strong>{source.name}</strong>
              <span className={cn("ri-source__status", `is-${source.status}`)}>{source.status}</span>
            </div>
            <dl className="ri-dash-source-card__stats">
              <div>
                <dt>Records</dt>
                <dd>{source.recordCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Failures</dt>
                <dd>{source.failureCount}</dd>
              </div>
              <div>
                <dt>Yours</dt>
                <dd>{source.userRecordCount}</dd>
              </div>
            </dl>
            <p className="ri-source__sync">
              Last synced{" "}
              {source.lastSynced ? new Date(source.lastSynced).toLocaleDateString() : "—"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
