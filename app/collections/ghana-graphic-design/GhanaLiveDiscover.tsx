"use client";

/**
 * GhanaLiveDiscover — multi-source discovery panel for the Ghana collection.
 *
 * Fires simultaneous searches across ARED's connected APIs:
 *   Wikimedia Commons, Smithsonian Open Access, Crossref, Semantic Scholar
 *
 * Results are live (not stored). Each result has a "Suggest for archive →"
 * button that opens the suggest form pre-filled with the result's metadata.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── Safe image with error fallback ────────────────────────────────────────────
function SafeImg({
  src,
  alt,
  className,
  fallbackClass,
  fallbackContent = "🖼",
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackClass?: string;
  fallbackContent?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={fallbackClass ?? "ghana-disc-wiki-empty"} aria-hidden="true">{fallbackContent}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setBroken(true)} />
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type WikiPage = {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    url: string;
    extmetadata?: {
      LicenseShortName?: { value: string };
      Artist?: { value: string };
    };
  }>;
  canonicalurl?: string;
};

type LiveResult = {
  id: string;
  title: string;
  creator?: string;
  summary?: string;
  period?: string;
  thumbnailUrl?: string;
  hasThumbnail?: boolean;
  sourceUrl?: string;
  externalLinks?: Array<{ label: string; url: string }>;
  html_url?: string;
  type?: string;
};

type SourceKey = "wikimedia" | "smithsonian" | "crossref" | "semantic-scholar";

type SourceStatus = {
  data: Array<WikiPage | LiveResult>;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  count: number | null;
};

const SOURCES: { key: SourceKey; label: string; icon: string; description: string }[] = [
  {
    key: "wikimedia",
    label: "Wikimedia Commons",
    icon: "🖼",
    description: "Open-access images and media files",
  },
  {
    key: "smithsonian",
    label: "Smithsonian Open Access",
    icon: "🏛",
    description: "Museum objects, CC0 metadata",
  },
  {
    key: "crossref",
    label: "Crossref",
    icon: "📄",
    description: "Academic papers and scholarly records",
  },
  {
    key: "semantic-scholar",
    label: "Semantic Scholar",
    icon: "🔬",
    description: "Open-access research literature",
  },
];

const INITIAL: SourceStatus = { data: [], loading: false, error: null, loaded: false, count: null };

// ── Suggest modal (lightweight inline version) ────────────────────────────────

function SuggestModal({
  item,
  sourceLabel,
  onClose,
}: {
  item: WikiPage | LiveResult;
  sourceLabel: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const title = "title" in item ? item.title : (item as WikiPage).title;
  const link =
    "canonicalurl" in item
      ? (item as WikiPage).canonicalurl
      : (item as LiveResult).sourceUrl ||
        (item as LiveResult).html_url ||
        (item as LiveResult).externalLinks?.[0]?.url;

  return (
    <div className="ghana-suggest-overlay" onClick={onClose}>
      <div className="ghana-suggest-modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h2>Suggestion submitted</h2>
            <p>The ARED team will review this item for the collection.</p>
            <div className="ghana-suggest-actions">
              <button className="ghana-suggest-submit" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <h2>Suggest for archive</h2>
            <p>Submit this item from <strong>{sourceLabel}</strong> for curatorial review.</p>
            <form
              className="ghana-suggest-form"
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            >
              <div className="ghana-suggest-field">
                <label>Title</label>
                <input type="text" name="title" defaultValue={title} required />
              </div>
              <div className="ghana-suggest-field">
                <label>Source</label>
                <input type="text" name="source" defaultValue={sourceLabel} required />
              </div>
              {link && (
                <div className="ghana-suggest-field">
                  <label>URL</label>
                  <input type="url" name="url" defaultValue={link} />
                </div>
              )}
              <div className="ghana-suggest-field">
                <label>Notes on rights / licence</label>
                <textarea name="notes" rows={3} placeholder="e.g. CC BY-SA via Wikimedia, CC0 from Smithsonian…" />
              </div>
              <div className="ghana-suggest-actions">
                <button type="button" className="ghana-suggest-cancel" onClick={onClose}>Cancel</button>
                <button type="submit" className="ghana-suggest-submit">Submit →</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Source result cards ───────────────────────────────────────────────────────

function WikiDiscoverCard({
  page,
  onSuggest,
}: {
  page: WikiPage;
  onSuggest: (p: WikiPage) => void;
}) {
  const info = page.imageinfo?.[0];
  const imageUrl = info?.url;
  const licence = info?.extmetadata?.LicenseShortName?.value ?? "";
  const name = page.title.replace(/^File:/, "").replace(/_/g, " ").replace(/\.[^.]+$/, "");

  return (
    <div className="ghana-disc-wiki-card">
      {imageUrl ? (
        <a href={page.canonicalurl ?? "#"} target="_blank" rel="noopener noreferrer">
          <SafeImg src={imageUrl} alt={name} className="ghana-disc-wiki-img" />
        </a>
      ) : (
        <div className="ghana-disc-wiki-empty">🖼</div>
      )}
      <div className="ghana-disc-wiki-meta">
        <span className="ghana-disc-wiki-name">{name.slice(0, 55)}</span>
        {licence && <span className="ghana-live-wiki-licence">{licence}</span>}
        <button className="ghana-disc-suggest-btn" onClick={() => onSuggest(page)}>
          + Suggest
        </button>
      </div>
    </div>
  );
}

function LiveDiscoverCard({
  result,
  onSuggest,
}: {
  result: LiveResult;
  onSuggest: (r: LiveResult) => void;
}) {
  const link =
    result.sourceUrl || result.html_url || result.externalLinks?.[0]?.url;

  return (
    <div className="ghana-disc-result-card">
      {result.thumbnailUrl && result.hasThumbnail && (
        <SafeImg
          src={result.thumbnailUrl}
          alt={result.title}
          className="ghana-disc-result-thumb"
          fallbackContent="📋"
        />
      )}
      <div className="ghana-disc-result-body">
        {result.type && <div className="ghana-live-result-type">{result.type}</div>}
        <div className="ghana-disc-result-title">{result.title.slice(0, 90)}</div>
        {result.creator && (
          <div className="ghana-live-result-creator">{result.creator.slice(0, 70)}</div>
        )}
        {result.period && <div className="ghana-live-result-period">{result.period}</div>}
        {result.summary && (
          <p className="ghana-disc-result-summary">{result.summary.slice(0, 150)}&hellip;</p>
        )}
        <div className="ghana-live-result-actions">
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="ghana-live-action-link">
              View →
            </a>
          )}
          <button className="ghana-live-action-suggest" onClick={() => onSuggest(result)}>
            + Suggest
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Discover component ───────────────────────────────────────────────────

const DEFAULT_QUERY = "ghana graphic design";

// For Wikimedia, add visual/design exclusion context to reduce landscape/wildlife noise
function buildWikimediaQuery(q: string): string {
  const base = q.trim();
  // If user typed something custom, honour it. For the default, add specificity.
  if (base === "ghana graphic design") {
    return "Ghana design art poster visual culture graphic";
  }
  // Ensure Ghana + design context even for custom searches
  const hasGhana = /ghana/i.test(base);
  const hasDesign = /design|poster|art|visual|graphic|print|type/i.test(base);
  if (!hasGhana) return `Ghana ${base}`;
  if (!hasDesign) return `${base} design visual`;
  return base;
}

export default function GhanaLiveDiscover({
  onSuggest,
}: {
  onSuggest?: (title: string, sourceUrl: string, sourceLabel: string) => void;
}) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [inputValue, setInputValue] = useState(DEFAULT_QUERY);
  const [sources, setSources] = useState<Record<SourceKey, SourceStatus>>({
    wikimedia: INITIAL,
    smithsonian: INITIAL,
    crossref: INITIAL,
    "semantic-scholar": INITIAL,
  });
  const [activeTab, setActiveTab] = useState<SourceKey>("wikimedia");
  const [suggestItem, setSuggestItem] = useState<{
    item: WikiPage | LiveResult;
    sourceLabel: string;
  } | null>(null);
  const abortRefs = useRef<Record<SourceKey, AbortController | null>>({
    wikimedia: null,
    smithsonian: null,
    crossref: null,
    "semantic-scholar": null,
  });

  const fetchAll = useCallback(async (q: string) => {
    // Cancel any in-flight requests
    Object.values(abortRefs.current).forEach((c) => c?.abort());

    setSources({
      wikimedia: { ...INITIAL, loading: true },
      smithsonian: { ...INITIAL, loading: true },
      crossref: { ...INITIAL, loading: true },
      "semantic-scholar": { ...INITIAL, loading: true },
    });

    const scholarlyQ = q.includes("design") ? q : `ghana graphic design ${q}`;
    const wikiQ = buildWikimediaQuery(q);

    const fetches: [SourceKey, string][] = [
      ["wikimedia", `/api/search/wikimedia?q=${encodeURIComponent(wikiQ)}&limit=12`],
      ["smithsonian", `/api/search/smithsonian?q=${encodeURIComponent(q)}&limit=8`],
      ["crossref", `/api/search/crossref?q=${encodeURIComponent(scholarlyQ)}&limit=8`],
      ["semantic-scholar", `/api/search/semantic-scholar?q=${encodeURIComponent(scholarlyQ)}&limit=8`],
    ];

    fetches.forEach(async ([key, url]) => {
      const ctrl = new AbortController();
      abortRefs.current[key] = ctrl;

      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data: Array<WikiPage | LiveResult> =
          key === "wikimedia" ? (json.pages ?? []) : (json.results ?? []);

        setSources((prev) => ({
          ...prev,
          [key]: {
            data,
            loading: false,
            error: json.error ? String(json.error) : null,
            loaded: true,
            count: json.count ?? data.length,
          },
        }));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSources((prev) => ({
          ...prev,
          [key]: { data: [], loading: false, error: "Request failed", loaded: true, count: null },
        }));
      }
    });
  }, []);

  // Load on mount
  useEffect(() => {
    fetchAll(DEFAULT_QUERY);
  }, [fetchAll]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim() || DEFAULT_QUERY;
    setQuery(q);
    fetchAll(q);
  }

  const current = sources[activeTab];
  const totalLoaded = Object.values(sources).filter((s) => s.loaded).length;
  const totalResults = Object.values(sources).reduce((sum, s) => sum + s.data.length, 0);

  return (
    <>
      {suggestItem && (
        <SuggestModal
          item={suggestItem.item}
          sourceLabel={suggestItem.sourceLabel}
          onClose={() => setSuggestItem(null)}
        />
      )}

      <div className="ghana-discover ghana-tab-panel">
        {/* Header */}
        <div className="ghana-discover-header ghana-discover-header--editorial">
          <div>
            <div className="ghana-ed-kicker">
              <span className="ghana-ed-arrow" aria-hidden="true">
                ▶▶
              </span>
              Live discovery
            </div>
            <h2 className="ghana-ed-heading">Search connected sources</h2>
            <p className="ghana-ed-lead ghana-discover-desc">
              Searching across Wikimedia Commons, Smithsonian Open Access, Crossref, and Semantic
              Scholar — live, unarchived results. Use &ldquo;+ Suggest&rdquo; to nominate an item
              for the collection.
            </p>
          </div>
          <form className="ghana-discover-search" onSubmit={handleSearch}>
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search across all sources…"
              aria-label="Discovery search query"
            />
            <button type="submit">Search</button>
          </form>
        </div>

        {/* Source status bar */}
        <div className="ghana-discover-status">
          {SOURCES.map(({ key, label, icon }) => {
            const s = sources[key];
            return (
              <div
                key={key}
                className={`ghana-discover-source-pill ${s.loading ? "is-loading" : ""} ${s.loaded && !s.error && s.data.length > 0 ? "is-active" : ""} ${s.error ? "is-error" : ""}`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {s.loading && <span className="ghana-disc-spinner">…</span>}
                {s.loaded && !s.error && (
                  <span className="ghana-disc-pill-count">{s.data.length}</span>
                )}
                {s.error && <span className="ghana-disc-pill-err">—</span>}
              </div>
            );
          })}
          {totalLoaded === 4 && (
            <div className="ghana-discover-total">
              {totalResults} results across {SOURCES.length} sources for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Source tabs */}
        <div className="ghana-live-source-tabs">
          {SOURCES.map(({ key, label, icon }) => {
            const s = sources[key];
            return (
              <button
                key={key}
                className={`ghana-live-source-tab ${activeTab === key ? "is-active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {s.loading && <span className="ghana-live-tab-spinner">…</span>}
                {s.loaded && !s.error && (
                  <span className="ghana-live-tab-count">{s.data.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results pane */}
        <div className="ghana-discover-pane">
          {current.loading && (
            <div className="ghana-live-loading">
              Searching {SOURCES.find((s) => s.key === activeTab)?.label}…
            </div>
          )}

          {!current.loading && current.error && (
            <div className="ghana-live-error">
              No results from {SOURCES.find((s) => s.key === activeTab)?.label} — source may be
              temporarily unavailable.
            </div>
          )}

          {!current.loading && current.loaded && !current.error && current.data.length === 0 && (
            <div className="ghana-live-empty">
              No results found for &ldquo;{query}&rdquo; in{" "}
              {SOURCES.find((s) => s.key === activeTab)?.label}.
            </div>
          )}

          {!current.loading && activeTab === "wikimedia" && current.data.length > 0 && (
            <div className="ghana-disc-wiki-grid">
              {(current.data as WikiPage[]).map((page) => (
                <WikiDiscoverCard
                  key={page.pageid}
                  page={page}
                  onSuggest={(p) =>
                    setSuggestItem({ item: p, sourceLabel: "Wikimedia Commons" })
                  }
                />
              ))}
            </div>
          )}

          {!current.loading && activeTab !== "wikimedia" && current.data.length > 0 && (
            <div className="ghana-disc-result-list">
              {(current.data as LiveResult[]).map((result) => (
                <LiveDiscoverCard
                  key={result.id}
                  result={result}
                  onSuggest={(r) =>
                    setSuggestItem({
                      item: r,
                      sourceLabel: SOURCES.find((s) => s.key === activeTab)?.label ?? activeTab,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="ghana-live-footer" style={{ marginTop: "1.5rem" }}>
          Results are live — not stored in ARED. Suggest items to add them to the curatorial
          queue. All rights are those of the respective source institutions.
        </div>
      </div>
    </>
  );
}
