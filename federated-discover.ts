/**
 * Collection Discover Live — same federation sources as the main library search UI.
 * Uses proxied /api routes (not direct upstream calls from the browser).
 */

export type FederatedSourceId =
  | "archive"
  | "openalex"
  | "core"
  | "crossref"
  | "semantic-scholar"
  | "wikidata"
  | "library-of-congress"
  | "smithsonian"
  | "open-access"
  | "wikimedia"
  | "openlibrary"
  | "met"
  | "aodl";

export type WikiPage = {
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

export type DiscoverResult = {
  id: string;
  title: string;
  creator?: string;
  summary?: string;
  sourceUrl?: string;
  source?: string;
  type?: string;
  period?: string;
  thumbnailUrl?: string;
  hasThumbnail?: boolean;
  html_url?: string;
  externalLinks?: Array<{ label: string; url: string }>;
  /** Present when row came from Wikimedia API pages[] */
  wikimediaPage?: WikiPage;
};

export type SourceStatus = {
  data: DiscoverResult[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  count: number | null;
};

export const FEDERATED_SOURCE_ORDER: FederatedSourceId[] = [
  "archive",
  "openalex",
  "core",
  "crossref",
  "semantic-scholar",
  "wikidata",
  "library-of-congress",
  "smithsonian",
  "open-access",
  "wikimedia",
  "openlibrary",
  "met",
];

export const CATALOGUE_SOURCE_IDS: FederatedSourceId[] = ["wikimedia", "openlibrary", "met"];

export const FEDERATED_SOURCE_META: Record<
  FederatedSourceId,
  { label: string; icon: string; group?: "catalogue" }
> = {
  archive: { label: "Archive", icon: "◎" },
  openalex: { label: "OpenAlex", icon: "📚" },
  core: { label: "CORE", icon: "📖" },
  crossref: { label: "Crossref", icon: "📄" },
  "semantic-scholar": { label: "Semantic Scholar", icon: "🔬" },
  wikidata: { label: "Wikidata", icon: "🔗" },
  "library-of-congress": { label: "Library of Congress", icon: "🏛" },
  smithsonian: { label: "Smithsonian", icon: "🏛" },
  "open-access": { label: "Open access", icon: "🌐" },
  wikimedia: { label: "Wikimedia", icon: "🖼", group: "catalogue" },
  openlibrary: { label: "Open Library", icon: "📕", group: "catalogue" },
  met: { label: "The Met", icon: "🎨", group: "catalogue" },
  aodl: { label: "AODL", icon: "🌍" },
};

export function defaultSourceState(): SourceStatus {
  return { data: [], loading: false, error: null, loaded: false, count: null };
}

export function initialSourceMap(ids: FederatedSourceId[]): Record<FederatedSourceId, SourceStatus> {
  return Object.fromEntries(ids.map((id) => [id, defaultSourceState()])) as Record<
    FederatedSourceId,
    SourceStatus
  >;
}

function normalizeLiveRecord(raw: Record<string, unknown>): DiscoverResult {
  const images = Array.isArray(raw.images) ? raw.images : [];
  const firstImage = images[0] as { src?: string; url?: string } | undefined;
  const thumb =
    raw.thumbnailUrl || raw.imageUrl || firstImage?.src || firstImage?.url || undefined;
  const externalLinks = Array.isArray(raw.externalLinks)
    ? (raw.externalLinks as Array<{ label: string; url: string }>)
    : undefined;

  return {
    id: String(raw.id ?? `live-${Math.random().toString(36).slice(2)}`),
    title: String(raw.title ?? "Untitled"),
    creator: raw.creator ? String(raw.creator) : undefined,
    summary: raw.summary ? String(raw.summary).slice(0, 280) : undefined,
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
    source: raw.source
      ? String(raw.source)
      : raw.institution
        ? String(raw.institution)
        : undefined,
    type: raw.type ? String(raw.type) : undefined,
    period: raw.period ? String(raw.period) : undefined,
    thumbnailUrl: thumb ? String(thumb) : undefined,
    hasThumbnail: Boolean(thumb),
    html_url: raw.html_url ? String(raw.html_url) : undefined,
    externalLinks,
  };
}

function mapWikiPage(page: WikiPage): DiscoverResult {
  const info = page.imageinfo?.[0];
  const name = page.title.replace(/^File:/, "").replace(/_/g, " ").replace(/\.[^.]+$/, "");
  return {
    id: `wiki-${page.pageid}`,
    title: name,
    source: "Wikimedia Commons",
    type: "Media",
    sourceUrl: page.canonicalurl,
    thumbnailUrl: info?.url,
    hasThumbnail: Boolean(info?.url),
    wikimediaPage: page,
  };
}

function mapOpenLibraryDoc(doc: Record<string, unknown>, index: number): DiscoverResult {
  const key = doc.key ? String(doc.key) : "";
  const coverId = typeof doc.cover_i === "number" ? doc.cover_i : null;
  const thumb = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined;
  const authors = Array.isArray(doc.author_name)
    ? doc.author_name.map(String).join(", ")
    : undefined;

  return {
    id: `ol-${key || index}`,
    title: String(doc.title ?? "Untitled"),
    creator: authors,
    summary: Array.isArray(doc.subject)
      ? `Subjects: ${doc.subject.slice(0, 4).map(String).join(", ")}`
      : undefined,
    sourceUrl: key ? `https://openlibrary.org${key}` : undefined,
    source: "Open Library",
    type: "Book",
    period: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    thumbnailUrl: thumb,
    hasThumbnail: Boolean(thumb),
  };
}

function mapMetObject(obj: Record<string, unknown>, index: number): DiscoverResult {
  const thumb = obj.primaryImageSmall || obj.primaryImage;
  return {
    id: `met-${obj.objectID ?? index}`,
    title: String(obj.title ?? "Untitled object"),
    creator: String(obj.artistDisplayName || obj.culture || "The Met"),
    summary: [obj.objectName, obj.medium].filter(Boolean).map(String).join(" · "),
    sourceUrl: obj.objectURL ? String(obj.objectURL) : undefined,
    source: "The Met",
    type: obj.objectName ? String(obj.objectName) : "Museum object",
    period: obj.objectDate ? String(obj.objectDate) : undefined,
    thumbnailUrl: typeof thumb === "string" ? thumb : undefined,
    hasThumbnail: typeof thumb === "string",
  };
}

function filterArchiveRecords(records: unknown[], query: string, limit: number): DiscoverResult[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return [];

  const matched: DiscoverResult[] = [];
  for (const row of records) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const haystack = [
      rec.title,
      rec.creator,
      rec.summary,
      rec.abstract,
      rec.collection,
      rec.institution,
      ...(Array.isArray(rec.tags) ? rec.tags : []),
      ...(Array.isArray(rec.themes) ? rec.themes : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!tokens.every((token) => haystack.includes(token))) continue;
    matched.push({
      ...normalizeLiveRecord(rec),
      source: "ARED Archive",
    });
    if (matched.length >= limit) break;
  }
  return matched;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok && json.ok === false) {
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : typeof (json.error as { message?: string })?.message === "string"
          ? (json.error as { message: string }).message
          : `HTTP ${res.status}`,
    );
  }
  return json;
}

