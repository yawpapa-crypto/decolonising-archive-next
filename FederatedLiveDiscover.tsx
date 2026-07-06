"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDiscoveryStatusLine,
  defaultSourceState,
  fetchFederatedSource,
  FEDERATED_SOURCE_META,
  FEDERATED_SOURCE_ORDER,
  ghanaQueryForSource,
  initialSourceMap,
  type DiscoverResult,
  type FederatedSourceId,
  type SourceStatus,
  type WikiPage,
} from "@/lib/discovery/federated-discover";

type Variant = "ghana" | "african";

type Props = {
  variant: Variant;
  defaultQuery: string;
  searchPlaceholder: string;
  heading: string;
  description: string;
  /** Extra sources appended after the standard federation set (e.g. AODL) */
  extraSourceIds?: FederatedSourceId[];
  queryForSource?: (sourceId: FederatedSourceId, baseQuery: string) => string;
  enableSuggest?: boolean;
};

function SafeImg({
  src,
  alt,
  className,
  fallbackClass,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackClass?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={fallbackClass ?? "ghana-disc-wiki-empty"} aria-hidden="true">
        🖼
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setBroken(true)} />
  );
}

function SuggestModal({
  result,
  sourceLabel,
  onClose,
}: {
  result: DiscoverResult;
  sourceLabel: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const link =
    result.sourceUrl ||
    result.html_url ||
    result.externalLinks?.[0]?.url ||
    result.wikimediaPage?.canonicalurl;

  return (
    <div className="ghana-suggest-overlay" onClick={onClose}>
      <div className="ghana-suggest-modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h2>Suggestion submitted</h2>
            <p>The ARED team will review this item for the collection.</p>
            <div className="ghana-suggest-actions">
              <button type="button" className="ghana-suggest-submit" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Suggest for archive</h2>
            <p>
              Submit this item from <strong>{sourceLabel}</strong> for curatorial review.
            </p>
            <form
              className="ghana-suggest-form"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="ghana-suggest-field">
                <label>Title</label>
                <input type="text" name="title" defaultValue={result.title} required />
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
              <div className="ghana-suggest-actions">
                <button type="button" className="ghana-suggest-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="ghana-suggest-submit">
                  Submit →
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function WikiGridCard({
  result,
  onSuggest,
}: {
  result: DiscoverResult;
  onSuggest?: (r: DiscoverResult) => void;
}) {
  const page = result.wikimediaPage;
  if (!page) return null;
  const info = page.imageinfo?.[0];
  const licence = info?.extmetadata?.LicenseShortName?.value ?? "";

  return (
    <div className="ghana-disc-wiki-card">
      {info?.url ? (
        <a href={page.canonicalurl ?? "#"} target="_blank" rel="noopener noreferrer">
          <SafeImg src={info.url} alt={result.title} className="ghana-disc-wiki-img" />
        </a>
      ) : (
        <div className="ghana-disc-wiki-empty">🖼</div>
      )}
      <div className="ghana-disc-wiki-meta">
        <span className="ghana-disc-wiki-name">{result.title.slice(0, 55)}</span>
        {licence && <span className="ghana-live-wiki-licence">{licence}</span>}
        {onSuggest && (
          <button type="button" className="ghana-disc-suggest-btn" onClick={() => onSuggest(result)}>
            + Suggest
          </button>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  variant,
  onSuggest,
}: {
  result: DiscoverResult;
  variant: Variant;
  onSuggest?: (r: DiscoverResult) => void;
}) {
  const link = result.sourceUrl || result.html_url || result.externalLinks?.[0]?.url;

  if (variant === "african") {
    return (
      <article className="aa-disc-card">
        {result.thumbnailUrl && result.hasThumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.thumbnailUrl} alt="" className="aa-disc-thumb" loading="lazy" />
        )}
        <div className="aa-disc-body">
          <div className="aa-disc-meta">
            {result.source && <span>{result.source}</span>}
            {result.type && <span>{result.type}</span>}
          </div>
          <h3 className="aa-disc-title">{result.title}</h3>
          {result.creator && <p className="aa-disc-creator">{result.creator}</p>}
          {result.summary && <p className="aa-disc-summary">{result.summary.slice(0, 220)}</p>}
          {link && (
            <a className="aa-disc-link" href={link} target="_blank" rel="noopener noreferrer">
              View at source ↗
            </a>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="ghana-disc-result-card">
      {result.thumbnailUrl && result.hasThumbnail && (
        <SafeImg
          src={result.thumbnailUrl}
          alt={result.title}
          className="ghana-disc-result-thumb"
          fallbackClass="ghana-disc-wiki-empty"
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
          {onSuggest && (
            <button type="button" className="ghana-live-action-suggest" onClick={() => onSuggest(result)}>
              + Suggest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FederatedLiveDiscover({
  variant,
  defaultQuery,
  searchPlaceholder,
  heading,
  description,
  extraSourceIds = [],
  queryForSource,
  enableSuggest = false,
}: Props) {
  const sourceIds = useMemo(
    () => [...FEDERATED_SOURCE_ORDER, ...extraSourceIds.filter((id) => !FEDERATED_SOURCE_ORDER.includes(id))],
    [extraSourceIds],
  );

  const [query, setQuery] = useState(defaultQuery);
  const [inputValue, setInputValue] = useState(defaultQuery);
  const [sources, setSources] = useState<Record<FederatedSourceId, SourceStatus>>(() =>
    initialSourceMap(sourceIds),
  );
  const [activeTab, setActiveTab] = useState<FederatedSourceId>(sourceIds[0]);
  const [suggestItem, setSuggestItem] = useState<{ result: DiscoverResult; label: string } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  const resolveQuery = useCallback(
    (sourceId: FederatedSourceId, base: string) =>
      queryForSource ? queryForSource(sourceId, base) : base,
    [queryForSource],
  );

  const fetchAll = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setSources(
        Object.fromEntries(
          sourceIds.map((id) => [id, { ...defaultSourceState(), loading: true }]),
        ) as Record<FederatedSourceId, SourceStatus>,
      );

      await Promise.all(
        sourceIds.map(async (sourceId) => {
          try {
            const { data, error, count } = await fetchFederatedSource(sourceId, {
              query: q,
              signal: ctrl.signal,
              queryForSource: resolveQuery,
            });
            if (ctrl.signal.aborted) return;
            setSources((prev) => ({
              ...prev,
              [sourceId]: { data, loading: false, error, loaded: true, count },
            }));
          } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setSources((prev) => ({
              ...prev,
              [sourceId]: {
                data: [],
                loading: false,
                error: "Source unavailable",
                loaded: true,
                count: null,
              },
            }));
          }
        }),
      );
    },
    [resolveQuery, sourceIds],
  );

  useEffect(() => {
    fetchAll(defaultQuery);
    return () => abortRef.current?.abort();
  }, [defaultQuery, fetchAll]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim() || defaultQuery;
    setQuery(q);
    fetchAll(q);
  }

  const current = sources[activeTab] ?? defaultSourceState();
  const statusLine = buildDiscoveryStatusLine(sources, sourceIds);
  const allLoaded = sourceIds.every((id) => sources[id]?.loaded);
  const totalResults = sourceIds.reduce((n, id) => n + (sources[id]?.data.length ?? 0), 0);
  const isWikimediaTab = activeTab === "wikimedia";

  const shellClass =
    variant === "ghana" ? "ghana-discover ghana-tab-panel" : "aa-discover";
  const innerClass = variant === "african" ? "aa-list-inner" : undefined;

  return (
    <>
      {enableSuggest && suggestItem && (
        <SuggestModal
          result={suggestItem.result}
          sourceLabel={suggestItem.label}
          onClose={() => setSuggestItem(null)}
        />
      )}

      <section className={shellClass}>
        <div className={innerClass}>
          {variant === "ghana" ? (
            <div className="ghana-discover-header ghana-discover-header--editorial">
              <div>
                <div className="ghana-ed-kicker">
                  <span className="ghana-ed-arrow" aria-hidden="true">
                    ▶▶
                  </span>
                  Live discovery
                </div>
                <h2 className="ghana-ed-heading">{heading}</h2>
                <p className="ghana-ed-lead ghana-discover-desc">{description}</p>
              </div>
              <form className="ghana-discover-search" onSubmit={handleSearch}>
                <input
                  type="search"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Discovery search query"
                />
                <button type="submit">Search</button>
              </form>
            </div>
          ) : (
            <>
              <h2 className="aa-list-heading">{heading}</h2>
              <p className="aa-disclaimer">{description}</p>
              <form className="aa-disc-search" onSubmit={handleSearch}>
                <input
                  type="search"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Discovery search"
                />
                <button type="submit">Search</button>
              </form>
            </>
          )}

          <div
            className={variant === "ghana" ? "ghana-discover-status" : "aa-disc-status"}
            role="status"
            aria-live="polite"
          >
            <span
              className={
                variant === "ghana"
                  ? "ghana-discover-total ghana-discover-total--line"
                  : "aa-disc-total aa-disc-total--line"
              }
            >
              {allLoaded ? statusLine : "Searching connected sources…"}
            </span>
            {allLoaded && (
              <span className={variant === "ghana" ? "ghana-discover-total" : "aa-disc-total"}>
                {totalResults} results for &ldquo;{query}&rdquo;
              </span>
            )}
          </div>

          <div
            className={variant === "ghana" ? "ghana-live-source-tabs" : "aa-disc-tabs"}
            role="tablist"
            aria-label="Discovery sources"
          >
            {sourceIds.map((id) => {
              const meta = FEDERATED_SOURCE_META[id];
              const s = sources[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  className={
                    variant === "ghana"
                      ? `ghana-live-source-tab${activeTab === id ? " is-active" : ""}`
                      : `aa-disc-tab${activeTab === id ? " is-active" : ""}`
                  }
                  onClick={() => setActiveTab(id)}
                >
                  {variant === "ghana" && <span>{meta.icon}</span>}
                  <span>{meta.label}</span>
                  {s?.loading && (
                    <span className={variant === "ghana" ? "ghana-live-tab-spinner" : undefined}>
                      …
                    </span>
                  )}
                  {s?.loaded && !s.loading && (
                    <span className={variant === "ghana" ? "ghana-live-tab-count" : undefined}>
                      {s.data.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className={variant === "ghana" ? "ghana-discover-pane" : "aa-disc-pane"}
            role="tabpanel"
          >
            {current.loading && (
              <p className={variant === "ghana" ? "ghana-live-loading" : "aa-disc-message"}>
                Searching {FEDERATED_SOURCE_META[activeTab].label}…
              </p>
            )}

            {!current.loading && current.error && !current.data.length && (
              <p className={variant === "ghana" ? "ghana-live-error" : "aa-disc-message"}>
                {FEDERATED_SOURCE_META[activeTab].label} unavailable — same routes as the main
                library search.
              </p>
            )}

            {!current.loading && !current.error && current.loaded && !current.data.length && (
              <p className={variant === "ghana" ? "ghana-live-empty" : "aa-disc-message"}>
                No results for &ldquo;{query}&rdquo; in {FEDERATED_SOURCE_META[activeTab].label}.
              </p>
            )}

            {!current.loading && current.data.length > 0 && isWikimediaTab && (
              <div className="ghana-disc-wiki-grid">
                {current.data.map((result) => (
                  <WikiGridCard
                    key={result.id}
                    result={result}
                    onSuggest={
                      enableSuggest
                        ? (r) =>
                            setSuggestItem({
                              result: r,
                              label: FEDERATED_SOURCE_META[activeTab].label,
                            })
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {!current.loading && current.data.length > 0 && !isWikimediaTab && (
              <div
                className={
                  variant === "ghana" ? "ghana-disc-result-list" : "aa-disc-grid"
                }
              >
                {current.data.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    variant={variant}
                    onSuggest={
                      enableSuggest
                        ? (r) =>
                            setSuggestItem({
                              result: r,
                              label: FEDERATED_SOURCE_META[activeTab].label,
                            })
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {variant === "ghana" && (
            <div className="ghana-live-footer" style={{ marginTop: "1.5rem" }}>
              Results are live — not stored in ARED. Suggest items to add them to the curatorial
              queue. All rights belong to the respective source institutions.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export { ghanaQueryForSource };
