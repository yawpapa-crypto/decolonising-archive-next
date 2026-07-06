"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AODL_COLLECTIONS,
  listAodlFilterOptions,
  type ExternalArchiveCollection,
} from "@/lib/data/aodl-collections";
import {
  SMITHSONIAN_COLLECTIONS,
  listSmithsonianFilterOptions,
  smithsonianCollectionSearchUrl,
  type SmithsonianOpenCollection,
} from "@/lib/data/smithsonian-collections";
import AfricanArchivesDiscover from "@/app/collections/african-archives/AfricanArchivesDiscover";
import "@/app/styles/african-archives.css";

type CatalogSource = "all" | "aodl" | "smithsonian";
type PageView = "browse" | "discover";
type BrowseLayout = "list" | "grid";

const BROWSE_LAYOUT_KEY = "aa-browse-layout";

type BrowseEntry =
  | { catalog: "aodl"; collection: ExternalArchiveCollection }
  | { catalog: "smithsonian"; collection: SmithsonianOpenCollection };

const STATIC_ENTRIES: BrowseEntry[] = [
  ...AODL_COLLECTIONS.map((collection) => ({ catalog: "aodl" as const, collection })),
  ...SMITHSONIAN_COLLECTIONS.map((collection) => ({
    catalog: "smithsonian" as const,
    collection,
  })),
];

