"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  dismissIntelligenceSuggestion,
  refreshIntelligenceSnapshot,
} from "@/lib/workbench-activity-actions";
import {
  EMPTY_FACETS,
  describeActiveIntelligenceFilters,
  filterIntelligenceItems,
  intelligenceItemsToCsv,
  literatureReviewToCsv,
  reviewScreeningToCsv,
  sourceLabelToFacetValue,
} from "@/lib/workbench-intelligence-client";
import { getReviewIntelligence, getTemporalCoverage } from "@/lib/workbench-intelligence-metrics";
import { derivePipelineStages } from "@/lib/workbench-intelligence-pipeline";
import type {
  IntelligenceBehaviorInsight,
  IntelligenceDashboardPayload,
  IntelligenceFacetFilters,
  IntelligenceFilter,
  IntelligenceSnapshot,
  IntelligenceSuggestion,
} from "@/lib/workbench-intelligence-types";
import IntelligenceActiveFilterBar from "./components/IntelligenceActiveFilterBar";
import IntelligenceActivityFeed from "./components/IntelligenceActivityFeed";
import IntelligenceCitationPanel from "./components/IntelligenceCitationPanel";
import IntelligenceComparison from "./components/IntelligenceComparison";
import IntelligenceFacetsPanel from "./components/IntelligenceFacetsPanel";
import IntelligenceGaps from "./components/IntelligenceGaps";
import IntelligenceHeader from "./components/IntelligenceHeader";
import IntelligenceKpis from "./components/IntelligenceKpis";
import IntelligenceOverviewPanel from "./components/IntelligenceOverviewPanel";
import IntelligencePrivacyPanel from "./components/IntelligencePrivacyPanel";
import IntelligenceRecommendations from "./components/IntelligenceRecommendations";
import IntelligenceRecordsTable from "./components/IntelligenceRecordsTable";
import IntelligenceResearchCorpus from "./components/IntelligenceResearchCorpus";
import IntelligenceReviewStats from "./components/IntelligenceReviewStats";
import IntelligenceReviewWorkspace from "./components/IntelligenceReviewWorkspace";
import IntelligenceSourcesPanel from "./components/IntelligenceSourcesPanel";
import IntelligenceTimeline from "./components/IntelligenceTimeline";
import { cn } from "@/lib/cn";
import "@/app/styles/workbench-intelligence-dashboard.css";

const INTELLIGENCE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "geography", label: "Geography" },
  { id: "timeline", label: "Timeline" },
  { id: "reviews", label: "Reviews" },
  { id: "citations", label: "Citations" },
  { id: "recommendations", label: "Recommendations" },
  { id: "records", label: "Records" },
] as const;

type IntelligenceTabId = (typeof INTELLIGENCE_TABS)[number]["id"];

const WorkbenchGeographyMap = dynamic(() => import("./components/WorkbenchGeographyMap"), {
  ssr: false,
  loading: () => (
    <section className="ri-panel ri-geo-map ri-geo-map--loading" aria-busy="true">
      <div className="ri-widget-skeleton" />
      <p>Loading geographic coverage…</p>
    </section>
  ),
});

const FILTER_CHIPS: { value: IntelligenceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bookmarks", label: "Saved" },
  { value: "cited", label: "Cited" },
  { value: "uncited", label: "Uncited" },
  { value: "needs_metadata", label: "Needs metadata" },
  { value: "needs_action", label: "Needs action" },
];

const COMPARISON_FACETS: Record<string, Partial<IntelligenceFacetFilters>> = {
  ghana: { country: "Ghana" },
  nigeria: { country: "Nigeria" },
  brazil: { country: "Brazil" },
  uk: { country: "United Kingdom" },
  caribbean: { region: "Caribbean" },
  australia: { country: "Australia" },
};

function downloadTextFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function placeLabel(snapshot: IntelligenceSnapshot, placeId: string) {
  return (
    snapshot.worldMap.find((p) => p.placeId === placeId)?.label ??
    snapshot.locations.find((l) => l.placeId === placeId)?.label ??
    snapshot.cityPlaces.find((c) => c.placeId === placeId)?.label ??
    placeId
  );
}

