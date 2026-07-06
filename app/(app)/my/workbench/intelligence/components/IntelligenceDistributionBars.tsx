"use client";

import type { IntelligenceDistributionEntry } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  entries: IntelligenceDistributionEntry[];
  emptyLabel?: string;
  maxItems?: number;
  activeKey?: string | null;
  onSelect?: (label: string | null) => void;
};

export default function IntelligenceDistributionBars({
  title,
  entries,
  emptyLabel = "No data yet.",
  maxItems = 8,
  activeKey = null,
  onSelect,
}: Props) {
  const visible = entries.slice(0, maxItems);
  const maxCount = Math.max(1, ...visible.map((entry) => entry.count));
  const interactive = Boolean(onSelect);

  return (
    <section className="ri-panel ri-dist-panel" aria-label={title}>
      <h3 className="ri-section-title">{title}</h3>
      {visible.length ? (
        <ul className="ri-dist-list">
          {visible.map((entry) => {
            const active = activeKey === entry.label;
            return (
              <li
                key={entry.label}
                className={cn("ri-dist-row", interactive && "ri-dist-row--interactive", active && "is-active")}
              >
                {interactive ? (
                  <button
                    type="button"
                    className="ri-dist-row__button"
                    onClick={() => onSelect?.(active ? null : entry.label)}
                  >
                    <div className="ri-dist-row__head">
                      <span className="ri-dist-row__label">{entry.label}</span>
                      <span className="ri-dist-row__meta">
                        {entry.count.toLocaleString()} · {entry.percent}%
                      </span>
                    </div>
                    <div className="ri-dist-row__track" aria-hidden="true">
                      <span
                        className="ri-dist-row__fill"
                        style={{ width: `${Math.max(6, (entry.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </button>
                ) : (
                  <>
                    <div className="ri-dist-row__head">
                      <span className="ri-dist-row__label">{entry.label}</span>
                      <span className="ri-dist-row__meta">
                        {entry.count.toLocaleString()} · {entry.percent}%
                      </span>
                    </div>
                    <div className="ri-dist-row__track" aria-hidden="true">
                      <span
                        className="ri-dist-row__fill"
                        style={{ width: `${Math.max(6, (entry.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ri-empty-note">{emptyLabel}</p>
      )}
    </section>
  );
}
