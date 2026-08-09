"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  GHANA_COLLECTION_ITEMS,
  GHANA_COLLECTION_META,
  type ArchiveItemCategory,
  type ArchiveItemRightsStatus,
  type GhanaArchiveItem,
} from "@/lib/data/ghana-collection";
import {
  dateToYear,
  enrichAllGhanaItems,
  VISUAL_SYSTEM_LABELS,
  type EnrichedGhanaItem,
} from "@/lib/data/ghana-taxonomy-bridge";
import {
  HISTORICAL_PERIODS,
  VISUAL_SYSTEM_SPINE,
  type HistoricalPeriodSlug,
  type VisualSystemSlug,
} from "@/lib/data/ared-master-taxonomy";
import GhanaLiveDiscover from "@/app/collections/ghana-graphic-design/GhanaLiveDiscover";
import GhanaCatalogueBrowser from "@/app/collections/ghana-graphic-design/GhanaCatalogueBrowser";
import GhanaSubcollectionIndex from "@/components/collections/GhanaSubcollectionIndex";
import { CATALOGUE_HOMEPAGE_TEXT } from "@/lib/catalogue/evidence-status";
import type { CatalogueStats } from "@/lib/catalogue/types";
import type { GhanaCollectionFilterId, GhanaSubcollectionId } from "@/lib/data/ghana-subcollections";
import { GHANA_LAUNCH_PRIORITIES } from "@/lib/data/ghana-subcollections";
import "@/app/styles/ghana-collection.css";

function EditorialKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="ghana-ed-kicker">
      <span className="ghana-ed-arrow" aria-hidden="true">
        ▶▶
      </span>
      {children}
    </div>
  );
}

// ── Safe image with onError fallback ─────────────────────────────────────────
function SafeImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken)
    return (
      <div className="ghana-item-image-placeholder" aria-hidden="true">
        <span className="ghana-item-placeholder-icon">📋</span>
        <span className="ghana-item-placeholder-label">Image unavailable</span>
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setBroken(true)} />
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function rightsClass(status: ArchiveItemRightsStatus) {
  if (status === "open_ingest" || status === "permission_granted") return "is-open";
  if (status === "metadata_only") return "is-metadata";
  if (status === "linked_record") return "is-linked";
  return "is-permission";
}

function rightsLabel(status: ArchiveItemRightsStatus) {
  if (status === "open_ingest" || status === "permission_granted") return "Open";
  if (status === "metadata_only") return "Metadata";
  if (status === "linked_record") return "Linked";
  return "Permission";
}

function licenceClass(licence: string) {
  const l = licence.toLowerCase();
  if (l.includes("cc0")) return "lic-cc0";
  if (l.includes("cc by-sa")) return "lic-cc-by-sa";
  if (l.includes("cc by")) return "lic-cc-by";
  if (l.includes("public domain")) return "lic-pd";
  if (l.includes("permission")) return "lic-permission";
  return "lic-metadata";
}

function dateBucket(item: GhanaArchiveItem): string {
  const y = dateToYear(item);
  if (y < 1900) return "before-1900";
  if (y < 1950) return "1900-1949";
  if (y < 1980) return "1950-1979";
  if (y < 2000) return "1980-1999";
  return "2000-present";
}

const ENRICHED_ITEMS = enrichAllGhanaItems(GHANA_COLLECTION_ITEMS);

const DATE_BUCKET_LABELS: Record<string, string> = {
  "before-1900": "Before 1900",
  "1900-1949": "1900 – 1949",
  "1950-1979": "1950 – 1979",
  "1980-1999": "1980 – 1999",
  "2000-present": "2000 – Present",
};

function SuggestModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", source: "", url: "", notes: "", email: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/collections/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          title: form.title,
          source: form.source,
          url: form.url || undefined,
          notes: form.notes || undefined,
          submitterEmail: form.email || undefined,
          collectionSlug: "ghana-graphic-design",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not submit suggestion");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit suggestion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ghana-suggest-overlay" onClick={onClose}>
      <div className="ghana-suggest-modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <>
            <h2>Thank you</h2>
            <p>
              Your suggestion has been received. The ARED editorial team will review it and add the
              item to the queue if it meets the collection criteria.
            </p>
            <div className="ghana-suggest-actions">
              <button className="ghana-suggest-submit" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Suggest an item</h2>
            <p>
              Help us grow this archive. Submit items, sources or information about graphic design
              history in Ghana. All suggestions enter a review queue before publication.
            </p>
            <form className="ghana-suggest-form" onSubmit={handleSubmit}>
              <div className="ghana-suggest-field">
                <label htmlFor="suggest-title">Item title *</label>
                <input
                  id="suggest-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Hand-painted poster for Rambo, Accra 1985"
                  value={form.title}
                  onChange={handleChange}
                />
              </div>
              <div className="ghana-suggest-field">
                <label htmlFor="suggest-source">Source / where it can be found *</label>
                <input
                  id="suggest-source"
                  name="source"
                  type="text"
                  required
                  placeholder="e.g. Wikimedia Commons, private collection, museum"
                  value={form.source}
                  onChange={handleChange}
                />
              </div>
              <div className="ghana-suggest-field">
                <label htmlFor="suggest-url">URL (if available)</label>
                <input
                  id="suggest-url"
                  name="url"
                  type="url"
                  placeholder="https://..."
                  value={form.url}
                  onChange={handleChange}
                />
              </div>
              <div className="ghana-suggest-field">
                <label htmlFor="suggest-notes">Notes on rights / licence</label>
                <textarea
                  id="suggest-notes"
                  name="notes"
                  rows={3}
                  placeholder="e.g. CC BY via Wikimedia, public domain, permission from artist needed"
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>
              <div className="ghana-suggest-field">
                <label htmlFor="suggest-email">Your email (optional)</label>
                <input
                  id="suggest-email"
                  name="email"
                  type="email"
                  placeholder="For follow-up if needed"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              {error && <p className="ghana-suggest-error">{error}</p>}
              <div className="ghana-suggest-actions">
                <button type="button" className="ghana-suggest-cancel" onClick={onClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="ghana-suggest-submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Submit suggestion →"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: EnrichedGhanaItem }) {
  const canShowImage =
    item.rights_status === "open_ingest" || item.rights_status === "permission_granted";
  const hasImage = canShowImage && item.image_url;

  return (
    <Link
      href={`/collections/ghana-graphic-design/${item.id}`}
      className={`ghana-item-card${hasImage ? "" : " is-text-card"}`}
      aria-label={item.title}
    >
      {hasImage ? (
        <div className="ghana-item-image">
          <SafeImg src={item.image_url!} alt={item.title} />
          <span className={`ghana-rights-badge ${rightsClass(item.rights_status)}`}>
            {rightsLabel(item.rights_status)}
          </span>
        </div>
      ) : (
        <div className="ghana-item-text-header">
          <div className="ghana-item-text-cat-bar" />
          <div className="ghana-item-text-meta-row">
            <span className="ghana-item-text-icon">{CATEGORY_ICONS[item.category]}</span>
            <span className="ghana-item-text-format">{item.format}</span>
            <span className={`ghana-rights-badge ${rightsClass(item.rights_status)}`}>
              {rightsLabel(item.rights_status)}
            </span>
          </div>
        </div>
      )}

      <div className="ghana-item-body">
        <div className="ghana-item-meta">
          {item.date_display}
          {item.city ? ` · ${item.city}` : ""}
        </div>
        <div className="ghana-item-title">{item.title}</div>

        {!hasImage && (
          <p className="ghana-item-excerpt">
            {item.description.slice(0, 130)}
            {item.description.length > 130 ? "…" : ""}
          </p>
        )}

        {!hasImage && item.visual_features && (
          <p className="ghana-item-vf">
            <span className="ghana-item-vf-label">Visual: </span>
            {item.visual_features.slice(0, 100)}
            {item.visual_features.length > 100 ? "…" : ""}
          </p>
        )}

        <div className="ghana-item-category">{CATEGORY_LABELS[item.category]}</div>
        <div className="ghana-item-taxonomy">
          {VISUAL_SYSTEM_LABELS[item.visual_system]}
        </div>
        <div className="ghana-item-source">Source: {item.source_name}</div>
        <div className="ghana-item-licence">
          <span className={`ghana-licence-chip ${licenceClass(item.licence)}`}>{item.licence}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Filter section ────────────────────────────────────────────────────────────

function FilterSection({
  title,
  options,
  selected,
  onChange,
  counts,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ghana-filter-section">
      <button
        className="ghana-filter-heading"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        <span className={`ghana-filter-caret ${open ? "is-open" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="ghana-filter-options">
          {options.map(({ value, label }) => (
            <label key={value} className="ghana-filter-option">
              <input
                type="checkbox"
                checked={selected.has(value)}
                onChange={() => onChange(value)}
              />
              {label}
              <span className="ghana-filter-count">{counts[value] ?? 0}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timeline tab ──────────────────────────────────────────────────────────────

function TimelineTab() {
  const [expandedEra, setExpandedEra] = useState<number | null>(0);

  const eraItems = useMemo(() => {
    return HISTORICAL_PERIODS.map((period) =>
      ENRICHED_ITEMS.filter((item) => item.historical_periods.includes(period.slug)).slice(0, 4),
    );
  }, []);

  return (
    <div className="ghana-tab-panel ghana-timeline">
      <EditorialKicker>Historical periods</EditorialKicker>
      <h2 className="ghana-ed-heading">Six overlapping fields</h2>
      <p className="ghana-ed-lead ghana-timeline-intro">
        Filters, not sealed rooms. Ghanaian visual practices rarely stop when a new political period
        begins. The public catalogue shows only verified records from completed source research.
      </p>

      <div className="ghana-timeline-eras">
        {HISTORICAL_PERIODS.map((period, i) => {
          const isOpen = expandedEra === i;
          const relatedItems = eraItems[i];

          return (
            <div key={period.slug} className={`ghana-tl-era ${isOpen ? "is-open" : ""}`}>
              <button
                className="ghana-tl-era-header"
                onClick={() => setExpandedEra(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <div className="ghana-tl-era-left">
                  <span className="ghana-tl-era-period">{period.indicativePeriod}</span>
                  <span className="ghana-tl-era-name">{period.label}</span>
                  <span className="ghana-tl-era-thread">{period.centralQuestion}</span>
                </div>
                <div className="ghana-tl-era-right">
                  {relatedItems.length > 0 && (
                    <span className="ghana-tl-items-count">{relatedItems.length} in archive</span>
                  )}
                  <span className="ghana-tl-caret">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="ghana-tl-era-body">
                  <p className="ghana-tl-era-note">
                    Overlapping filter — items may also appear in adjacent periods when practices
                    continue across political boundaries.
                  </p>

                  {relatedItems.length > 0 && (
                    <div className="ghana-tl-related">
                      <div className="ghana-tl-related-label">Archive items from this period</div>
                      <div className="ghana-tl-related-items">
                        {relatedItems.map((item) => (
                          <Link
                            key={item.id}
                            href={`/collections/ghana-graphic-design/${item.id}`}
                            className="ghana-tl-related-item"
                          >
                            <span className="ghana-tl-ri-icon">{CATEGORY_ICONS[item.category]}</span>
                            <span className="ghana-tl-ri-title">{item.title}</span>
                            <span className="ghana-tl-ri-date">{item.date_display}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {relatedItems.length === 0 && (
                    <p className="ghana-tl-empty">
                      No published items yet — see the research catalogue for queued records in this
                      period.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Map / locations tab ───────────────────────────────────────────────────────

const CITY_CONFIG: { city: string | null; label: string; region: string }[] = [
  { city: "Accra", label: "Accra", region: "Greater Accra Region" },
  { city: "Kumasi", label: "Kumasi", region: "Ashanti Region" },
  { city: "Tema", label: "Tema", region: "Greater Accra Region" },
  { city: "Cape Coast", label: "Cape Coast", region: "Central Region" },
  { city: null, label: "National / Multiple", region: "Ghana" },
];

function MapTab() {
  const [activeCity, setActiveCity] = useState<string | "all">("all");

  const cityGroups = useMemo(() => {
    return CITY_CONFIG.map(({ city, label, region }) => {
      const items = GHANA_COLLECTION_ITEMS.filter((item) =>
        city === null ? item.city === null : item.city === city,
      );
      return { city, label, region, items };
    });
  }, []);

  const visibleGroups = useMemo(
    () =>
      activeCity === "all"
        ? cityGroups
        : cityGroups.filter((g) => (g.city ?? "national") === activeCity),
    [activeCity, cityGroups],
  );

  const totalCities = cityGroups.filter((g) => g.items.length > 0).length;

  return (
    <div className="ghana-tab-panel ghana-map-view">
      <EditorialKicker>Geography</EditorialKicker>
      <h2 className="ghana-ed-heading">Where design happens</h2>
      <p className="ghana-ed-lead ghana-map-intro">
        {GHANA_COLLECTION_ITEMS.length} items across {totalCities} locations in Ghana. Select a city
        to filter the grid.
      </p>

      <div className="ghana-map-city-nav">
        <button
          className={`ghana-map-city-btn ${activeCity === "all" ? "is-active" : ""}`}
          onClick={() => setActiveCity("all")}
        >
          All locations
        </button>
        {cityGroups.map(
          ({ city, label, items }) =>
            items.length > 0 && (
              <button
                key={city ?? "national"}
                className={`ghana-map-city-btn ${activeCity === (city ?? "national") ? "is-active" : ""}`}
                onClick={() =>
                  setActiveCity(activeCity === (city ?? "national") ? "all" : (city ?? "national"))
                }
              >
                {label}
                <span className="ghana-map-city-btn-count">{items.length}</span>
              </button>
            ),
        )}
      </div>

      <div className="ghana-map-city-grid">
        {visibleGroups
          .filter((g) => g.items.length > 0)
          .map(({ city, label, region, items }) => (
            <div key={city ?? "national"} className="ghana-map-city-card">
              <div className="ghana-map-city-card-header">
                <div>
                  <div className="ghana-map-city-card-name">{label}</div>
                  <div className="ghana-map-city-card-region">{region}</div>
                </div>
                <div className="ghana-map-city-card-count">{items.length} items</div>
              </div>

              <div className="ghana-map-city-items">
                {items.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/collections/ghana-graphic-design/${item.id}`}
                    className="ghana-map-item-row"
                  >
                    <span className="ghana-map-item-icon">{CATEGORY_ICONS[item.category]}</span>
                    <span className="ghana-map-item-title">{item.title}</span>
                    <span className="ghana-map-item-date">{item.date_display}</span>
                    <span
                      className={`ghana-rights-badge ${rightsClass(item.rights_status)}`}
                      style={{ fontSize: "0.66rem", padding: "0.1rem 0.45rem" }}
                    >
                      {rightsLabel(item.rights_status)}
                    </span>
                  </Link>
                ))}
                {items.length > 5 && (
                  <div className="ghana-map-more">
                    + {items.length - 5} more items in {label}
                  </div>
                )}
              </div>

              <div className="ghana-map-city-cats">
                {[...new Set(items.map((i) => i.category))].map((cat) => (
                  <span key={cat} className="ghana-map-city-cat-dot" title={CATEGORY_LABELS[cat]}>
                    {CATEGORY_ICONS[cat]}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function GhanaCollectionClient() {
  const [activeTab, setActiveTab] = useState<
    "browse" | "timeline" | "map" | "discover" | "contributors"
  >("browse");
  const [activeCategory, setActiveCategory] = useState<ArchiveItemCategory | "all">("all");
  const [activeVisualSystem, setActiveVisualSystem] = useState<VisualSystemSlug | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [licenceFilter, setLicenceFilter] = useState<Set<string>>(new Set());
  const [periodFilter, setPeriodFilter] = useState<Set<HistoricalPeriodSlug>>(new Set());
  const [dateFilter, setDateFilter] = useState<Set<string>>(new Set());
  const [formatFilter, setFormatFilter] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [showSuggest, setShowSuggest] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [catalogueStats, setCatalogueStats] = useState<CatalogueStats | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<GhanaCollectionFilterId>("all");
  const [activeSubcollection, setActiveSubcollection] = useState<GhanaSubcollectionId | null>(null);
  const browseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/catalogue/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setCatalogueStats(d.stats);
      })
      .catch(() => {});
  }, []);

  const filterCounts = useMemo(() => {
    const licences: Record<string, number> = {};
    const periods: Record<string, number> = {};
    const dates: Record<string, number> = {};
    const formats: Record<string, number> = {};
    const sources: Record<string, number> = {};

    for (const item of ENRICHED_ITEMS) {
      const lk = licenceClass(item.licence);
      licences[lk] = (licences[lk] ?? 0) + 1;

      for (const p of item.historical_periods) {
        periods[p] = (periods[p] ?? 0) + 1;
      }

      const dk = dateBucket(item);
      dates[dk] = (dates[dk] ?? 0) + 1;

      formats[item.format] = (formats[item.format] ?? 0) + 1;
      sources[item.source_name] = (sources[item.source_name] ?? 0) + 1;
    }
    return { licences, periods, dates, formats, sources };
  }, []);

  const formatOptions = useMemo(
    () =>
      Object.entries(filterCounts.formats)
        .sort((a, b) => b[1] - a[1])
        .map(([v]) => ({ value: v, label: v })),
    [filterCounts.formats],
  );

  const sourceOptions = useMemo(
    () =>
      Object.entries(filterCounts.sources)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([v]) => ({ value: v, label: v })),
    [filterCounts.sources],
  );

  const toggleFilter = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (value: string) => {
      setter((prev) => {
        const next = new Set(prev);
        next.has(value) ? next.delete(value) : next.add(value);
        return next;
      });
    },
    [],
  );

  const togglePeriodFilter = useCallback((value: HistoricalPeriodSlug) => {
    setPeriodFilter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveCategory("all");
    setActiveVisualSystem("all");
    setSearchQuery("");
    setLicenceFilter(new Set());
    setPeriodFilter(new Set());
    setDateFilter(new Set());
    setFormatFilter(new Set());
    setSourceFilter(new Set());
  }, []);

  const hasFilters =
    activeCategory !== "all" ||
    activeVisualSystem !== "all" ||
    searchQuery.trim() !== "" ||
    licenceFilter.size > 0 ||
    periodFilter.size > 0 ||
    dateFilter.size > 0 ||
    formatFilter.size > 0 ||
    sourceFilter.size > 0;

  const filteredItems = useMemo(() => {
    let items = [...ENRICHED_ITEMS];

    if (activeCategory !== "all") {
      items = items.filter((i) => i.category === activeCategory);
    }

    if (activeVisualSystem !== "all") {
      items = items.filter((i) => i.visual_system === activeVisualSystem);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          (i.creator?.toLowerCase().includes(q) ?? false) ||
          (i.city?.toLowerCase().includes(q) ?? false) ||
          VISUAL_SYSTEM_LABELS[i.visual_system].toLowerCase().includes(q),
      );
    }

    if (licenceFilter.size > 0) {
      items = items.filter((i) => licenceFilter.has(licenceClass(i.licence)));
    }
    if (periodFilter.size > 0) {
      items = items.filter((i) =>
        i.historical_periods.some((p) => periodFilter.has(p)),
      );
    }
    if (dateFilter.size > 0) {
      items = items.filter((i) => dateFilter.has(dateBucket(i)));
    }
    if (formatFilter.size > 0) {
      items = items.filter((i) => formatFilter.has(i.format));
    }
    if (sourceFilter.size > 0) {
      items = items.filter((i) => sourceFilter.has(i.source_name));
    }

    if (sortBy === "newest") items.sort((a, b) => dateToYear(b) - dateToYear(a));
    else if (sortBy === "oldest") items.sort((a, b) => dateToYear(a) - dateToYear(b));
    else items.sort((a, b) => a.title.localeCompare(b.title));

    return items;
  }, [
    activeCategory,
    activeVisualSystem,
    searchQuery,
    licenceFilter,
    periodFilter,
    dateFilter,
    formatFilter,
    sourceFilter,
    sortBy,
  ]);

  const stats = useMemo(() => {
    const cats = new Set(GHANA_COLLECTION_ITEMS.map((i) => i.category));
    const systems = new Set(ENRICHED_ITEMS.map((i) => i.visual_system));
    const srcs = new Set(GHANA_COLLECTION_ITEMS.map((i) => i.source_name));
    return {
      total: GHANA_COLLECTION_ITEMS.length,
      categories: cats.size,
      visualSystems: systems.size,
      sources: srcs.size,
    };
  }, []);

  const meta = GHANA_COLLECTION_META;

  const LICENCE_OPTIONS = [
    { value: "lic-cc-by", label: "CC BY" },
    { value: "lic-cc-by-sa", label: "CC BY-SA" },
    { value: "lic-cc0", label: "CC0" },
    { value: "lic-pd", label: "Public Domain" },
    { value: "lic-permission", label: "Permission Required" },
    { value: "lic-metadata", label: "Metadata Only" },
  ];

  const DATE_OPTIONS = Object.entries(DATE_BUCKET_LABELS).map(([v, label]) => ({ value: v, label }));

  const PERIOD_OPTIONS = HISTORICAL_PERIODS.map((p) => ({
    value: p.slug,
    label: p.label,
  }));

  return (
    <>
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} />}

      <div className="ghana-collection-page ghana-collection-page--editorial ghana-collection-page--refined ghana-collection-page--monochrome">
        <div className="ghana-collection-inner">
          {/* Breadcrumb */}
          <nav className="ghana-breadcrumb" aria-label="Breadcrumb">
            <Link href="/collections">Collections</Link>
            <span className="ghana-breadcrumb-sep">/</span>
            <span>{meta.title}</span>
          </nav>

          {/* Hero */}
          <section className="ghana-hero ghana-hero--editorial">
            <div className="ghana-hero-copy">
              <EditorialKicker>{meta.kicker}</EditorialKicker>
              <h1 className="ghana-hero-title">{meta.title}</h1>
              <p className="ghana-hero-subtitle">{meta.subtitle}</p>
              <p className="ghana-hero-desc">{CATALOGUE_HOMEPAGE_TEXT}</p>
              <dl className="ghana-hero-stats" aria-label="Collection statistics">
                <div className="ghana-stat">
                  <dd className="ghana-stat-value">
                    {(catalogueStats?.totalRecords ?? 0).toLocaleString()}
                  </dd>
                  <dt className="ghana-stat-label">Records</dt>
                </div>
                <div className="ghana-stat">
                  <dd className="ghana-stat-value">
                    {(catalogueStats?.verifiedCount ?? 0).toLocaleString()}
                  </dd>
                  <dt className="ghana-stat-label">Verified objects</dt>
                </div>
                <div className="ghana-stat">
                  <dd className="ghana-stat-value">
                    {catalogueStats?.historicalPeriodCount ?? 0}
                  </dd>
                  <dt className="ghana-stat-label">Periods</dt>
                </div>
                <div className="ghana-stat">
                  <dd className="ghana-stat-value">
                    {catalogueStats?.visualSystemCount ?? 0}
                  </dd>
                  <dt className="ghana-stat-label">Visual systems</dt>
                </div>
              </dl>
            </div>

            <div className="ghana-hero-images" aria-hidden="true">
              {meta.hero_images.map((img, i) => (
                <div key={i} className="ghana-hero-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.caption} />
                  <span className="ghana-hero-img-caption">{img.caption}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tab nav */}
          <nav className="ghana-tab-nav ghana-tab-nav--editorial" aria-label="Collection sections">
            {(
              [
                { id: "browse", label: "Browse Collection" },
                { id: "timeline", label: "Timeline" },
                { id: "map", label: "Locations" },
                { id: "discover", label: "Discover" },
                { id: "contributors", label: "Contributors" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                className={`ghana-tab-btn ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ── Browse ─────────────────────────────────────────────────────── */}
          {activeTab === "browse" && (
            <>
              <GhanaSubcollectionIndex
                activeSubcollection={activeSubcollection}
                onSelectSubcollection={(sectionId) => {
                  setActiveSubcollection(sectionId);
                  setCollectionFilter("all");
                  browseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
              <div ref={browseRef}>
                <GhanaCatalogueBrowser
                  collectionFilter={collectionFilter}
                  onCollectionFilterChange={(filterId) => {
                    setCollectionFilter(filterId);
                    setActiveSubcollection(null);
                  }}
                  activeSubcollection={activeSubcollection}
                  onSubcollectionChange={setActiveSubcollection}
                />
              </div>
            </>
          )}

          {/* ── Timeline ───────────────────────────────────────────────────── */}
          {activeTab === "timeline" && <TimelineTab />}

          {/* ── Locations / Map ────────────────────────────────────────────── */}
          {activeTab === "map" && <MapTab />}

          {/* ── Discover ───────────────────────────────────────────────────── */}
          {activeTab === "discover" && <GhanaLiveDiscover />}

          {/* ── Contributors ───────────────────────────────────────────────── */}
          {activeTab === "contributors" && (
            <div className="ghana-tab-panel ghana-contributors-panel">
              <EditorialKicker>Community</EditorialKicker>
              <h2 className="ghana-ed-heading">Featured contributors</h2>
              <div className="ghana-contributors-row">
                {[
                  { name: "Wikimedia Commons", icon: "🌐", url: "https://commons.wikimedia.org" },
                  { name: "Internet Archive", icon: "📚", url: "https://archive.org" },
                  {
                    name: "Smithsonian Open Access",
                    icon: "🏛️",
                    url: "https://africa.si.edu",
                  },
                  { name: "Flickr / David Stanley", icon: "📷", url: "https://flickr.com" },
                  { name: "Discogs Community", icon: "🎵", url: "https://discogs.com" },
                  { name: "People's GD Archive", icon: "✊", url: "https://peoplesgdarchive.org" },
                  { name: "British Library / EAP", icon: "📖", url: "https://eap.bl.uk" },
                  { name: "ARED Editorial", icon: "✍️", url: "https://ared.design" },
                ].map((c) => (
                  <a
                    key={c.name}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ghana-contributor-avatar"
                  >
                    <div className="ghana-contributor-circle">{c.icon}</div>
                    <span className="ghana-contributor-name">{c.name}</span>
                  </a>
                ))}
              </div>

              <div className="ghana-contrib-note">
                <p>
                  This collection draws on open-access repositories, Creative Commons archives,
                  museum open-access programmes, community digitisation projects and original ARED
                  editorial research. All rights are credited at item level.
                </p>
                <button className="ghana-suggest-btn" onClick={() => setShowSuggest(true)}>
                  Suggest an item →
                </button>
              </div>
            </div>
          )}

          {/* Collection essay */}
          <div id="collection-essay" className="ghana-essay-section ghana-essay-section--editorial">
            <div>
              <EditorialKicker>Collection essay</EditorialKicker>
              <h2 className="ghana-essay-title">{meta.essay_title}</h2>
              <p className="ghana-essay-excerpt">{meta.essay_excerpt}</p>
              <a href="#collection-essay" className="ghana-essay-read-link">
                Read the essay →
              </a>
            </div>
            <div className="ghana-contributors-section">
              <EditorialKicker>Sources & partners</EditorialKicker>
              <div className="ghana-contributors-row">
                {[
                  { name: "Wikimedia", icon: "🌐" },
                  { name: "Internet Archive", icon: "📚" },
                  { name: "Smithsonian", icon: "🏛️" },
                  { name: "+ more", icon: "…" },
                ].map((c) => (
                  <div key={c.name} className="ghana-contributor-avatar">
                    <div className="ghana-contributor-circle">{c.icon}</div>
                    <span className="ghana-contributor-name">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* About + Suggest */}
          <div className="ghana-about-section ghana-about-section--editorial ghana-about-section--bottom">
            <div>
              <EditorialKicker>About this collection</EditorialKicker>
              <p className="ghana-about-text">
                {meta.description} Launch priority:{" "}
                {GHANA_LAUNCH_PRIORITIES.slice(0, 4).join(" · ")} — then expanding each section
                through verified batches toward 150–250 strong public records.
              </p>
            </div>
            <div className="ghana-suggest-box ghana-suggest-box--editorial">
              <EditorialKicker>Suggest an item</EditorialKicker>
              <p className="ghana-suggest-desc">
                Help us grow this archive. Submit items, sources or information about graphic design
                history in Ghana.
              </p>
              <button className="ghana-suggest-btn" onClick={() => setShowSuggest(true)}>
                Submit an item →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
