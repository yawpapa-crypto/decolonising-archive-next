"use client";

import type { IntelligencePlaceComparison } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  comparisons: IntelligencePlaceComparison[];
  activePresetId: string | null;
  onSelectPreset: (presetId: string | null) => void;
};

export default function IntelligenceComparison({
  comparisons,
  activePresetId,
  onSelectPreset,
}: Props) {
  const maxCount = Math.max(1, ...comparisons.map((c) => c.recordCount));

  return (
    <section className="ri-panel ri-comparison" aria-label="Place comparison">
      <h3 className="ri-section-title">Compare places</h3>
      <p className="ri-comparison__intro">
        Side-by-side coverage across selected geographies — equal weight comparison.
      </p>
      <div className="ri-comparison__grid">
        {comparisons.map((place) => {
          const active = activePresetId === place.id;
          const barWidth = place.recordCount ? Math.max(8, (place.recordCount / maxCount) * 100) : 4;
          return (
            <button
              key={place.id}
              type="button"
              className={cn("ri-comparison__card", active && "is-active")}
              onClick={() => onSelectPreset(active ? null : place.id)}
            >
              <div className="ri-comparison__head">
                <strong>{place.label}</strong>
                <span>{place.recordCount.toLocaleString()} records</span>
              </div>
              <div className="ri-comparison__bar-track" aria-hidden>
                <div className="ri-comparison__bar-fill" style={{ width: `${barWidth}%` }} />
              </div>
              <dl className="ri-comparison__stats">
                <div>
                  <dt>Open access</dt>
                  <dd>{place.openAccessPercent}%</dd>
                </div>
                <div>
                  <dt>Top theme</dt>
                  <dd>{place.topTheme ?? "—"}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}
