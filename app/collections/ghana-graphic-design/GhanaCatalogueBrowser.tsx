"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogueRecord, CatalogueStats, EvidenceStatus } from "@/lib/catalogue/types";
import {
  EVIDENCE_BADGE_CLASS,
  EVIDENCE_STATUS_DESCRIPTIONS,
  evidenceStatusLabel,
} from "@/lib/catalogue/evidence-status";
import {
  recordDateLabel,
  recordExcerpt,
  recordMakerLabel,
} from "@/lib/catalogue/record-display";
import RecordResearchActions from "@/components/research/RecordResearchActions";
import {
  ghanaCatalogueResearchInput,
  GHANA_COLLECTION_SLUG,
} from "@/lib/research/collection-record-research";
import {
  GHANA_COLLECTION_FILTER_PILLS,
  GHANA_SUBCOLLECTIONS,
  getSubcollectionByFilter,
  type GhanaCollectionFilterId,
  type GhanaSubcollectionId,
} from "@/lib/data/ghana-subcollections";

type TaxonomyRow = { taxonomyType: string; code: string; label: string };

type CatalogueListRecord = CatalogueRecord & { thumbnailUrl?: string | null };

type ApiResponse = {
  items: CatalogueListRecord[];
  total: number;
  page: number;
  limit: number;
  stats: CatalogueStats;
};

type SortOption =
  | "newest"
  | "oldest"
  | "title"
  | "maker"
  | "region"
  | "evidence"
  | "date_asc";

const EVIDENCE_FILTER_OPTIONS: { value: EvidenceStatus | "all"; label: string }[] = [
  { value: "all", label: "All evidence statuses" },
  { value: "verified", label: "Verified" },
  { value: "partially_verified", label: "Partially verified" },
  { value: "source_located", label: "Source located" },
  { value: "source_checked", label: "Source checked" },
  { value: "research_lead", label: "Research lead" },
  { value: "disputed", label: "Disputed" },
  { value: "community_review_required", label: "Community review" },
  { value: "rights_review_required", label: "Rights review" },
];

const RECORD_TYPE_PILLS = [
  { value: "", label: "All" },
  { value: "museum object", label: "Objects" },
  { value: "person", label: "People" },
  { value: "publication", label: "Publications" },
  { value: "institution", label: "Institutions" },
  { value: "documented practice", label: "Practices" },
];

function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span
      className={`ghana-evidence-badge ${EVIDENCE_BADGE_CLASS[status]}`}
      title={EVIDENCE_STATUS_DESCRIPTIONS[status]}
    >
      {evidenceStatusLabel(status)}
    </span>
  );
}

function CardThumbnail({ record }: { record: CatalogueListRecord }) {
  const [broken, setBroken] = useState(false);
  const url = record.thumbnailUrl;

  if (!url || broken) {
    return (
      <div className="ghana-catalogue-card-thumb ghana-catalogue-card-thumb--placeholder" aria-hidden="true">
        <span className="ghana-catalogue-card-thumb-type">{record.recordType}</span>
      </div>
    );
  }

  return (
    <div className="ghana-catalogue-card-thumb" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} />
    </div>
  );
}

