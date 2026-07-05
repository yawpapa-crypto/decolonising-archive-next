"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDiscoveryStatusLine,
  defaultSourceState,
  fetchFederatedSource,
  FEDERATED_FETCH_CONCURRENCY,
  FEDERATED_PREFETCH_LIMIT,
  FEDERATED_SOURCE_META,
  FEDERATED_SOURCE_ORDER,
  runWithConcurrency,
  type DiscoverResult,
  type FederatedSourceId,
  type SourceStatus,
} from "@/lib/discovery/federated-discover";

type Variant = "ghana" | "african";

type Props = {
  variant: Variant;
  defaultQuery: string;
  searchPlaceholder: string;
  heading: string;
  description: string;
  collectionSlug?: string;
  extraSourceIds?: FederatedSourceId[];
  queryForSource?: (sourceId: FederatedSourceId, baseQuery: string) => string;
  enableSuggest?: boolean;
};

const DISPLAY_LIMIT = 12;
const EMPTY_EXTRA_SOURCE_IDS: FederatedSourceId[] = [];

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
  collectionSlug,
  onClose,
}: {
  result: DiscoverResult;
  sourceLabel: string;
  collectionSlug: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link =
    result.sourceUrl ||
    result.html_url ||
    result.externalLinks?.[0]?.url ||
    result.wikimediaPage?.canonicalurl;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/collections/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") ?? ""),
          source: String(form.get("source") ?? ""),
          url: String(form.get("url") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          submitterName: String(form.get("submitterName") ?? "") || undefined,
          submitterEmail: String(form.get("submitterEmail") ?? "") || undefined,
          collectionSlug,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not submit suggestion");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit suggestion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ghana-suggest-overlay" onClick={onClose}>
      <div className="ghana-suggest-modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h2>Suggestion submitted</h2>
            <p>
              Thank you — the curatorial team has been notified by email and in the admin dashboard.
            </p>
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
            <form className="ghana-suggest-form" onSubmit={handleSubmit}>
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
              <div className="ghana-suggest-field">
                <label>Your name (optional)</label>
                <input type="text" name="submitterName" autoComplete="name" />
              </div>
              <div className="ghana-suggest-field">
                <label>Your email (optional)</label>
                <input type="email" name="submitterEmail" autoComplete="email" />
              </div>
              <div className="ghana-suggest-field">
                <label>Notes on rights / licence</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="e.g. CC BY-SA via Wikimedia, CC0 from Smithsonian…"
                />
              </div>
              {error && <p className="ghana-suggest-error">{error}</p>}
              <div className="ghana-suggest-actions">
                <button type="button" className="ghana-suggest-cancel" onClick={onClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="ghana-suggest-submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Submit →"}
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
  collectionSlug = "ghana-graphic-design",
  extraSourceIds = EMPTY_EXTRA_SOURCE_IDS,
  queryForSource,
  enableSuggest = false,
}: Props) {
  const extraSourceKey = extraSourceIds.join("|");
  const sourceIds = useMemo(
    () => [...FEDERATED_SOURCE_ORDER, ...extraSourceIds.filter((id) => !FEDERATED_SOURCE_ORDER.includes(id))],
    [extraSourceKey, extraSourceIds],
  );

  const [query, setQuery] = useState(defaultQuery);
  const [inputValue, setInputValue] = useState(defaultQuery);
  const [sources, setSources] = useState<Record<FederatedSourceId, SourceStatus>>(() =>
    Object.fromEntries(sourceIds.map((id) => [id, defaultSourceState()])) as Record<
      FederatedSourceId,
      SourceStatus
    >,
  );
  const [activeTab, setActiveTab] = useState<FederatedSourceId>("wikimedia");
  const [suggestItem, setSuggestItem] = useState<{ result: DiscoverResult; label: string } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const prefetchGeneration = useRef(0);
  const discoverInitialisedRef = useRef(false);
  const runDiscoverSearchRef = useRef<typeof runDiscoverSearch | null>(null);

  const resolveQuery = useCallback(
    (sourceId: FederatedSourceId, base: string) =>
      queryForSource ? queryForSource(sourceId, base) : base,
    [queryForSource],
  );

  const patchSource = useCallback((sourceId: FederatedSourceId, patch: Partial<SourceStatus>) => {
    setSources((prev) => ({
      ...prev,
      [sourceId]: { ...prev[sourceId], ...patch },
    }));
  }, []);

  const loadSource = useCallback(
    async (
      sourceId: FederatedSourceId,
      q: string,
      signal: AbortSignal,
      limit: number,
      force = false,
    ) => {
      setSources((prev) => {
        const current = prev[sourceId];
        if (!force && (current?.loading || current?.loaded)) return prev;
        return {
          ...prev,
          [sourceId]: { ...defaultSourceState(), loading: true },
        };
      });

      try {
        const { data, error, count } = await fetchFederatedSource(sourceId, {
          query: q,
          signal,
          queryForSource: resolveQuery,
          limit,
        });
        if (signal.aborted) return;
        patchSource(sourceId, {
          data,
          loading: false,
          error,
          loaded: true,
          count,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        patchSource(sourceId, {
          data: [],
          loading: false,
          error: "Source unavailable",
          loaded: true,
          count: null,
        });
      }
    },
    [patchSource, resolveQuery],
  );

  const runDiscoverSearch = useCallback(
    async (q: string, priorityTab: FederatedSourceId) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      prefetchGeneration.current += 1;
      const generation = prefetchGeneration.current;

      setSources(
        Object.fromEntries(
          sourceIds.map((id) => [id, defaultSourceState()]),
        ) as Record<FederatedSourceId, SourceStatus>,
      );

      await loadSource(priorityTab, q, ctrl.signal, DISPLAY_LIMIT, true);

      const rest = sourceIds.filter((id) => id !== priorityTab);
      void runWithConcurrency(rest, FEDERATED_FETCH_CONCURRENCY, async (sourceId) => {
        if (ctrl.signal.aborted || generation !== prefetchGeneration.current) return;
        await loadSource(sourceId, q, ctrl.signal, FEDERATED_PREFETCH_LIMIT, true);
      });
    },
    [loadSource, sourceIds],
  );

  runDiscoverSearchRef.current = runDiscoverSearch;

  useEffect(() => {
    if (discoverInitialisedRef.current) return;
    discoverInitialisedRef.current = true;
    void runDiscoverSearchRef.current?.(defaultQuery, "wikimedia");
    return () => {
      abortRef.current?.abort();
      discoverInitialisedRef.current = false;
    };
  }, [defaultQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim() || defaultQuery;
    setQuery(q);
    runDiscoverSearch(q, activeTab);
  }

  function handleTabChange(sourceId: FederatedSourceId) {
    setActiveTab(sourceId);
    const current = sources[sourceId];
    if (!current?.loaded && !current?.loading) {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      void loadSource(sourceId, query, ctrl.signal, DISPLAY_LIMIT, true);
    }
  }

  const current = sources[activeTab] ?? defaultSourceState();
  const visibleResults = current.data.slice(0, DISPLAY_LIMIT);
  const statusLine = buildDiscoveryStatusLine(sources, sourceIds);
  const anyLoading = sourceIds.some((id) => sources[id]?.loading);
  const totalResults = sourceIds.reduce((n, id) => n + (sources[id]?.data.length ?? 0), 0);
  const isWikimediaTab = activeTab === "wikimedia";

  return (
    <>
      {enableSuggest && suggestItem && (
        <SuggestModal
          result={suggestItem.result}
          sourceLabel={suggestItem.label}
          collectionSlug={collectionSlug}
          onClose={() => setSuggestItem(null)}
        />
      )}

      <section className={variant === "ghana" ? "ghana-discover ghana-tab-panel" : "aa-discover"}>
        <div className={variant === "african" ? "aa-list-inner" : undefined}>
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
              {anyLoading ? "Searching connected sources…" : statusLine}
            </span>
            {!anyLoading && (
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
                  onClick={() => handleTabChange(id)}
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

            {!current.loading && visibleResults.length > 0 && isWikimediaTab && (
              <div className="ghana-disc-wiki-grid">
                {visibleResults.map((result) => (
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

            {!current.loading && visibleResults.length > 0 && !isWikimediaTab && (
              <div className={variant === "ghana" ? "ghana-disc-result-list" : "aa-disc-grid"}>
                {visibleResults.map((result) => (
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
              Results are live — not stored in ARED. Suggestions notify the curatorial team by email
              and in the admin dashboard. All rights belong to the respective source institutions.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export { ghanaQueryForSource } from "@/lib/discovery/federated-discover";
