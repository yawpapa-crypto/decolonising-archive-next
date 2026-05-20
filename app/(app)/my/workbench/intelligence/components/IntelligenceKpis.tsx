"use client";

import { useState } from "react";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  FileCheck2,
  FolderKanban,
  Globe2,
  Layers,
  ShieldAlert,
} from "lucide-react";
import type {
  IntelligenceDashboardKpis,
  ReviewIntelligenceKpis,
} from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  kpis: IntelligenceDashboardKpis;
  reviewKpis: ReviewIntelligenceKpis;
};

type Tab = "corpus" | "review";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Globe2;
  accent: string;
}) {
  return (
    <article className="ri-dash-kpi">
      <div className="ri-dash-kpi__top">
        <span className="ri-dash-kpi__label">{label}</span>
        <span className={cn("ri-dash-kpi__icon", accent)}>
          <Icon size={16} aria-hidden />
        </span>
      </div>
      <strong className="ri-dash-kpi__value">{value}</strong>
      <span className="ri-dash-kpi__hint">{hint}</span>
    </article>
  );
}

export default function IntelligenceKpis({ kpis, reviewKpis }: Props) {
  const [tab, setTab] = useState<Tab>("corpus");

  return (
    <div className="ri-kpi-band">
      <div className="ri-kpi-band__tabs" role="tablist" aria-label="KPI categories">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "corpus"}
          className={cn("ri-kpi-band__tab", tab === "corpus" && "is-active")}
          onClick={() => setTab("corpus")}
        >
          Your corpus
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "review"}
          className={cn("ri-kpi-band__tab", tab === "review" && "is-active")}
          onClick={() => setTab("review")}
        >
          Review progress
        </button>
      </div>

      {tab === "corpus" ? (
        <div className="ri-dash-kpi-grid ri-dash-kpi-grid--compact" role="tabpanel">
          <KpiCard
            label="Corpus size"
            value={kpis.totalRecords.toLocaleString()}
            hint={
              (kpis.citedRecords ?? 0) > 0
                ? `${kpis.citedRecords} cited in notes`
                : kpis.activeSources > 0
                  ? `${kpis.activeSources} source databases`
                  : "In your research corpus"
            }
            icon={Database}
            accent="ri-accent-forest"
          />
          <KpiCard
            label="Cited"
            value={String(kpis.citedRecords ?? 0)}
            hint="In notes and writing"
            icon={FileCheck2}
            accent="ri-accent-green"
          />
          <KpiCard
            label="Sources"
            value={String(kpis.activeSources)}
            hint="In your corpus"
            icon={BarChart3}
            accent="ri-accent-blue"
          />
          <KpiCard
            label="Countries"
            value={String(kpis.countriesCovered)}
            hint="Geographic spread"
            icon={Globe2}
            accent="ri-accent-teal"
          />
        </div>
      ) : (
        <div className="ri-dash-kpi-grid ri-dash-kpi-grid--compact" role="tabpanel">
          <KpiCard
            label="Active reviews"
            value={String(reviewKpis.activeReviewProjects)}
            hint="Open review projects"
            icon={FolderKanban}
            accent="ri-accent-forest"
          />
          <KpiCard
            label="Awaiting screening"
            value={String(reviewKpis.awaitingScreening)}
            hint="Imported or title/abstract"
            icon={ClipboardList}
            accent="ri-accent-blue"
          />
          <KpiCard
            label="Final included"
            value={String(reviewKpis.finalIncludedRecords)}
            hint="In final dataset"
            icon={FileCheck2}
            accent="ri-accent-green"
          />
          <KpiCard
            label="SLR readiness"
            value={`${kpis.slrReadinessPercent ?? 0}%`}
            hint="Cited or used in writing"
            icon={Layers}
            accent="ri-accent-teal"
          />
        </div>
      )}

      <p className="ri-kpi-band__meta">
        {tab === "corpus" ? (
          <>
            <Activity size={13} aria-hidden /> {kpis.activityEvents ?? 0} recent workbench events
            {" · "}
            {reviewKpis.missingMetadata} records need metadata
          </>
        ) : (
          <>
            Top theme: {reviewKpis.strongestTheme ?? "—"}
            {" · "}
            Weakest geography: {reviewKpis.weakestGeography ?? "—"}
          </>
        )}
      </p>
    </div>
  );
}