function scrollToRecordsPanel() {
  document.getElementById("ri-records")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyPayloadToSnapshot(
  current: IntelligenceSnapshot,
  payload: IntelligenceDashboardPayload,
): IntelligenceSnapshot {
  return {
    ...current,
    items: payload.records,
    overviewMetrics: payload.overview,
    sourceIntelligence: payload.sourceDistribution,
    citationIntelligence: payload.citations,
    gaps: payload.warnings,
    literatureReview: {
      ...current.literatureReview,
      yearSpread: payload.timeline.yearSpread,
    },
  };
}

export default function WorkbenchIntelligenceClient({
  snapshot: initialSnapshot,
}: {
  snapshot: IntelligenceSnapshot;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [filter, setFilter] = useState<IntelligenceFilter>("all");
  const [search, setSearch] = useState("");
  const [facets, setFacets] = useState<IntelligenceFacetFilters>({ ...EMPTY_FACETS });
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [facetDrawerOpen, setFacetDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<IntelligenceTabId>("overview");
  const [isPending, startTransition] = useTransition();

  const facetState = useMemo(
    () => ({
      ...facets,
      placeId: activePlaceId ?? facets.placeId,
    }),
    [facets, activePlaceId],
  );

  const selectedCountry = facets.country ?? null;
  const selectedRegion = facets.region ?? null;
  const selectedSource = facets.sourceDatabase ?? null;
  const selectedType = facets.type ?? null;
  const selectedYear = facets.year ?? null;
  const selectedAuthor = facets.creator ?? null;

  const filteredItems = useMemo(
    () =>
      filterIntelligenceItems(snapshot.items, {
        filter,
        search,
        facets: facetState,
      }),
    [snapshot.items, filter, search, facetState],
  );

  const pipelineStages = useMemo(() => derivePipelineStages(snapshot.items), [snapshot.items]);
  const temporalCoverage = useMemo(() => getTemporalCoverage(snapshot), [snapshot]);
  const reviewIntelligence = useMemo(() => getReviewIntelligence(snapshot), [snapshot]);
  const activeFacetCount = Object.values(facetState).filter((v) => v != null && v !== false).length;
  const activeFilterChips = useMemo(
    () => describeActiveIntelligenceFilters(filter, facetState),
    [filter, facetState],
  );

  function resetPlaceState() {
    setActivePlaceId(null);
    setActiveComparisonId(null);
  }

  function revealRecords() {
    setActiveTab("records");
    window.requestAnimationFrame(scrollToRecordsPanel);
  }

  function applyFacetUpdate(next: Partial<IntelligenceFacetFilters>, nextFilter?: IntelligenceFilter) {
    resetPlaceState();
    if (nextFilter) setFilter(nextFilter);
    setFacets({ ...EMPTY_FACETS, ...next });
    setActiveTab("records");
    window.requestAnimationFrame(scrollToRecordsPanel);
  }

  function applyPlaceFilter(placeId: string | null) {
    setActiveComparisonId(null);
    setActivePlaceId(placeId);

    if (!placeId) {
      setFacets({ ...EMPTY_FACETS });
      return;
    }

    const point =
      snapshot.worldMap.find((p) => p.placeId === placeId) ??
      snapshot.locations.find((l) => l.placeId === placeId);
    const city = snapshot.cityPlaces.find((c) => c.placeId === placeId);

    const next: IntelligenceFacetFilters = { ...EMPTY_FACETS, placeId };

    if (city) {
      next.city = city.label;
      next.country = city.country;
    } else if (point) {
      switch (point.kind) {
        case "continent":
          next.continent = point.label;
          break;
        case "country":
          next.country = point.label;
          break;
        case "region":
          next.region = point.label;
          break;
        case "diaspora":
          next.diaspora = true;
          break;
        default:
          break;
      }
    } else if (placeId.startsWith("region:")) {
      next.region = placeLabel(snapshot, placeId);
    } else if (placeId.startsWith("country:")) {
      next.country = placeLabel(snapshot, placeId);
    }

    setFacets(next);
    setActiveTab("records");
    window.requestAnimationFrame(scrollToRecordsPanel);
  }

  function applyComparisonFilter(presetId: string | null) {
    setActivePlaceId(null);
    setActiveComparisonId(presetId);

    if (!presetId) {
      setFacets({ ...EMPTY_FACETS });
      return;
    }

    setFacets({ ...EMPTY_FACETS, ...COMPARISON_FACETS[presetId] });
    setActiveTab("records");
    window.requestAnimationFrame(scrollToRecordsPanel);
  }

  function applyCountryFilter(country: string | null) {
    applyFacetUpdate(country ? { country, region: null, city: null } : {});
  }

  function applyRegionFilter(region: string | null) {
    applyFacetUpdate(region ? { region, country: null, city: null } : {});
  }

  function applySourceFilter(label: string | null) {
    if (!label) {
      applyFacetUpdate({});
      return;
    }
    applyFacetUpdate({
      sourceDatabase: sourceLabelToFacetValue(label, snapshot.facets.sourceDatabases),
    });
  }

  function applyTypeFilter(label: string | null) {
    if (!label) {
      applyFacetUpdate({});
      return;
    }
    const match = snapshot.facets.types.find((entry) => entry.label === label);
    applyFacetUpdate({ type: match?.value ?? label });
  }

  function applyYearFilter(year: string | null) {
    applyFacetUpdate(year ? { year } : {});
  }

  function applyAuthorFilter(author: string | null) {
    applyFacetUpdate(author ? { creator: author } : {});
  }

  function applyGapFilter(hint?: IntelligenceFacetFilters) {
    if (!hint) return;
    applyFacetUpdate(hint);
  }

  function applyInsightFilter(hint?: IntelligenceBehaviorInsight["filterHint"]) {
    if (!hint) return;
    applyFacetUpdate(hint);
  }

  function clearAllFilters() {
    setFilter("all");
    setFacets({ ...EMPTY_FACETS });
    setActivePlaceId(null);
    setActiveComparisonId(null);
  }

  function handleDismiss(suggestionId: string) {
    startTransition(async () => {
      const result = await dismissIntelligenceSuggestion(suggestionId);
      if (!result.ok) return;
      setSnapshot((current) => ({
        ...current,
        suggestions: current.suggestions.filter((item) => item.id !== suggestionId),
        preferences: current.preferences
          ? {
              ...current.preferences,
              dismissed_suggestions: [...current.preferences.dismissed_suggestions, suggestionId],
            }
          : current.preferences,
      }));
    });
  }

  function handleExport() {
    downloadTextFile(
      "research-intelligence.csv",
      "text/csv",
      intelligenceItemsToCsv(filteredItems),
    );
  }

  function handleExportSlr() {
    const projectId = snapshot.reviewProjects[0]?.id;
    const screeningRows = projectId
      ? snapshot.reviewScreenings.filter((row) => row.projectId === projectId)
      : snapshot.reviewScreenings;
    const content =
      screeningRows.length ?
        reviewScreeningToCsv(screeningRows)
      : literatureReviewToCsv(snapshot.literatureReview, filteredItems);
    downloadTextFile(
      screeningRows.length ? "review-screening-dataset.csv" : "systematic-literature-review.csv",
      "text/csv",
      content,
    );
  }

  function handleSync() {
    setSyncing(true);
    startTransition(async () => {
      await refreshIntelligenceSnapshot();
      try {
        const response = await fetch("/api/workbench/intelligence", { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as IntelligenceDashboardPayload;
          setSnapshot((current) => applyPayloadToSnapshot(current, payload));
        }
      } catch {
        router.refresh();
      } finally {
        setSyncing(false);
      }
    });
  }

  return (
    <section className="workbench-intelligence ri-page ri-dash">
      <IntelligenceHeader
        onExport={handleExport}
        onExportSlr={handleExportSlr}
        onSync={handleSync}
        syncing={syncing}
      />

      {snapshot.errors.length ? (
        <p className="workbench-flag" role="alert">
          {snapshot.errors.join(" ")}
        </p>
      ) : null}

      <div id="ri-overview" className="ri-zone ri-zone--overview">
        <IntelligenceKpis kpis={snapshot.dashboard} reviewKpis={snapshot.reviewKpis} />
      </div>

      <nav className="workbench-intelligence-tabs" aria-label="Research intelligence sections">
        {INTELLIGENCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(activeTab === tab.id && "is-active")}
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        id="ri-overview-panel"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "overview"}
      >
        <IntelligenceOverviewPanel
          overview={snapshot.overviewMetrics}
          facets={snapshot.facets}
          activeSource={selectedSource}
          activeType={selectedType}
          onSourceSelect={applySourceFilter}
          onTypeSelect={applyTypeFilter}
          onStatAction={(action) => {
            if (action.kind === "scroll") {
              const targetTab: IntelligenceTabId =
                action.targetId === "ri-geography"
                  ? "geography"
                  : action.targetId === "ri-reviews"
                    ? "reviews"
                    : "overview";
              setActiveTab(targetTab);
              window.requestAnimationFrame(() => {
                document.getElementById(action.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
              });
              return;
            }
            if (action.kind === "filter") {
              applyFacetUpdate({}, action.filter);
              setActiveTab("records");
              return;
            }
            applyFacetUpdate({ openAccess: action.value });
            setActiveTab("records");
          }}
        />

        {snapshot.suggestions.length ? (
          <div className="workbench-intelligence-priority">
            <section className="ri-panel workbench-intelligence-recommendation" aria-label="Urgent suggested actions">
              <h3 className="ri-section-title">Suggested actions</h3>
              <ul className="ri-suggestions">
                {snapshot.suggestions.slice(0, 3).map((suggestion: IntelligenceSuggestion) => (
                  <li key={suggestion.id} className="ri-suggestion">
                    <div>
                      <strong>{suggestion.title}</strong>
                      <p>{suggestion.body}</p>
                    </div>
                    <div className="ri-suggestion__actions">
                      {suggestion.actionHref ? (
                        <Link href={suggestion.actionHref} className="ri-btn ri-btn--primary">
                          {suggestion.actionLabel}
                        </Link>
                      ) : (
                        <button type="button" className="ri-btn ri-btn--primary" onClick={revealRecords}>
                          View records
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>

      <div
        id="ri-sources"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "sources"}
      >
        <IntelligenceSourcesPanel
          sources={snapshot.sourceIntelligence}
          activeSource={selectedSource}
          onSourceSelect={applySourceFilter}
        />
      </div>

      <div
        id="ri-geography"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "geography"}
      >
        <WorkbenchGeographyMap
          selectedCountry={selectedCountry}
          selectedRegion={selectedRegion}
          onSelectCountry={applyCountryFilter}
          onSelectRegion={applyRegionFilter}
        />
        <IntelligenceComparison
          comparisons={snapshot.comparisons}
          activePresetId={activeComparisonId}
          onSelectPreset={applyComparisonFilter}
        />
      </div>

      <div
        id="ri-timeline"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "timeline"}
      >
        <IntelligenceTimeline
          temporal={temporalCoverage}
          activeYear={selectedYear}
          onYearSelect={applyYearFilter}
        />
      </div>

      <div
        id="ri-reviews"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "reviews"}
      >
        <IntelligenceReviewStats reviews={reviewIntelligence} />
        <IntelligenceReviewWorkspace
          projects={snapshot.reviewProjects}
          screenings={snapshot.reviewScreenings}
          savedSearches={snapshot.savedSearchInsights}
          prismaCounts={snapshot.prismaCounts}
          pipelineStages={pipelineStages}
        />
      </div>

      <div
        id="ri-citations"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "citations"}
      >
        <IntelligenceCitationPanel
          citation={snapshot.citationIntelligence}
          activeAuthor={selectedAuthor}
          onAuthorSelect={applyAuthorFilter}
          onFilterRecords={(nextFilter) => {
            applyFacetUpdate({}, nextFilter);
            setActiveTab("records");
          }}
        />
      </div>

      <div
        id="ri-recommendations"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "recommendations"}
      >
        <IntelligenceResearchCorpus
          review={snapshot.literatureReview}
          insights={snapshot.behaviorInsights}
          patterns={snapshot.readingPatterns}
          onApplyFilter={applyInsightFilter}
        />
        <IntelligenceActivityFeed entries={snapshot.activityFeed} />
        <IntelligenceGaps gaps={snapshot.gaps} onApplyFilter={applyGapFilter} />
        <IntelligenceRecommendations recommendations={snapshot.recommendations} />
        {snapshot.suggestions.length ? (
          <section className="ri-panel" aria-label="Suggested actions">
            <h3 className="ri-section-title">Suggested actions</h3>
            <ul className="ri-suggestions">
              {snapshot.suggestions.map((suggestion: IntelligenceSuggestion) => (
                <li key={suggestion.id} className="ri-suggestion">
                  <div>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.body}</p>
                  </div>
                  <div className="ri-suggestion__actions">
                    {suggestion.actionHref ? (
                      <Link href={suggestion.actionHref} className="ri-btn ri-btn--primary">
                        {suggestion.actionLabel}
                      </Link>
                    ) : null}
                    {suggestion.dismissible ? (
                      <button
                        type="button"
                        className="ri-btn ri-btn--secondary"
                        disabled={isPending}
                        onClick={() => handleDismiss(suggestion.id)}
                      >
                        Dismiss
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div
        id="ri-records"
        className="ri-zone ri-zone--panel workbench-intelligence-tab-panel"
        hidden={activeTab !== "records"}
      >
        <div className="ri-section-shell">
          <div className="ri-section-shell__head">
            <div>
              <p className="ri-eyebrow">Records</p>
              <h2 className="ri-section-shell__title">Your research records</h2>
            </div>
            <button
              type="button"
              className="ri-btn ri-btn--secondary ri-facet-drawer-trigger"
              onClick={() => setFacetDrawerOpen(true)}
            >
              <SlidersHorizontal size={16} aria-hidden />
              Filters{activeFacetCount ? ` (${activeFacetCount})` : ""}
            </button>
          </div>

          <IntelligenceActiveFilterBar
            chips={activeFilterChips}
            resultCount={filteredItems.length}
            onClear={clearAllFilters}
          />

          <div className="ri-dash-body ri-dash-body--records">
            <IntelligenceRecordsTable
              items={filteredItems}
              globalSearch={search}
              onSearchChange={setSearch}
              filter={filter}
              onFilterChange={setFilter}
              filterChips={FILTER_CHIPS}
            />

            <div className="ri-dash-facets-desktop">
              <IntelligenceFacetsPanel
                facets={snapshot.facets}
                active={facetState}
                onChange={(next) => {
                  resetPlaceState();
                  setFacets(next);
                }}
                onClear={clearAllFilters}
                resultCount={filteredItems.length}
                openAccessPercent={snapshot.dashboard.openAccessPercent}
                variant="sidebar"
              />
            </div>
          </div>
        </div>

        <IntelligencePrivacyPanel />
      </div>

      <IntelligenceFacetsPanel
        facets={snapshot.facets}
        active={facetState}
        onChange={(next) => {
          resetPlaceState();
          setFacets(next);
        }}
        onClear={clearAllFilters}
        resultCount={filteredItems.length}
        openAccessPercent={snapshot.dashboard.openAccessPercent}
        variant="drawer"
        drawerOpen={facetDrawerOpen}
        onDrawerClose={() => setFacetDrawerOpen(false)}
      />
    </section>
  );
}
