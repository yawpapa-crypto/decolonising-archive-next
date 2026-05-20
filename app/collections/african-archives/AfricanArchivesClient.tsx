"use client";

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
import "@/app/styles/african-archives.css";

type CatalogSource = "all" | "aodl" | "smithsonian";

type BrowseEntry =
  | { catalog: "aodl"; collection: ExternalArchiveCollection }
  | { catalog: "smithsonian"; collection: SmithsonianOpenCollection };

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

export default function AfricanArchivesClient() {
  const aodlFilters = useMemo(() => listAodlFilterOptions(), []);
  const smithsonianFilters = useMemo(() => listSmithsonianFilterOptions(), []);

  const allEntries = useMemo<BrowseEntry[]>(
    () => [
      ...AODL_COLLECTIONS.map((collection) => ({ catalog: "aodl" as const, collection })),
      ...SMITHSONIAN_COLLECTIONS.map((collection) => ({
        catalog: "smithsonian" as const,
        collection,
      })),
    ],
    [],
  );

  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogSource>("all");

  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("source");
    if (source === "smithsonian" || source === "aodl") {
      setCatalog(source);
    }
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
    <div className="african-archives-page">
      <header className="african-archives-hero">
        <div className="hero-eyebrow">
          Curated external discovery · {AODL_COLLECTIONS.length} AODL +{" "}
          {SMITHSONIAN_COLLECTIONS.length} Smithsonian units
        </div>
        <h1>African &amp; Global Archive Collections</h1>
        <p className="lead">
          A curated gateway to open African oral histories, photographs, objects, manuscripts,
          audio, video, and cultural heritage collections hosted externally by AODL, the
          Smithsonian Institution, and partner projects.
        </p>
        <p className="african-archives-disclaimer" role="note">
          <span aria-hidden="true">↗</span>
          <span>
            This page stores descriptive metadata and links only. Collections open on partner
            sites in a new tab. Smithsonian metadata is CC0 1.0 — still show attribution and
            respect cultural, person, and image sensitivity. No bulk metadata download or media
            rehosting occurs here.
          </span>
        </p>
      </header>

      <div className="african-archives-controls">
        <div className="african-archives-search-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search collections, countries, themes, media types…"
            aria-label="Search archive collections"
          />
        </div>

        <div className="african-archives-filters">
          <label>
            Source
            <select value={catalog} onChange={(e) => setCatalog(e.target.value as CatalogSource)}>
              <option value="all">All sources</option>
              <option value="aodl">AODL</option>
              <option value="smithsonian">Smithsonian Open Access</option>
            </select>
          </label>
          <label>
            Country
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All countries</option>
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
              <option value="">All themes</option>
              {filterOptions.themes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Media type
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="">All media types</option>
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
              <option value="">All languages</option>
              {filterOptions.languages.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform / unit
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">All platforms</option>
              {filterOptions.platforms.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="african-archives-meta">
        <span>
          Showing {filtered.length} of {allEntries.length} collections
        </span>
        {hasFilters ? (
          <button type="button" className="african-archives-clear" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
        <a href="/sources">← Source directory</a>
        <a href="/library">Library search →</a>
      </div>

      {filtered.length ? (
        <div className="african-archives-grid">
          {filtered.map((entry) => {
            const c = entry.collection;
            const isSmithsonian = entry.catalog === "smithsonian";
            const href = isSmithsonian
              ? smithsonianCollectionSearchUrl(entry.collection, query || undefined)
              : c.url;
            const actionLabel = isSmithsonian ? "Search collection ↗" : "Open collection ↗";
            const hostNote = isSmithsonian
              ? "Hosted externally by Smithsonian Open Access (CC0 metadata)"
              : "Hosted externally by AODL or partner project";

            return (
              <article
                key={`${entry.catalog}-${c.id}`}
                className={`aodl-collection-card${isSmithsonian ? " is-smithsonian" : ""}`}
              >
                <div className="aodl-collection-card__head">
                  <span className={isSmithsonian ? "smithsonian-badge" : "aodl-badge"}>
                    {isSmithsonian ? "Smithsonian" : "AODL"}
                  </span>
                  <span className="aodl-type-badge">
                    {isSmithsonian ? "Open cultural collection" : "External open collection"}
                  </span>
                </div>
                <h2>{c.title}</h2>
                <p className="aodl-collection-card__platform">
                  {isSmithsonian ? `${entry.collection.unitCode} · ${c.platform}` : c.platform}
                </p>
                <p>{c.description}</p>
                <div className="aodl-tag-row">
                  {c.mediaTypes.slice(0, 4).map((value) => (
                    <span key={value} className="aodl-tag is-media">
                      {value}
                    </span>
                  ))}
                  {c.countries.slice(0, 2).map((value) => (
                    <span key={value} className="aodl-tag">
                      {value}
                    </span>
                  ))}
                  {c.themes.slice(0, 2).map((value) => (
                    <span key={value} className="aodl-tag">
                      {value}
                    </span>
                  ))}
                </div>
                <a
                  className={isSmithsonian ? "smithsonian-open-btn" : "aodl-open-btn"}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {actionLabel}
                </a>
                <p className="aodl-host-note">{hostNote}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="african-archives-empty" role="status">
          No collections match your filters. Try clearing filters or broadening your search.
        </div>
      )}
    </div>
  );
}