export type FetchSourceOptions = {
  query: string;
  signal: AbortSignal;
  /** Override query for a specific source (e.g. enriched Wikimedia query) */
  queryForSource?: (sourceId: FederatedSourceId, baseQuery: string) => string;
  limit?: number;
};

export async function fetchFederatedSource(
  sourceId: FederatedSourceId,
  options: FetchSourceOptions,
): Promise<{ data: DiscoverResult[]; error: string | null; count: number | null }> {
  const limit = options.limit ?? 8;
  const q = (options.queryForSource?.(sourceId, options.query) ?? options.query).trim();
  if (!q && sourceId !== "archive") {
    return { data: [], error: null, count: 0 };
  }

  try {
    switch (sourceId) {
      case "archive": {
        const json = await fetchJson("/api/records", options.signal);
        const records = Array.isArray(json.records) ? json.records : [];
        const data = filterArchiveRecords(records, options.query, 12);
        return { data, error: null, count: data.length };
      }
      case "openalex": {
        const json = await fetchJson(
          `/api/openalex-search?q=${encodeURIComponent(q)}&limit=${limit}`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: json.error ? String(json.error) : json.ok === false ? "OpenAlex unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "core": {
        const json = await fetchJson(
          `/api/core-search?q=${encodeURIComponent(q)}&limit=${limit}&offset=0`,
          options.signal,
        );
        if (!json.ok) {
          return { data: [], error: String(json.detail || json.error || "CORE unavailable"), count: null };
        }
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "crossref": {
        const json = await fetchJson(
          `/api/search/crossref?q=${encodeURIComponent(q)}&limit=${limit}`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: json.error ? String(json.error) : json.ok === false ? "Crossref unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "semantic-scholar": {
        const json = await fetchJson(
          `/api/search/semantic-scholar?q=${encodeURIComponent(q)}&limit=${limit}`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: json.error ? String(json.error) : json.ok === false ? "Semantic Scholar unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "wikidata": {
        const json = await fetchJson(
          `/api/search/wikidata?q=${encodeURIComponent(q)}&limit=${limit}`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: json.error ? String(json.error) : json.ok === false ? "Wikidata unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "library-of-congress": {
        const json = await fetchJson(
          `/api/search/library-of-congress?q=${encodeURIComponent(q)}&limit=${limit}&offset=0`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: json.error ? String(json.error) : json.ok === false ? "Library of Congress unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "smithsonian": {
        const json = await fetchJson(
          `/api/search/smithsonian?q=${encodeURIComponent(q)}&limit=${limit}&offset=0&media=all`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: json.error ? String(json.error) : json.ok === false ? "Smithsonian unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      case "open-access": {
        const json = await fetchJson(
          `/api/external-open-access?q=${encodeURIComponent(q)}`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.slice(0, 10).map((row) => normalizeLiveRecord(row as Record<string, unknown>)),
          error: null,
          count: rows.length,
        };
      }
      case "wikimedia": {
        const json = await fetchJson(
          `/api/search/wikimedia?q=${encodeURIComponent(q)}&limit=12`,
          options.signal,
        );
        const pages = Array.isArray(json.pages) ? (json.pages as WikiPage[]) : [];
        return {
          data: pages.map(mapWikiPage),
          error:
            json.error && typeof json.error === "object"
              ? String((json.error as { message?: string }).message || "Wikimedia unavailable")
              : json.ok === false
                ? "Wikimedia unavailable"
                : null,
          count: pages.length,
        };
      }
      case "openlibrary": {
        const json = await fetchJson(
          `/api/search/openlibrary?q=${encodeURIComponent(q)}&limit=${limit}`,
          options.signal,
        );
        const docs = Array.isArray(json.docs) ? json.docs : [];
        return {
          data: docs.map((doc, index) => mapOpenLibraryDoc(doc as Record<string, unknown>, index)),
          error:
            json.error && typeof json.error === "object"
              ? String((json.error as { message?: string }).message || "Open Library unavailable")
              : json.ok === false
                ? "Open Library unavailable"
                : null,
          count: typeof json.numFound === "number" ? json.numFound : docs.length,
        };
      }
      case "met": {
        const json = await fetchJson(
          `/api/search/met?q=${encodeURIComponent(q)}&limit=6`,
          options.signal,
        );
        const objects = Array.isArray(json.objects) ? json.objects : [];
        return {
          data: objects.map((obj, index) => mapMetObject(obj as Record<string, unknown>, index)),
          error:
            json.error && typeof json.error === "object"
              ? String((json.error as { message?: string }).message || "The Met unavailable")
              : json.ok === false
                ? "The Met unavailable"
                : null,
          count: typeof json.count === "number" ? json.count : objects.length,
        };
      }
      case "aodl": {
        const json = await fetchJson(
          `/api/search/aodl?q=${encodeURIComponent(q)}&limit=12`,
          options.signal,
        );
        const rows = Array.isArray(json.results) ? json.results : [];
        return {
          data: rows.map((row) => ({
            ...normalizeLiveRecord(row as Record<string, unknown>),
            source: "AODL",
          })),
          error: json.error ? String(json.error) : json.ok === false ? "AODL unavailable" : null,
          count: typeof json.count === "number" ? json.count : rows.length,
        };
      }
      default:
        return { data: [], error: null, count: 0 };
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return { data: [], error: "Source unavailable", count: null };
  }
}

/** Status line matching main library: Archive active · OpenAlex active · … */
export function buildDiscoveryStatusLine(
  sources: Partial<Record<FederatedSourceId, SourceStatus>>,
  activeIds: FederatedSourceId[],
): string {
  const parts: string[] = [];
  const archive = sources.archive;

  if (archive?.loading) parts.push("Archive loading");
  else if (archive?.error) parts.push("Archive unavailable");
  else parts.push("Archive active");

  for (const id of activeIds) {
    if (id === "archive" || CATALOGUE_SOURCE_IDS.includes(id)) continue;
    const label = FEDERATED_SOURCE_META[id].label;
    const s = sources[id];
    if (!s) continue;
    if (s.loading) parts.push(`${label} loading`);
    else if (s.error) parts.push(`${label} unavailable`);
    else if (s.data.length > 0) parts.push(`${label} active`);
    else parts.push(`${label} empty`);
  }

  const catalogueTotal = CATALOGUE_SOURCE_IDS.reduce(
    (sum, id) => sum + (sources[id]?.data.length ?? 0),
    0,
  );
  if (catalogueTotal > 0) {
    parts.push("Catalogues active");
    const subcounts = CATALOGUE_SOURCE_IDS.map((id) => {
      const n = sources[id]?.data.length ?? 0;
      if (!n) return null;
      return `${FEDERATED_SOURCE_META[id].label} ${n}`;
    }).filter(Boolean);
    if (subcounts.length) parts.push(subcounts.join(", "));
  }

  return parts.join(" · ");
}

export function buildGhanaWikimediaQuery(q: string): string {
  const base = q.trim();
  if (base === "ghana graphic design") {
    return "Ghana design art poster visual culture graphic";
  }
  const hasGhana = /ghana/i.test(base);
  const hasDesign = /design|poster|art|visual|graphic|print|type/i.test(base);
  if (!hasGhana) return `Ghana ${base}`;
  if (!hasDesign) return `${base} design visual`;
  return base;
}

export function ghanaQueryForSource(sourceId: FederatedSourceId, baseQuery: string): string {
  if (sourceId === "wikimedia") return buildGhanaWikimediaQuery(baseQuery);
  if (
    sourceId === "crossref" ||
    sourceId === "semantic-scholar" ||
    sourceId === "openalex"
  ) {
    return baseQuery.includes("design") ? baseQuery : `ghana graphic design ${baseQuery}`;
  }
  return baseQuery;
}