function matchesQuery(entry: BrowseEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const c = entry.collection;
  const haystack = [
    c.title,
    c.description,
    c.platform,
    ...c.countries,
    ...c.languages,
    ...c.themes,
    ...c.mediaTypes,
    ...c.keywords,
    entry.catalog === "smithsonian" ? entry.collection.unitCode : "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

function entryHref(entry: BrowseEntry, query: string): string {
  if (entry.catalog === "smithsonian") {
    return smithsonianCollectionSearchUrl(entry.collection, query || undefined);
  }
  return entry.collection.url;
}

function entryMeta(entry: BrowseEntry) {
  const c = entry.collection;
  const isSmithsonian = entry.catalog === "smithsonian";
  return {
    isSmithsonian,
    sourceLabel: isSmithsonian ? "Smithsonian" : "AODL",
    monogram: isSmithsonian ? "SI" : "AO",
    placeLabel: c.countries.slice(0, 2).join(" · ") || "Global",
    platformLabel: isSmithsonian ? `${entry.collection.unitCode} · ${c.platform}` : c.platform,
    ctaLabel: isSmithsonian ? "Search ↗" : "Open ↗",
  };
}

export default function AfricanArchivesClient() {
  const aodlFilters = useMemo(() => listAodlFilterOptions(), []);
  const smithsonianFilters = useMemo(() => listSmithsonianFilterOptions(), []);

  const [pageView, setPageView] = useState<PageView>("browse");
  const [allEntries, setAllEntries] = useState<BrowseEntry[]>(STATIC_ENTRIES);
  const [catalogSource, setCatalogSource] = useState<"api" | "static">("static");
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogSource>("all");
  const [browseLayout, setBrowseLayout] = useState<BrowseLayout>("list");

  useEffect(() => {
    const stored = window.localStorage.getItem(BROWSE_LAYOUT_KEY);
    if (stored === "list" || stored === "grid") setBrowseLayout(stored);
  }, []);

  function setLayout(layout: BrowseLayout) {
    setBrowseLayout(layout);
    window.localStorage.setItem(BROWSE_LAYOUT_KEY, layout);
  }

  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("source");
    if (source === "smithsonian" || source === "aodl") {
      setCatalog(source);
    }
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "discover") setPageView("discover");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);

    fetch("/api/archive-collections?limit=120", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && (data.aodl?.length || data.smithsonian?.length)) {
          const entries: BrowseEntry[] = [
            ...(data.aodl as ExternalArchiveCollection[]).map((collection) => ({
              catalog: "aodl" as const,
              collection,
            })),
            ...(data.smithsonian as SmithsonianOpenCollection[]).map((collection) => ({
              catalog: "smithsonian" as const,
              collection,
            })),
          ];
          setAllEntries(entries);
          setCatalogSource("api");
        } else {
          setAllEntries(STATIC_ENTRIES);
          setCatalogSource("static");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllEntries(STATIC_ENTRIES);
          setCatalogSource("static");
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [country, setCountry] = useState("");
  const [theme, setTheme] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [language, setLanguage] = useState("");
  const [platform, setPlatform] = useState("");

  const filterOptions = useMemo(() => {
    const countries = new Set([...aodlFilters.countries, ...smithsonianFilters.countries]);
    const themes = new Set([...aodlFilters.themes, ...smithsonianFilters.themes]);
    const mediaTypes = new Set([...aodlFilters.mediaTypes, ...smithsonianFilters.mediaTypes]);
    const languages = new Set([...aodlFilters.languages, ...smithsonianFilters.languages]);
    const platforms = new Set([
      ...aodlFilters.platforms,
      ...smithsonianFilters.unitCodes.map((code) => `Smithsonian · ${code}`),
      "Smithsonian Open Access",
      "AODL",
    ]);
    const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
    return {
      countries: sort(countries),
      themes: sort(themes),
      mediaTypes: sort(mediaTypes),
      languages: sort(languages),
      platforms: sort(platforms),
    };
  }, [aodlFilters, smithsonianFilters]);

  const aodlCount = useMemo(
    () => allEntries.filter((e) => e.catalog === "aodl").length,
    [allEntries],
  );
  const smithsonianCount = useMemo(
    () => allEntries.filter((e) => e.catalog === "smithsonian").length,
    [allEntries],
  );

  const filtered = useMemo(() => {
    return allEntries.filter((entry) => {
      if (catalog !== "all" && entry.catalog !== catalog) return false;
      if (!matchesQuery(entry, query)) return false;
      const c = entry.collection;
      if (country && !c.countries.includes(country)) return false;
      if (theme && !c.themes.includes(theme)) return false;
      if (mediaType && !c.mediaTypes.includes(mediaType)) return false;
      if (language && !c.languages.includes(language)) return false;
      if (platform) {
        if (entry.catalog === "aodl" && c.platform !== platform) return false;
        if (
          entry.catalog === "smithsonian" &&
          platform !== "Smithsonian Open Access" &&
          platform !== `Smithsonian · ${entry.collection.unitCode}`
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allEntries, catalog, query, country, theme, mediaType, language, platform]);

  const hasFilters = Boolean(
    catalog !== "all" || country || theme || mediaType || language || platform || query,
  );

  function clearFilters() {
    setQuery("");
    setCatalog("all");
    setCountry("");
    setTheme("");
    setMediaType("");
    setLanguage("");
    setPlatform("");
  }

  return (
    <div className="aa-page">
      <section className="aa-hero">
        <nav className="aa-crumb" aria-label="Breadcrumb">
          <Link href="/collections">Collections</Link>
          <span>/</span>
          <span>African &amp; Global Archives</span>
        </nav>
        <p className="aa-hero-kicker">
          {catalogLoading
            ? "Loading catalogue…"
            : `${aodlCount} AODL · ${smithsonianCount} Smithsonian units`}
          {!catalogLoading && catalogSource === "api" ? " · via API" : ""}
        </p>
        <h1 className="aa-hero-title">
          African &amp;
          <br />
          Global Archive
          <br />
          Collections
        </h1>
        <p className="aa-hero-lead">
          Open African oral histories, photographs, objects, manuscripts, audio and video — linked
          from partner sites. Metadata only; collections open externally.
        </p>
        <nav className="aa-view-nav" aria-label="Page sections">
          <button
            type="button"
            className={`aa-view-btn${pageView === "browse" ? " is-active" : ""}`}
            onClick={() => setPageView("browse")}
          >
            Browse collections
          </button>
          <button
            type="button"
            className={`aa-view-btn${pageView === "discover" ? " is-active" : ""}`}
            onClick={() => setPageView("discover")}
          >
            Discover live
          </button>
        </nav>
      </section>

      {pageView === "browse" && (
        <>
          <section className="aa-filter-band">
            <div className="aa-filter-inner">
              <h2 className="aa-band-title">Find a collection</h2>
              <input
                type="search"
                className="aa-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search collections, countries, themes…"
                aria-label="Search archive collections"
              />
              <div className="aa-filters">
                <label>
                  Source
                  <select
                    value={catalog}
                    onChange={(e) => setCatalog(e.target.value as CatalogSource)}
                  >
                    <option value="all">All</option>
                    <option value="aodl">AODL</option>
                    <option value="smithsonian">Smithsonian</option>
                  </select>
                </label>
                <label>
                  Country
                  <select value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">All</option>
                    {filterOptions.countries.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Theme
                  <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="">All</option>
                    {filterOptions.themes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Media
                  <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                    <option value="">All</option>
                    {filterOptions.mediaTypes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Language
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="">All</option>
                    {filterOptions.languages.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="aa-meta">
                <span>
                  {catalogLoading
                    ? "Loading catalogue…"
                    : `${filtered.length} of ${allEntries.length} collections`}
                </span>
                {catalogSource === "static" && !catalogLoading && (
                  <span className="aa-meta-note">Local fallback catalogue</span>
                )}
                {hasFilters && (
                  <button type="button" className="aa-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="aa-list-section">
            <div className="aa-list-inner">
              <div className="aa-list-header">
                <div>
                  <h2 className="aa-list-heading">Browse collections</h2>
                  <p className="aa-disclaimer">
                    ↗ Links open partner sites. Smithsonian metadata is CC0 — show attribution and
                    respect cultural sensitivity. No media rehosting on this platform.
                  </p>
                </div>
                <div
                  className="aa-layout-toggle"
                  role="group"
                  aria-label="Collection view"
                >
                  <button
                    type="button"
                    className={`aa-layout-btn${browseLayout === "list" ? " is-active" : ""}`}
                    aria-pressed={browseLayout === "list"}
                    onClick={() => setLayout("list")}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    className={`aa-layout-btn${browseLayout === "grid" ? " is-active" : ""}`}
                    aria-pressed={browseLayout === "grid"}
                    onClick={() => setLayout("grid")}
                  >
                    Thumbnails
                  </button>
                </div>
              </div>

              {catalogLoading ? (
                <div className="aa-empty" role="status">
                  Loading archive catalogue from API…
                </div>
              ) : filtered.length ? (
                browseLayout === "list" ? (
                  <ol className="aa-collection-list">
                    {filtered.map((entry, index) => (
                      <CollectionRow
                        key={`${entry.catalog}-${entry.collection.id}`}
                        entry={entry}
                        index={index}
                        query={query}
                      />
                    ))}
                  </ol>
                ) : (
                  <ul className="aa-collection-grid">
                    {filtered.map((entry, index) => (
                      <CollectionCard
                        key={`${entry.catalog}-${entry.collection.id}`}
                        entry={entry}
                        index={index}
                        query={query}
                      />
                    ))}
                  </ul>
                )
              ) : (
                <div className="aa-empty" role="status">
                  No collections match your filters.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {pageView === "discover" && <AfricanArchivesDiscover />}
    </div>
  );
}

function CollectionRow({
  entry,
  index,
  query,
}: {
  entry: BrowseEntry;
  index: number;
  query: string;
}) {
  const c = entry.collection;
  const href = entryHref(entry, query);
  const meta = entryMeta(entry);
  const num = String(index + 1).padStart(2, "0");

  return (
    <li className={`aa-collection-row${meta.isSmithsonian ? " is-smithsonian" : " is-aodl"}`}>
      <span className="aa-row-num">{num}</span>
      <div className="aa-row-body">
        <div className="aa-row-top">
          <span className="aa-row-source">{meta.sourceLabel}</span>
          <span className="aa-row-place">{meta.placeLabel}</span>
        </div>
        <h3 className="aa-row-title">{c.title}</h3>
        <p className="aa-row-platform">{meta.platformLabel}</p>
        <p className="aa-row-desc">{c.description}</p>
        <div className="aa-row-tags">
          {c.mediaTypes.slice(0, 3).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
      <div className="aa-row-side">
        <div className="aa-row-thumb" aria-hidden="true">
          <span>{meta.monogram}</span>
        </div>
        <a className="aa-row-cta" href={href} target="_blank" rel="noopener noreferrer">
          {meta.ctaLabel}
        </a>
      </div>
    </li>
  );
}

function CollectionCard({
  entry,
  index,
  query,
}: {
  entry: BrowseEntry;
  index: number;
  query: string;
}) {
  const c = entry.collection;
  const href = entryHref(entry, query);
  const meta = entryMeta(entry);
  const num = String(index + 1).padStart(2, "0");
  const excerpt =
    c.description.length > 120 ? `${c.description.slice(0, 120)}…` : c.description;

  return (
    <li className={`aa-grid-card${meta.isSmithsonian ? " is-smithsonian" : " is-aodl"}`}>
      <a className="aa-grid-card-link" href={href} target="_blank" rel="noopener noreferrer">
        <div className="aa-grid-thumb" aria-hidden="true">
          <span className="aa-grid-monogram">{meta.monogram}</span>
          <span className="aa-grid-num">{num}</span>
        </div>
        <div className="aa-grid-body">
          <div className="aa-grid-top">
            <span className="aa-grid-source">{meta.sourceLabel}</span>
            <span className="aa-grid-place">{meta.placeLabel}</span>
          </div>
          <h3 className="aa-grid-title">{c.title}</h3>
          <p className="aa-grid-platform">{meta.platformLabel}</p>
          <p className="aa-grid-desc">{excerpt}</p>
          <div className="aa-grid-tags">
            {c.mediaTypes.slice(0, 2).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <span className="aa-grid-cta">{meta.ctaLabel}</span>
        </div>
      </a>
    </li>
  );
}