function CatalogueCard({ record }: { record: CatalogueListRecord }) {
  const collectionNo = record.rawCsvRow?.collection_number;
  const institution = record.institutionOrCollection;
  const maker = recordMakerLabel(record);
  const researchInput = ghanaCatalogueResearchInput(record);
  const href = `/collections/${GHANA_COLLECTION_SLUG}/records/${encodeURIComponent(record.id)}`;

  return (
    <article className="ghana-item-card is-text-card ghana-catalogue-card ghana-catalogue-card--refined ghana-catalogue-card--with-actions">
      <Link href={href} className="ghana-catalogue-card-link" aria-label={`View record: ${record.title}`}>
        <div className="ghana-catalogue-card-accent" aria-hidden="true" />
        <CardThumbnail record={record} />
        <div className="ghana-catalogue-card-header">
          <span className="ghana-catalogue-card-type">{record.recordType}</span>
          <EvidenceBadge status={record.evidenceStatus} />
        </div>
        <div className="ghana-item-body ghana-catalogue-card-body">
          <div className="ghana-item-meta">
            {recordDateLabel(record) || "Date not stated"}
            {record.locality ? ` · ${record.locality}` : ""}
          </div>
          <div className="ghana-item-title">{record.title}</div>
          {maker && <div className="ghana-item-maker">{maker}</div>}
          <p className="ghana-item-excerpt">{recordExcerpt(record, 100)}</p>
          {(institution || collectionNo) && (
            <div className="ghana-item-source">
              {[institution, collectionNo].filter(Boolean).join(" · ")}
            </div>
          )}
          <span className="ghana-catalogue-card-cta">View record</span>
        </div>
      </Link>
      <div className="ghana-catalogue-card-actions" onClick={(e) => e.preventDefault()}>
        <RecordResearchActions input={researchInput} variant="compact" />
      </div>
    </article>
  );
}

