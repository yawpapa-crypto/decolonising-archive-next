import { clampPageSize, SEARCH_DEFAULT_PAGE_SIZE } from "@/lib/search-pagination";

export type WikidataEntityResult = {
  id: string;
  source: "wikidata";
  sourceLabel: "Wikidata";
  title: string;
  subtitle?: string;
  description?: string;
  type: "entity";
  url: string;
  year: null;
  authors: [];
  relevanceScore?: number;
  raw?: unknown;
};

export type WikidataSearchParams = {
  query: string;
  limit?: number;
  offset?: number;
  language?: string;
};

export type WikidataSearchResponse = {
  source: "wikidata";
  query: string;
  count: number | null;
  displayedCount: number;
  nextOffset: number | null;
  hasMore: boolean;
  results: WikidataEntityResult[];
  error: string | null;
};

type WbSearchEntity = {
  id?: string;
  title?: string;
  label?: string;
  description?: string;
  url?: string;
  match?: { type?: string; language?: string; text?: string };
};

type WbSearchEntitiesJson = {
  search?: WbSearchEntity[];
  "search-continue"?: number;
  error?: { code?: string; info?: string };
};

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const MAX_WIKIDATA_LIMIT = 50;

function getWikidataUserAgent(): string {
  const configured = process.env.WIKIDATA_USER_AGENT?.trim();
  if (configured) return configured;
  return "DecolonisingArchive/1.0 (mailto:papayawofosu@gmail.com)";
}

function scoreWikidataEntity(entity: WbSearchEntity, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = String(entity.label || entity.title || "").toLowerCase();
  const description = String(entity.description || "").toLowerCase();
  let score = 0;
  if (label === q) score += 48;
  else if (label.includes(q)) score += 32;
  const tokens = q.split(/\s+/).filter(Boolean);
  const tokenHits = tokens.filter((token) => label.includes(token) || description.includes(token)).length;
  score += tokenHits * 8;
  if (entity.match?.text && foldComparable(entity.match.text) === foldComparable(q)) score += 12;
  return score;
}

function foldComparable(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEntity(entity: WbSearchEntity, query: string): WikidataEntityResult | null {
  const qid = String(entity.id || entity.title || "").trim();
  if (!/^Q\d+$/i.test(qid)) return null;
  const label = String(entity.label || entity.title || qid).trim();
  const description = String(entity.description || "").trim();
  const url = entity.url || `https://www.wikidata.org/wiki/${qid}`;
  const id = `wikidata:${qid.toUpperCase()}`;

  return {
    id,
    source: "wikidata",
    sourceLabel: "Wikidata",
    title: label,
    subtitle: description || undefined,
    description: description || undefined,
    type: "entity",
    url,
    year: null,
    authors: [],
    relevanceScore: scoreWikidataEntity(entity, query),
    raw: entity,
  };
}

export async function searchWikidataEntities({
  query: rawQuery,
  limit: rawLimit = 25,
  offset: rawOffset = 0,
  language: rawLanguage = "en",
}: WikidataSearchParams): Promise<WikidataSearchResponse> {
  const query = String(rawQuery || "").trim();
  const language = String(rawLanguage || "en").trim() || "en";
  const limit = clampPageSize(Number(rawLimit) || 25, SEARCH_DEFAULT_PAGE_SIZE);
  const offset = Math.max(0, Number(rawOffset) || 0);

  if (!query) {
    return {
      source: "wikidata",
      query: "",
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: null,
    };
  }

  const url = new URL(WIKIDATA_API);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", query);
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(limit, MAX_WIKIDATA_LIMIT)));
  if (offset > 0) url.searchParams.set("continue", String(offset));

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": getWikidataUserAgent(),
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      console.warn("[Wikidata] rate limited (429)");
      return {
        source: "wikidata",
        query,
        count: null,
        displayedCount: 0,
        nextOffset: null,
        hasMore: false,
        results: [],
        error: "Wikidata rate limited",
      };
    }

    if (!response.ok) {
      console.warn(`[Wikidata] HTTP ${response.status}`);
      return {
        source: "wikidata",
        query,
        count: null,
        displayedCount: 0,
        nextOffset: null,
        hasMore: false,
        results: [],
        error: `Wikidata request failed (${response.status})`,
      };
    }

    const data = (await response.json()) as WbSearchEntitiesJson;
    if (data.error?.info) {
      console.warn("[Wikidata] API error:", data.error.info);
      return {
        source: "wikidata",
        query,
        count: null,
        displayedCount: 0,
        nextOffset: null,
        hasMore: false,
        results: [],
        error: data.error.info,
      };
    }

    const raw = Array.isArray(data.search) ? data.search : [];
    const results = raw
      .map((entity) => normalizeEntity(entity, query))
      .filter((item): item is WikidataEntityResult => Boolean(item))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    const hasMore = results.length === limit;
    const nextOffset = hasMore ? offset + limit : null;

    return {
      source: "wikidata",
      query,
      count: null,
      displayedCount: results.length,
      nextOffset,
      hasMore,
      results,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Wikidata] search failed:", message);
    return {
      source: "wikidata",
      query,
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: message,
    };
  }
}
