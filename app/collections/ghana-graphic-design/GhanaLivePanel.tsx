"use client";

/**
 * GhanaLivePanel — draws on ARED's existing live search API routes
 * (Wikimedia Commons, Smithsonian Open Access, Crossref, Semantic Scholar)
 * to surface related sources for each archive item.
 *
 * API routes are already built and live on Vercel:
 *   /api/search/wikimedia
 *   /api/search/smithsonian
 *   /api/search/crossref
 *   /api/search/semantic-scholar
 */

import { useCallback, useEffect, useState } from "react";
import type { ArchiveItemCategory } from "@/lib/data/ghana-collection";

// ── Safe image with onError fallback ─────────────────────────────────────────
function SafeImg({
  src,
  alt,
  className,
  fallbackClass = "ghana-live-wiki-placeholder",
  fallbackContent = "🖼",
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackClass?: string;
  fallbackContent?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={fallbackClass} aria-hidden="true">{fallbackContent}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

// ── Response type shapes ──────────────────────────────────────────────────────

type WikiPage = {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    url: string;
    extmetadata?: {
      LicenseShortName?: { value: string };
      Artist?: { value: string };
      ImageDescription?: { value: string };
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
  pdf_url?: string;
  html_url?: string;
  type?: string;
};

type SourceState = {
  data: WikiPage[] | LiveResult[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
};

type Source = "wikimedia" | "smithsonian" | "crossref" | "semantic-scholar";

const SOURCE_LABELS: Record<Source, string> = {
  wikimedia: "Wikimedia Commons",
  smithsonian: "Smithsonian",
  crossref: "Crossref",
  "semantic-scholar": "Semantic Scholar",
};

const SOURCE_ICONS: Record<Source, string> = {
  wikimedia: "🖼",
  smithsonian: "🏛",
  crossref: "📄",
  "semantic-scholar": "🔬",
};

// Map collection categories to Wikimedia-friendly design/media keywords
const CATEGORY_WIKI_TERMS: Record<string, string> = {
  "early-print": "print typography",
  independence: "independence political design",
  newspapers: "newspaper press",
  political: "political poster propaganda",
  "cinema-posters": "cinema film poster",
  "street-signage": "signage commercial art",
  music: "music album cover",
  religious: "religious visual art",
  textile: "textile kente cloth",
  institutional: "institutional design identity",
  digital: "digital art design",
};

function buildQuery(source: Source, title: string, category: string, tags: string[]): string {
  if (source === "crossref" || source === "semantic-scholar") {
    const catWords = category.replace(/-/g, " ");
    return `ghana graphic design ${catWords}`;
  }
  const shortTitle = title
    .split("—")[0]
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ")
    .replace(/Ghana/i, "")
    .trim();
  const catTerm = CATEGORY_WIKI_TERMS[category] ?? "design visual";
  if (source === "wikimedia") {
    // Wikimedia Commons namespace:6 full-text search — include design context to reduce noise
    return `${shortTitle} Ghana ${catTerm}`;
  }
  // Smithsonian
  return `${shortTitle} Ghana design`;
}

// ── Wikimedia image grid ──────────────────────────────────────────────────────

function WikiCard({ page }: { page: WikiPage }) {
  const info = page.imageinfo?.[0];
  const imageUrl = info?.url;
  const licence = info?.extmetadata?.LicenseShortName?.value ?? "";
  const artist = info?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "") ?? "";
  const name = page.title.replace(/^File:/, "").replace(/_/g, " ").replace(/\.[^.]+$/, "");

  return (
    <a
      href={page.canonicalurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="ghana-live-wiki-card"
    >
      {imageUrl ? (
        <SafeImg src={imageUrl} alt={name} className="ghana-live-wiki-img" />
      ) : (
        <div className="ghana-live-wiki-placeholder">🖼</div>
      )}
      <div className="ghana-live-wiki-meta">
        <span className="ghana-live-wiki-name">{name.slice(0, 60)}</span>
        {artist && <span className="ghana-live-wiki-artist">{artist.slice(0, 40)}</span>}
        {licence && <span className="ghana-live-wiki-licence">{licence}</span>}
      </div>
    </a>
  );
}

// ── Generic live result card ──────────────────────────────────────────────────

function LiveResultCard({
  result,
  source,
  onSuggest,
}: {
  result: LiveResult;
  source: Source;
  onSuggest: (result: LiveResult) => void;
}) {
  const link =
    result.sourceUrl ||
    result.html_url ||
    result.pdf_url ||
    result.externalLinks?.[0]?.url;

  return (
    <div className="ghana-live-result-card">
      {result.thumbnailUrl && result.hasThumbnail && (
        <SafeImg
          src={result.thumbnailUrl}
          alt={result.title}
          className="ghana-live-result-thumb"
          fallbackClass="ghana-live-result-thumb-err"
          fallbackContent="📋"
        />
      )}
      <div className="ghana-live-result-body">
        <div className="ghana-live-result-type">{result.type ?? SOURCE_LABELS[source]}</div>
        <div className="ghana-live-result-title">{result.title}</div>
        {result.creator && (
          <div className="ghana-live-result-creator">{result.creator.slice(0, 80)}</div>
        )}
        {result.period && <div className="ghana-live-result-period">{result.period}</div>}
        {result.summary && (
          <p className="ghana-live-result-summary">{result.summary.slice(0, 180)}&hellip;</p>
        )}
        <div className="ghana-live-result-actions">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="ghana-live-action-link"
            >
              View source →
            </a>
          )}
          <button className="ghana-live-action-suggest" onClick={() => onSuggest(result)}>
            Suggest for archive →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Suggest pre-fill modal ────────────────────────────────────────────────────

function QuickSuggestModal({
  result,
  source,
  onClose,
}: {
  result: LiveResult;
  source: Source;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link =
    result.sourceUrl || result.html_url || result.externalLinks?.[0]?.url || "";

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
          collectionSlug: "ghana-graphic-design",
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
            <p>The curatorial team has been notified by email and in the admin dashboard.</p>
            <div className="ghana-suggest-actions">
              <button type="button" className="ghana-suggest-submit" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <h2>Suggest for archive</h2>
            <p>
              You found this via <strong>{SOURCE_LABELS[source]}</strong>. Submit it for curatorial review.
            </p>
            <form className="ghana-suggest-form" onSubmit={handleSubmit}>
              <div className="ghana-suggest-field">
                <label>Title</label>
                <input type="text" name="title" defaultValue={result.title} required />
              </div>
              <div className="ghana-suggest-field">
                <label>Source</label>
                <input type="text" name="source" defaultValue={SOURCE_LABELS[source]} required />
              </div>
              <div className="ghana-suggest-field">
                <label>URL</label>
                <input type="url" name="url" defaultValue={link} />
              </div>
              <div className="ghana-suggest-field">
                <label>Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={`Discovered via ${SOURCE_LABELS[source]} live search. ${result.creator ? `Creator: ${result.creator}.` : ""}`}
                />
              </div>
              {error && <p className="ghana-suggest-error">{error}</p>}
              <div className="ghana-suggest-actions">
                <button type="button" className="ghana-suggest-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
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

// ── Main panel ────────────────────────────────────────────────────────────────

type Props = {
  itemTitle: string;
  itemCategory: ArchiveItemCategory;
  itemTags: string[];
};

const INITIAL_SOURCE_STATE: SourceState = { data: [], loading: false, error: null, loaded: false };

export default function GhanaLivePanel({ itemTitle, itemCategory, itemTags }: Props) {
  const [activeSource, setActiveSource] = useState<Source>("wikimedia");
  const [suggest, setSuggest] = useState<{ result: LiveResult; source: Source } | null>(null);
  const [sources, setSources] = useState<Record<Source, SourceState>>({
    wikimedia: INITIAL_SOURCE_STATE,
    smithsonian: INITIAL_SOURCE_STATE,
    crossref: INITIAL_SOURCE_STATE,
    "semantic-scholar": INITIAL_SOURCE_STATE,
  });

  const loadSource = useCallback(
    async (source: Source) => {
      setSources((prev) => {
        if (prev[source].loading || prev[source].loaded) return prev;
        return { ...prev, [source]: { ...prev[source], loading: true, error: null } };
      });

      const query = buildQuery(source, itemTitle, itemCategory, itemTags);
      const endpoint =
        source === "wikimedia"
          ? `/api/search/wikimedia?q=${encodeURIComponent(query)}&limit=12`
          : source === "smithsonian"
            ? `/api/search/smithsonian?q=${encodeURIComponent(query)}&limit=6`
            : source === "crossref"
              ? `/api/search/crossref?q=${encodeURIComponent(query)}&limit=6`
              : `/api/search/semantic-scholar?q=${encodeURIComponent(query)}&limit=6`;

      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data: WikiPage[] | LiveResult[] =
          source === "wikimedia" ? (json.pages ?? []) : (json.results ?? []);
        const error = json.error ? String(json.error) : null;
        setSources((prev) => ({ ...prev, [source]: { data, loading: false, error, loaded: true } }));
      } catch (err) {
        setSources((prev) => ({
          ...prev,
          [source]: { data: [], loading: false, error: "Could not load results", loaded: true },
        }));
      }
    },
    [itemTitle, itemCategory, itemTags],
  );

  // Auto-load wikimedia on mount
  useEffect(() => {
    loadSource("wikimedia");
  }, [loadSource]);

  function handleTabClick(source: Source) {
    setActiveSource(source);
    loadSource(source);
  }

  const current = sources[activeSource];

  return (
    <>
      {suggest && (
        <QuickSuggestModal
          result={suggest.result}
          source={suggest.source}
          onClose={() => setSuggest(null)}
        />
      )}

      <div className="ghana-live-panel">
        <div className="ghana-live-panel-header">
          <div className="ghana-live-panel-title">Live sources</div>
          <div className="ghana-live-panel-subtitle">
            Drawing from ARED&apos;s connected open-access archives — results are live, not stored.
          </div>
        </div>

        {/* Source tabs */}
        <div className="ghana-live-source-tabs">
          {(["wikimedia", "smithsonian", "crossref", "semantic-scholar"] as Source[]).map((src) => {
            const st = sources[src];
            return (
              <button
                key={src}
                className={`ghana-live-source-tab ${activeSource === src ? "is-active" : ""}`}
                onClick={() => handleTabClick(src)}
              >
                <span>{SOURCE_ICONS[src]}</span>
                <span>{SOURCE_LABELS[src]}</span>
                {st.loaded && !st.error && (
                  <span className="ghana-live-tab-count">{st.data.length}</span>
                )}
                {st.loading && <span className="ghana-live-tab-spinner">…</span>}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="ghana-live-results">
          {current.loading && (
            <div className="ghana-live-loading">
              Searching {SOURCE_LABELS[activeSource]}…
            </div>
          )}

          {!current.loading && current.error && (
            <div className="ghana-live-error">
              {SOURCE_LABELS[activeSource]} returned no results for this item.
              {current.error !== "Could not load results" && (
                <span className="ghana-live-error-detail"> ({current.error})</span>
              )}
            </div>
          )}

          {!current.loading && !current.error && current.loaded && current.data.length === 0 && (
            <div className="ghana-live-empty">
              No matching results in {SOURCE_LABELS[activeSource]} for this item.
            </div>
          )}

          {!current.loading && activeSource === "wikimedia" && current.data.length > 0 && (
            <div className="ghana-live-wiki-grid">
              {(current.data as WikiPage[]).map((page) => (
                <WikiCard key={page.pageid} page={page} />
              ))}
            </div>
          )}

          {!current.loading && activeSource !== "wikimedia" && current.data.length > 0 && (
            <div className="ghana-live-result-list">
              {(current.data as LiveResult[]).map((result) => (
                <LiveResultCard
                  key={result.id}
                  result={result}
                  source={activeSource}
                  onSuggest={(r) => setSuggest({ result: r, source: activeSource })}
                />
              ))}
            </div>
          )}
        </div>

        {current.loaded && !current.error && current.data.length > 0 && (
          <div className="ghana-live-footer">
            Results are live metadata from {SOURCE_LABELS[activeSource]} and are not stored in ARED.
            {activeSource === "wikimedia" && " Images subject to individual Wikimedia licence terms."}
            {activeSource === "smithsonian" && " Smithsonian metadata is CC0."}
          </div>
        )}
      </div>
    </>
  );
}