export default function GhanaCatalogueBrowser({
  collectionFilter = "all",
  onCollectionFilterChange,
  activeSubcollection = null,
  onSubcollectionChange,
}: {
  collectionFilter?: GhanaCollectionFilterId;
  onCollectionFilterChange?: (filterId: GhanaCollectionFilterId) => void;
  activeSubcollection?: GhanaSubcollectionId | null;
  onSubcollectionChange?: (id: GhanaSubcollectionId | null) => void;
}) {
  const [items, setItems] = useState<CatalogueListRecord[]>([]);
  const [stats, setStats] = useState<CatalogueStats | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [visualSystemFilter, setVisualSystemFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [localityFilter, setLocalityFilter] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [rightsFilter, setRightsFilter] = useState("");
  const [communityFilter, setCommunityFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 280);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const periods = useMemo(
    () => taxonomy.filter((t) => t.taxonomyType === "historical_period"),
    [taxonomy],
  );
  const visualSystems = useMemo(
    () => taxonomy.filter((t) => t.taxonomyType === "visual_system"),
    [taxonomy],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (collectionFilter !== "all") n++;
    if (activeSubcollection) n++;
    if (evidenceFilter !== "all") n++;
    if (periodFilter) n++;
    if (visualSystemFilter) n++;
    if (regionFilter.trim()) n++;
    if (localityFilter.trim()) n++;
    if (recordTypeFilter.trim()) n++;
    if (creatorFilter.trim()) n++;
    if (institutionFilter.trim()) n++;
    if (rightsFilter) n++;
    if (communityFilter) n++;
    if (debouncedSearch.trim()) n++;
    return n;
  }, [
    collectionFilter,
    activeSubcollection,
    evidenceFilter,
    periodFilter,
    visualSystemFilter,
    regionFilter,
    localityFilter,
    recordTypeFilter,
    creatorFilter,
    institutionFilter,
    rightsFilter,
    communityFilter,
    debouncedSearch,
  ]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "24");
      params.set("sort", sortBy);
      if (activeSubcollection) {
        params.set("subcollectionId", activeSubcollection);
      } else if (collectionFilter !== "all") {
        params.set("ghanaFilter", collectionFilter);
      }
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (evidenceFilter !== "all") params.set("evidenceStatus", evidenceFilter);
      if (periodFilter) params.set("periodId", periodFilter);
      if (visualSystemFilter) params.set("visualSystemId", visualSystemFilter);
      if (regionFilter) params.set("region", regionFilter);
      if (localityFilter) params.set("locality", localityFilter);
      if (recordTypeFilter) params.set("recordType", recordTypeFilter);
      if (creatorFilter) params.set("creator", creatorFilter);
      if (institutionFilter) params.set("institution", institutionFilter);
      if (rightsFilter) params.set("rightsStatus", rightsFilter);
      if (communityFilter) params.set("communityReview", "true");

      const res = await fetch(`/api/catalogue/records?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.hint ?? body.error ?? "Failed to load catalogue");
      }
      const data: ApiResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalogue");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sortBy,
    debouncedSearch,
    evidenceFilter,
    periodFilter,
    visualSystemFilter,
    regionFilter,
    localityFilter,
    recordTypeFilter,
    creatorFilter,
    institutionFilter,
    rightsFilter,
    communityFilter,
    collectionFilter,
    activeSubcollection,
  ]);

  useEffect(() => {
    fetch("/api/catalogue/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.taxonomy) setTaxonomy(d.taxonomy);
        if (d.stats) setStats(d.stats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.max(1, Math.ceil(total / 24));

  const clearFilters = () => {
    onCollectionFilterChange?.("all");
    onSubcollectionChange?.(null);
    setSearchQuery("");
    setDebouncedSearch("");
    setEvidenceFilter("all");
    setPeriodFilter("");
    setVisualSystemFilter("");
    setRegionFilter("");
    setLocalityFilter("");
    setRecordTypeFilter("");
    setCreatorFilter("");
    setInstitutionFilter("");
    setRightsFilter("");
    setCommunityFilter(false);
    setPage(1);
  };

  const activeSection = activeSubcollection
    ? GHANA_SUBCOLLECTIONS.find((s) => s.id === activeSubcollection)
    : getSubcollectionByFilter(collectionFilter);

  return (
    <div className="ghana-catalogue-browser ghana-catalogue-browser--editorial">
      <div
        className="ghana-collection-filter-pills"
        role="toolbar"
        aria-label="Browse by subcollection"
      >
        {GHANA_COLLECTION_FILTER_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            className={`ghana-collection-filter-pill${collectionFilter === pill.id ? " is-active" : ""}`}
            onClick={() => {
              onSubcollectionChange?.(null);
              onCollectionFilterChange?.(pill.id);
              setPage(1);
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {activeSection && (
        <div className="ghana-collection-filter-context">
          <h3 className="ghana-collection-filter-context-title">{activeSection.title}</h3>
          <p className="ghana-collection-filter-context-desc">{activeSection.summary}</p>
        </div>
      )}

      <div className="ghana-record-type-pills" role="toolbar" aria-label="Record type">
        {RECORD_TYPE_PILLS.map((pill) => (
          <button
            key={pill.value || "all"}
            type="button"
            className={`ghana-type-pill ghana-type-pill--${pill.value ? pill.value.replace(/\s+/g, "-") : "all"}${recordTypeFilter === pill.value ? " is-active" : ""}`}
            onClick={() => {
              setRecordTypeFilter(pill.value);
              setPage(1);
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="ghana-browse-layout ghana-browse-layout--editorial">
        <aside className={`ghana-sidebar ghana-sidebar--editorial${showFilters ? " is-open" : ""}`}>
          <div className="ghana-sidebar-header">
            <span className="ghana-sidebar-title">Refine</span>
            {activeFilterCount > 0 && (
              <button type="button" className="ghana-sidebar-clear" onClick={clearFilters}>
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="ghana-sidebar-search">
            <label htmlFor="ghana-sidebar-search" className="ghana-filter-heading">
              Search
            </label>
            <input
              id="ghana-sidebar-search"
              type="search"
              className="ghana-filter-text ghana-sidebar-search-input"
              placeholder="Makers, objects, places…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              aria-label="Search catalogue"
            />
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-evidence-filter" className="ghana-filter-heading">
              Evidence status
            </label>
            <select
              id="ghana-evidence-filter"
              className="ghana-sort-select ghana-filter-select"
              value={evidenceFilter}
              onChange={(e) => {
                setEvidenceFilter(e.target.value as EvidenceStatus | "all");
                setPage(1);
              }}
            >
              {EVIDENCE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-period-filter" className="ghana-filter-heading">
              Historical period
            </label>
            <select
              id="ghana-period-filter"
              className="ghana-sort-select ghana-filter-select"
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All periods</option>
              {periods.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-visual-filter" className="ghana-filter-heading">
              Visual system
            </label>
            <select
              id="ghana-visual-filter"
              className="ghana-sort-select ghana-filter-select"
              value={visualSystemFilter}
              onChange={(e) => {
                setVisualSystemFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All visual systems</option>
              {visualSystems.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-region-filter" className="ghana-filter-heading">
              Region
            </label>
            <input
              id="ghana-region-filter"
              type="text"
              className="ghana-filter-text"
              placeholder="e.g. Ashanti"
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-locality-filter" className="ghana-filter-heading">
              Locality
            </label>
            <input
              id="ghana-locality-filter"
              type="text"
              className="ghana-filter-text"
              placeholder="e.g. Accra"
              value={localityFilter}
              onChange={(e) => {
                setLocalityFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-maker-filter" className="ghana-filter-heading">
              Maker / authority
            </label>
            <input
              id="ghana-maker-filter"
              type="text"
              className="ghana-filter-text"
              placeholder="Creator name"
              value={creatorFilter}
              onChange={(e) => {
                setCreatorFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="ghana-filter-section">
            <label htmlFor="ghana-rights-filter" className="ghana-filter-heading">
              Rights status
            </label>
            <select
              id="ghana-rights-filter"
              className="ghana-sort-select ghana-filter-select"
              value={rightsFilter}
              onChange={(e) => {
                setRightsFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All rights statuses</option>
              <option value="public domain">Public domain</option>
              <option value="CC0">CC0</option>
              <option value="metadata_only">Metadata only</option>
              <option value="linked_record">Linked record</option>
            </select>
          </div>

          <div className="ghana-filter-section ghana-filter-section--checkbox">
            <label className="ghana-filter-checkbox">
              <input
                type="checkbox"
                checked={communityFilter}
                onChange={(e) => {
                  setCommunityFilter(e.target.checked);
                  setPage(1);
                }}
              />
              Community review required
            </label>
          </div>

          <div className="ghana-usage-note">
            <div className="ghana-usage-note-label">Reading the catalogue</div>
            <p className="ghana-usage-note-text">
              Verified museum objects quote holding-institution source facts. Historical entries cite
              published accounts — ARED interpretation is labelled on each detail page.
            </p>
          </div>
        </aside>

        <div className="ghana-browse-canvas">
          <div className="ghana-items-toolbar ghana-items-toolbar--sticky">
            <span className="ghana-item-count">
              {loading ? "Loading…" : `${total.toLocaleString()} records`}
            </span>
            <button
              type="button"
              className="ghana-filter-toggle-btn"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              {showFilters ? "Hide filters" : "Filters"}
              {activeFilterCount > 0 && !showFilters && (
                <span className="ghana-filter-count">{activeFilterCount}</span>
              )}
            </button>
            <select
              className="ghana-sort-select ghana-sort-select--toolbar"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort records"
            >
              <option value="newest">Newest added</option>
              <option value="date_asc">Oldest date</option>
              <option value="title">A–Z title</option>
              <option value="maker">Maker</option>
              <option value="region">Region</option>
              <option value="evidence">Evidence status</option>
              <option value="oldest">Oldest ID</option>
            </select>
          </div>

          {error && (
            <div className="ghana-empty-state">
              {error}
              <br />
              <code>npx tsx scripts/import-ghana-research-catalogue.ts</code>
            </div>
          )}

          {!error && loading && (
            <div className="ghana-catalogue-skeleton" aria-busy="true" aria-label="Loading records">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="ghana-catalogue-skeleton-card" />
              ))}
            </div>
          )}

          {!error && !loading && items.length === 0 && (
            <div className="ghana-empty-state">
              No records match the current filters.{" "}
              <button type="button" className="ghana-about-read-more" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}

          {!error && !loading && items.length > 0 && (
            <>
              <div className="ghana-items-grid ghana-items-grid--catalogue">
                {items.map((record) => (
                  <CatalogueCard key={record.id} record={record} />
                ))}
              </div>
              <nav className="ghana-catalogue-pagination" aria-label="Catalogue pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="ghana-pagination-status">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { EvidenceBadge };
