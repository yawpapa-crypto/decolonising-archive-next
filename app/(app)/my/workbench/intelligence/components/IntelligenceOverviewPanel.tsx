"use client";

import {
  AlertTriangle,
  BookMarked,
  FileText,
  FolderKanban,
  Globe2,
  List,
  Search,
  ShieldCheck,
} from "lucide-react";
import type {
  IntelligenceDistributionEntry,
  IntelligenceFacets,
  IntelligenceFilter,
  IntelligenceOverviewMetrics,
} from "@/lib/workbench-intelligence-types";
import IntelligenceInteractiveChart from "./IntelligenceInteractiveChart";
import IntelligenceDistributionBars from "./IntelligenceDistributionBars";
import { cn } from "@/lib/cn";

type StatAction =
  | { kind: "filter"; filter: IntelligenceFilter }
  | { kind: "facet"; key: "openAccess"; value: "open" }
  | { kind: "scroll"; targetId: string };

export type IntelligenceOverviewPanelProps = {
  overview: IntelligenceOverviewMetrics;
  facets: IntelligenceFacets;
  activeSource?: string | null;
  activeType?: string | null;
  onSourceSelect?: (label: string | null) => void;
  onTypeSelect?: (label: string | null) => void;
  onStatAction?: (action: StatAction) => void;
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
  active,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Search;
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={cn("ri-overview-stat", onClick && "ri-overview-stat--interactive", active && "is-active")}
      onClick={onClick}
    >
      <div className="ri-overview-stat__head">
        <span>{label}</span>
        <Icon size={15} aria-hidden />
      </div>
      <strong>{value}</strong>
      <span>{hint}</span>
    </Tag>
  );
}

export default function IntelligenceOverviewPanel({
  overview,
  facets,
  activeSource,
  activeType,
  onSourceSelect,
  onTypeSelect,
  onStatAction,
}: IntelligenceOverviewPanelProps) {
  const sourceEntries: IntelligenceDistributionEntry[] = facets.sourceDatabases.map((entry) => ({
    label: entry.label,
    count: entry.count,
    percent: overview.totalSavedRecords
      ? Math.round((entry.count / overview.totalSavedRecords) * 100)
      : 0,
  }));

  const typeEntries: IntelligenceDistributionEntry[] = facets.types.map((entry) => ({
    label: entry.label,
    count: entry.count,
    percent: overview.totalSavedRecords
      ? Math.round((entry.count / overview.totalSavedRecords) * 100)
      : 0,
  }));

  const geoEntries: IntelligenceDistributionEntry[] = [
    ...facets.countries.slice(0, 6),
    ...facets.regions.slice(0, 4),
  ].map((entry) => ({
    label: entry.label,
    count: entry.count,
    percent: overview.totalSavedRecords
      ? Math.round((entry.count / overview.totalSavedRecords) * 100)
      : 0,
  }));

  return (
    <div className="ri-overview-grid">
      <div className="ri-overview-stats">
        <StatCard
          label="Saved records"
          value={overview.totalSavedRecords.toLocaleString()}
          hint={`${overview.recordsInReadingLists} in reading lists`}
          icon={BookMarked}
          onClick={() => onStatAction?.({ kind: "filter", filter: "bookmarks" })}
        />
        <StatCard
          label="Saved searches"
          value={overview.totalSearches.toLocaleString()}
          hint="Documented retrieval strategy"
          icon={Search}
          onClick={() => onStatAction?.({ kind: "scroll", targetId: "ri-reviews" })}
        />
        <StatCard
          label="Review projects"
          value={overview.activeReviewProjects.toLocaleString()}
          hint="Active systematic/scoping work"
          icon={FolderKanban}
          onClick={() => onStatAction?.({ kind: "filter", filter: "projects" })}
        />
        <StatCard
          label="Reading lists"
          value={overview.readingListCount.toLocaleString()}
          hint={`${overview.recordsInReadingLists} linked records`}
          icon={List}
          onClick={() => onStatAction?.({ kind: "filter", filter: "reading_lists" })}
        />
        <StatCard
          label="Notes w/ citations"
          value={`${overview.notesWithCitations}/${overview.totalNotes}`}
          hint={`${overview.totalCitations} citations total`}
          icon={FileText}
          onClick={() => onStatAction?.({ kind: "filter", filter: "cited" })}
        />
        <StatCard
          label="Open access"
          value={`${overview.openAccessPercent}%`}
          hint={`${overview.externalSourcePercent}% external sources`}
          icon={ShieldCheck}
          onClick={() => onStatAction?.({ kind: "facet", key: "openAccess", value: "open" })}
        />
        <StatCard
          label="Countries"
          value={String(facets.countries.length)}
          hint="Distinct countries in corpus"
          icon={Globe2}
          onClick={() => onStatAction?.({ kind: "scroll", targetId: "ri-geography" })}
        />
        <StatCard
          label="Metadata warnings"
          value={overview.missingMetadataWarnings.toLocaleString()}
          hint="Records needing author/year/source"
          icon={AlertTriangle}
          onClick={() => onStatAction?.({ kind: "filter", filter: "needs_metadata" })}
        />
      </div>

      <div className="ri-overview-charts">
        <IntelligenceInteractiveChart
          title="Records by source"
          entries={sourceEntries}
          variant="pie"
          activeKey={activeSource ?? null}
          onSelect={onSourceSelect}
          emptyLabel="Save records from external sources or the archive to see source mix."
        />
        <IntelligenceInteractiveChart
          title="Records by type"
          entries={typeEntries}
          activeKey={activeType ?? null}
          onSelect={onTypeSelect}
          emptyLabel="Record types appear once saved items include type metadata."
        />
        <IntelligenceDistributionBars title="Top themes" entries={facets.themes.map((entry) => ({
          label: entry.label,
          count: entry.count,
          percent: overview.totalSavedRecords
            ? Math.round((entry.count / overview.totalSavedRecords) * 100)
            : 0,
        }))} />
        <IntelligenceDistributionBars
          title="Top countries/regions"
          entries={geoEntries}
          emptyLabel="Add country or region metadata to see geographic spread."
        />
      </div>
    </div>
  );
}
