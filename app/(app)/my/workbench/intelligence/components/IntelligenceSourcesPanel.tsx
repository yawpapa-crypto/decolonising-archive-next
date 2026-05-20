"use client";

import type { SourceIntelligence } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";
import IntelligenceInteractiveChart from "./IntelligenceInteractiveChart";
import IntelligenceDistributionBars from "./IntelligenceDistributionBars";

type Props = {
  sources: SourceIntelligence;
  activeSource?: string | null;
  onSourceSelect?: (label: string | null) => void;
};

const SOURCE_BADGE: Record<string, string> = {
  archive: "ri-source-badge--archive",
  openalex: "ri-source-badge--openalex",
  core: "ri-source-badge--core",
  crossref: "ri-source-badge--crossref",
  "semantic-scholar": "ri-source-badge--semantic",
  wikidata: "ri-source-badge--wikidata",
  aodl: "ri-source-badge--aodl",
  smithsonian: "ri-source-badge--smithsonian",
  trove: "ri-source-badge--trove",
};

export default function IntelligenceSourcesPanel({ sources, activeSource, onSourceSelect }: Props) {
  return (
    <div className="ri-sources-layout">
      <section className="ri-panel ri-dash-sources" aria-label="Source intelligence">
        <h3 className="ri-section-title">Source mix</h3>
        {sources.dominanceWarning ? (
          <p className="ri-warning-banner">{sources.dominanceWarning}</p>
        ) : null}

        <div className="ri-source-mix-grid">
          {sources.mix.map((entry) => {
            const id = entry.label.toLowerCase().replace(/\s+/g, "-");
            const active = activeSource === entry.label;
            return (
              <button
                key={entry.label}
                type="button"
                className={cn("ri-source-mix-card ri-source-mix-card--interactive", active && "is-active")}
                onClick={() => onSourceSelect?.(active ? null : entry.label)}
              >
                <span className={cn("ri-source-badge", SOURCE_BADGE[id] ?? "ri-source-badge--external")}>
                  {entry.label}
                </span>
                <strong>{entry.count}</strong>
                <span>{entry.percent}% of corpus</span>
              </button>
            );
          })}
        </div>

        {!sources.mix.length ? (
          <p className="ri-empty-note">Save records to see how your corpus is distributed across sources.</p>
        ) : null}

        <div className="ri-source-access-row">
          <span>Open access {sources.openAccessVsMetadataOnly.openAccess}%</span>
          <span>Metadata only {sources.openAccessVsMetadataOnly.metadataOnly}%</span>
          <span>Restricted {sources.openAccessVsMetadataOnly.closed}%</span>
        </div>

        {sources.underusedArchives.length ? (
          <p className="ri-source-note">
            Underused archive sources: {sources.underusedArchives.join(", ")}. Consider these for African and Global South material.
          </p>
        ) : null}
      </section>

      <div className="ri-overview-charts ri-overview-charts--two">
        <IntelligenceInteractiveChart
          title="Source distribution"
          entries={sources.mix}
          variant="bar"
          activeKey={activeSource ?? null}
          onSelect={onSourceSelect}
          emptyLabel="No source data yet."
        />
        <IntelligenceDistributionBars title="Scholarly vs archive mix" entries={sources.mediaTypeMix} />
        <section className="ri-panel ri-trust-panel" aria-label="Source trust indicators">
          <h3 className="ri-section-title">Provenance indicators</h3>
          {sources.trustIndicators.length ? (
            <ul className="ri-trust-list">
              {sources.trustIndicators.map((item) => (
                <li key={item.sourceId} className={cn("ri-trust-item", `is-${item.level}`)}>
                  <strong>{item.label}</strong>
                  <span>{item.level} confidence</span>
                  <p>{item.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ri-empty-note">Trust indicators appear once you have saved records.</p>
          )}
        </section>
      </div>
    </div>
  );
}
