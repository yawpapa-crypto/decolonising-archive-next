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
  filterIntelligenceItems,
  intelligenceItemsToCsv,
  literatureReviewToCsv,
  reviewScreeningToCsv,
} from "@/lib/workbench-intelligence-client";
import { derivePipelineStages } from "@/lib/workbench-intelligence-pipeline";
import type {
  IntelligenceBehaviorInsight,
  IntelligenceFacetFilters,
  IntelligenceFilter,
  IntelligenceSnapshot,
  IntelligenceSuggestion,
} from "@/lib/workbench-intelligence-types";
import IntelligenceActivityFeed from "./components/IntelligenceActivityFeed";
import IntelligenceComparison from "./components/IntelligenceComparison";
import IntelligenceFacetsPanel from "./components/IntelligenceFacetsPanel";
import IntelligenceGaps from "./components/IntelligenceGaps";
import IntelligenceHeader from "./components/IntelligenceHeader";
import IntelligenceKpis from "./components/IntelligenceKpis";
import IntelligencePrivacyPanel from "./components/IntelligencePrivacyPanel";
import IntelligenceRecordsTable from "./components/IntelligenceRecordsTable";
import IntelligenceResearchCorpus from "./components/IntelligenceResearchCorpus";
import IntelligenceReviewWorkspace from "./components/IntelligenceReviewWorkspace";
import IntelligenceSectionNav from "./components/IntelligenceSectionNav";
import IntelligenceSources from "./components/IntelligenceSources";
import {
  scrollToIntelligenceSection,
  useIntelligenceSectionSpy,
} from "./hooks/useIntelligenceSectionSpy";
import "@/app/styles/workbench-intelligence-dashboard.css";

const IntelligenceGlobalMap = dynamic(() => import("./components/IntelligenceGlobalMap"), {
  ssr: false,
  loading: () => (
    <section className="ri-dash-map-panel ri-dash-map-panel--loading" aria-busy="true">
      <p>Loading global map…</p>
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
  const [isPending, startTransition] = useTransition();
  const activeSection = useIntelligenceSectionSpy("overview");

  const facetState = useMemo(
    () => ({
      ...facets,
      placeId: activePlaceId ?? facets.placeId,
    }),
    [facets, activePlaceId],
  );

  const selectedCountry = facets.country ?? null;

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
  const activeFacetCount = Object.values(facetState).filter((v) => v != null && v !== false).length;

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
  }

  function applyComparisonFilter(presetId: string | null) {
    setActivePlaceId(null);
    setActiveComparisonId(presetId);

    if (!presetId) {
      setFacets({ ...EMPTY_FACETS });
      return;
    }

    setFacets({ ...EMPTY_FACETS, ...COMPARISON_FACETS[presetId] });
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

  function applyGapFilter(hint?: IntelligenceFacetFilters) {
    if (!hint) return;
    setActivePlaceId(null);
    setActiveComparisonId(null);
    setFacets((current) => ({ ...current, ...hint }));
  }

  function applyInsightFilter(hint?: IntelligenceBehaviorInsight["filterHint"]) {
    if (!hint) return;
    setActivePlaceId(null);
    setActiveComparisonId(null);
    setFacets((current) => ({ ...current, ...hint }));
    scrollToIntelligenceSection("records");
  }

  function clearAllFilters() {
    setFacets({ ...EMPTY_FACETS });
    setActivePlaceId(null);
    setActiveComparisonId(null);
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
      router.refresh();
      setSyncing(false);
    });
  }

  return (
    <section className="ri-page ri-dash">
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

      <IntelligenceSectionNav active={activeSection} onNavigate={scrollToIntelligenceSection} />

      <div id="ri-review" className="ri-zone ri-zone--panel">
        <IntelligenceReviewWorkspace
          projects={snapshot.reviewProjects}
          screenings={snapshot.reviewScreenings}
          savedSearches={snapshot.savedSearchInsights}
          prismaCounts={snapshot.prismaCounts}
          pipelineStages={pipelineStages}
        />
      </div>

      <div id="ri-intelligence" className="ri-zone">
        <IntelligenceResearchCorpus
          review={snapshot.literatureReview}
          insights={snapshot.behaviorInsights}
          patterns={snapshot.readingPatterns}
          onApplyFilter={applyInsightFilter}
        />

        <IntelligenceActivityFeed entries={snapshot.activityFeed} />

        <IntelligenceGlobalMap
          points={snapshot.worldMap}
          locations={snapshot.locations}
          cityPlaces={snapshot.cityPlaces}
          items={snapshot.items}
          activePlaceId={activePlaceId}
          selectedCountry={selectedCountry}
          onSelectPlace={applyPlaceFilter}
        />

        <IntelligenceComparison
          comparisons={snapshot.comparisons}
          activePresetId={activeComparisonId}
          onSelectPreset={applyComparisonFilter}
        />

        <IntelligenceSources sources={snapshot.sources} />

        <IntelligenceGaps gaps={snapshot.gaps} onApplyFilter={applyGapFilter} />

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

      <div id="ri-records" className="ri-zone ri-zone--panel">
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
                  setActivePlaceId(null);
                  setActiveComparisonId(null);
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
          setActivePlaceId(null);
          setActiveComparisonId(null);
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
