import { fetchExternalJson } from "@/lib/search/external-http";
import { clampPageSize, SEARCH_DEFAULT_PAGE_SIZE } from "@/lib/search-pagination";

const CROSSREF_MAILTO = process.env.CROSSREF_MAILTO?.trim() || "archive@ared.design";
const CROSSREF_SELECT =
  "DOI,title,author,issued,abstract,URL,container-title,type,subject,publisher,license,link";

export type CrossrefWork = {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  issued?: { "date-parts"?: Array<Array<number | null>> };
  abstract?: string;
  URL?: string;
  "container-title"?: string[];
  type?: string;
  subject?: string[];
  publisher?: string;
  license?: Array<{ URL?: string; url?: string }>;
  link?: Array<{ URL?: string; "content-type"?: string }>;
};

export type CrossrefSearchResponse = {
  source: "crossref";
  query: string;
  count: number | null;
  displayedCount: number;
  nextOffset: number | null;
  hasMore: boolean;
  results: CrossrefWork[];
  error: string | null;
};

function stripJats(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function searchCrossrefWorks(params: {
  query: string;
  limit?: number;
  offset?: number;
}): Promise<CrossrefSearchResponse> {
  const query = String(params.query || "").trim();
  const limit = clampPageSize(Number(params.limit || SEARCH_DEFAULT_PAGE_SIZE));
  const offset = Math.max(0, Number(params.offset || 0));

  if (!query) {
    return {
      source: "crossref",
      query: "",
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: null,
    };
  }

  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("rows", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("select", CROSSREF_SELECT);
  url.searchParams.set("mailto", CROSSREF_MAILTO);

  const fetched = await fetchExternalJson<{
    message?: { items?: CrossrefWork[]; "total-results"?: number };
  }>(url.toString(), { timeoutMs: 12_000, maxRetries: 1, cacheSeconds: 300 });

  if (!fetched.ok || !fetched.data) {
    return {
      source: "crossref",
      query,
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: fetched.error?.message || "Crossref search failed",
    };
  }

  const json = fetched.data;
  const rawItems = Array.isArray(json.message?.items) ? json.message.items : [];
  const total = Number(json.message?.["total-results"] || 0);
  const results = rawItems.map((item) => ({
    ...item,
    abstract: item.abstract ? stripJats(item.abstract) : "",
  }));
  const nextOffset = total > offset + results.length ? offset + results.length : null;

  return {
    source: "crossref",
    query,
    count: Number.isFinite(total) ? total : 0,
    displayedCount: results.length,
    nextOffset,
    hasMore: nextOffset != null,
    results,
    error: null,
  };
}
