"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DiscoverResult = {
  id: string;
  title: string;
  creator?: string;
  summary?: string;
  sourceUrl?: string;
  source?: string;
  type?: string;
  thumbnailUrl?: string;
  hasThumbnail?: boolean;
};

type SourceKey = "aodl" | "smithsonian" | "open-access";

type SourceStatus = {
  data: DiscoverResult[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  count: number | null;
};

const INITIAL: SourceStatus = { data: [], loading: false, error: null, loaded: false, count: null };

const SOURCES: { key: SourceKey; label: string; description: string }[] = [
  { key: "aodl", label: "AODL", description: "African Online Digital Library collections" },
  {
    key: "smithsonian",
    label: "Smithsonian Open Access",
    description: "Live museum and archive object search",
  },
  {
    key: "open-access",
    label: "Open access & OER",
    description: "Books, OER and registry handoffs",
  },
];

const DEFAULT_QUERY = "Africa";

function mapAodlResult(raw: Record<string, unknown>): DiscoverResult {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Untitled collection"),
    creator: raw.creator ? String(raw.creator) : undefined,
    summary: raw.summary ? String(raw.summary) : undefined,
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
    source: "AODL",
    type: raw.type ? String(raw.type) : "Collection",
  };
}

function mapSmithsonianResult(raw: Record<string, unknown>): DiscoverResult {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Untitled"),
    creator: raw.creator ? String(raw.creator) : undefined,
    summary: raw.summary ? String(raw.summary) : undefined,
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
    source: "Smithsonian",
    type: raw.type ? String(raw.type) : undefined,
    thumbnailUrl: raw.thumbnailUrl ? String(raw.thumbnailUrl) : undefined,
    hasThumbnail: Boolean(raw.hasThumbnail),
  };
}

function mapOpenAccessResult(raw: Record<string, unknown>): DiscoverResult {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Untitled"),
    creator: raw.creator ? String(raw.creator) : undefined,
    summary: raw.summary ? String(raw.summary) : undefined,
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
    source: raw.source ? String(raw.source) : "Open access",
    type: raw.type ? String(raw.type) : undefined,
  };
}

function DiscoverCard({ result }: { result: DiscoverResult }) {
  const href = result.sourceUrl || "#";
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
        {result.sourceUrl && (
          <a className="aa-disc-link" href={href} target="_blank" rel="noopener noreferrer">
            View at source ↗
          </a>
        )}
      </div>
    </article>
  );
}

export default function AfricanArchivesDiscover() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [inputValue, setInputValue] = useState(DEFAULT_QUERY);
  const [activeTab, setActiveTab] = useState<SourceKey>("aodl");
  const [sources, setSources] = useState<Record<SourceKey, SourceStatus>>({
    aodl: INITIAL,
    smithsonian: INITIAL,
    "open-access": INITIAL,
  });
  const abortRefs = useRef<Record<SourceKey, AbortController | null>>({
    aodl: null,
    smithsonian: null,
    "open-access": null,
  });

  const fetchAll = useCallback(async (q: string) => {
    Object.values(abortRefs.current).forEach((c) => c?.abort());

    setSources({
      aodl: { ...INITIAL, loading: true },
      smithsonian: { ...INITIAL, loading: true },
      "open-access": { ...INITIAL, loading: true },
    });

    const fetches: [SourceKey, string, (raw: Record<string, unknown>) => DiscoverResult][] = [
      ["aodl", `/api/search/aodl?q=${encodeURIComponent(q)}&limit=12`, mapAodlResult],
      [
        "smithsonian",
        `/api/search/smithsonian?q=${encodeURIComponent(q)}&limit=10`,
        mapSmithsonianResult,
      ],
      [
        "open-access",
        `/api/external-open-access?q=${encodeURIComponent(q)}`,
        mapOpenAccessResult,
      ],
    ];

    fetches.forEach(async ([key, url, mapFn]) => {
      const ctrl = new AbortController();
      abortRefs.current[key] = ctrl;

      try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok && json.ok === false) throw new Error(json.error || `HTTP ${res.status}`);

        const rows: Record<string, unknown>[] = Array.isArray(json.results) ? json.results : [];
        const data = rows.slice(0, key === "open-access" ? 10 : rows.length).map(mapFn);

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
          [key]: {
            data: [],
            loading: false,
            error: "Source unavailable",
            loaded: true,
            count: null,
          },
        }));
      }
    });
  }, []);

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
  const totalResults = Object.values(sources).reduce((n, s) => n + s.data.length, 0);

  return (
    <section className="aa-discover">
      <div className="aa-list-inner">
        <h2 className="aa-list-heading">Discover across sources</h2>
        <p className="aa-disclaimer">
          Live federated search via the same API routes as the library. Results open on partner
          sites — not stored here. Smithsonian live search requires network access on the deployed
          server.
        </p>

        <form className="aa-disc-search" onSubmit={handleSearch}>
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search Africa, oral history, textiles, photography…"
            aria-label="Discovery search"
          />
          <button type="submit">Search</button>
        </form>

        <div className="aa-disc-status">
          {SOURCES.map(({ key, label }) => {
            const s = sources[key];
            return (
              <span
                key={key}
                className={`aa-disc-pill${s.loading ? " is-loading" : ""}${s.loaded && s.data.length ? " is-ok" : ""}${s.error ? " is-error" : ""}`}
              >
                {label}
                {s.loading && " …"}
                {s.loaded && !s.loading && ` (${s.data.length})`}
              </span>
            );
          })}
          {Object.values(sources).every((s) => s.loaded) && (
            <span className="aa-disc-total">
              {totalResults} results for &ldquo;{query}&rdquo;
            </span>
          )}
        </div>

        <div className="aa-disc-tabs" role="tablist" aria-label="Discovery sources">
          {SOURCES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={`aa-disc-tab${activeTab === key ? " is-active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="aa-disc-pane" role="tabpanel">
          {current.loading && (
            <p className="aa-disc-message">Searching {SOURCES.find((s) => s.key === activeTab)?.label}…</p>
          )}
          {!current.loading && current.error && !current.data.length && (
            <p className="aa-disc-message">
              {SOURCES.find((s) => s.key === activeTab)?.label} is unavailable — this is expected on
              some local setups. Deployed live search uses the same routes as the library.
            </p>
          )}
          {!current.loading && !current.error && current.loaded && !current.data.length && (
            <p className="aa-disc-message">No results for &ldquo;{query}&rdquo;.</p>
          )}
          {!current.loading && current.data.length > 0 && (
            <div className="aa-disc-grid">
              {current.data.map((result) => (
                <DiscoverCard key={result.id} result={result} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
