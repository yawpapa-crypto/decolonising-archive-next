import { clampPageSize, SEARCH_DEFAULT_PAGE_SIZE } from "@/lib/search-pagination";
import {
  expandQueryTerms,
  getAuthorBoostsForQuery,
  normalizeComparable,
} from "@/lib/search/query-expansion";
import { withSemanticScholarRateLimit } from "@/lib/search/semantic-scholar-rate-limit";

export type SemanticScholarPaperResult = {
  id: string;
  source: "semantic-scholar";
  sourceLabel: "Semantic Scholar";
  title: string;
  subtitle?: string;
  description?: string;
  type: "paper";
  url: string;
  year: number | null;
  authors: string[];
  doi?: string;
  citationCount?: number;
  openAccessUrl?: string;
  isOpenAccess?: boolean;
  venue?: string;
  relevanceScore?: number;
  raw?: unknown;
};

export type SemanticScholarSearchParams = {
  query: string;
  limit?: number;
  offset?: number;
};

export type SemanticScholarSearchResponse = {
  source: "semantic-scholar";
  query: string;
  count: number | null;
  displayedCount: number;
  nextOffset: number | null;
  hasMore: boolean;
  results: SemanticScholarPaperResult[];
  error: string | null;
};

type S2Author = { name?: string };
type S2ExternalIds = { DOI?: string; CorpusId?: string | number; PubMed?: string };
type S2OpenAccessPdf = { url?: string };
type S2Paper = {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  authors?: S2Author[];
  url?: string;
  venue?: string;
  publicationVenue?: { name?: string };
  journal?: { name?: string };
  citationCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: S2OpenAccessPdf;
  externalIds?: S2ExternalIds;
};

type S2SearchJson = {
  total?: number;
  offset?: number;
  data?: S2Paper[];
};

const S2_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const S2_FIELDS = [
  "paperId",
  "title",
  "abstract",
  "year",
  "authors",
  "url",
  "venue",
  "publicationVenue",
  "journal",
  "citationCount",
  "isOpenAccess",
  "openAccessPdf",
  "externalIds",
].join(",");

function getSemanticScholarApiKey(): string | null {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim();
  return key || null;
}

function scorePaper(paper: S2Paper, query: string): number {
  const normalized = normalizeComparable(query);
  if (!normalized) return 0;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const { expandedPhrases, expandedTerms } = expandQueryTerms(normalized, tokens);
  const phrases = [normalized, ...expandedPhrases.map((phrase) => normalizeComparable(phrase))].filter(
    Boolean,
  );

  const title = String(paper.title || "").toLowerCase();
  const abstract = String(paper.abstract || "").toLowerCase();
  const authors = Array.isArray(paper.authors)
    ? paper.authors.map((author) => String(author.name || "").toLowerCase()).join(" ")
    : "";
  const fullText = `${title} ${abstract} ${authors}`;

  let score = 0;
  if (title === normalized) score += 48;
  else if (title.includes(normalized)) score += 32;

  if (authors.includes(normalized)) score += 44;

  for (const phrase of phrases) {
    if (!phrase) continue;
    if (title.includes(phrase)) score += 28;
    if (abstract.includes(phrase)) score += 22;
    if (authors.includes(phrase)) score += 20;
  }

  const searchTokens = expandedTerms.length ? expandedTerms : tokens;
  const tokenHits = searchTokens.filter((token) => fullText.includes(token)).length;
  score += tokenHits * 8;

  getAuthorBoostsForQuery(normalized, tokens).forEach((author) => {
    if (authors.includes(author)) score += 36;
  });

  if (abstract.length >= 80) score += 6;
  else if (!abstract.length) score -= 4;

  if (paper.citationCount && paper.citationCount > 20) score += 4;
  if (paper.isOpenAccess) score += 3;
  return score;
}

function normalizePaper(paper: S2Paper, query: string): SemanticScholarPaperResult | null {
  const paperId = String(paper.paperId || "").trim();
  if (!paperId) return null;

  const title = String(paper.title || "Untitled paper").trim();
  const authors = Array.isArray(paper.authors)
    ? paper.authors.map((author) => String(author.name || "").trim()).filter(Boolean)
    : [];
  const abstract = String(paper.abstract || "").trim();
  const venue =
    String(paper.venue || "").trim() ||
    String(paper.publicationVenue?.name || "").trim() ||
    String(paper.journal?.name || "").trim();
  const doi = paper.externalIds?.DOI
    ? String(paper.externalIds.DOI).replace(/^https?:\/\/doi\.org\//i, "").trim()
    : undefined;
  const url =
    paper.url ||
    (doi ? `https://doi.org/${doi}` : `https://www.semanticscholar.org/paper/${paperId}`);
  const openAccessUrl = paper.openAccessPdf?.url || (paper.isOpenAccess ? url : undefined);

  return {
    id: `semantic-scholar:${paperId}`,
    source: "semantic-scholar",
    sourceLabel: "Semantic Scholar",
    title,
    subtitle: venue || undefined,
    description: abstract || undefined,
    type: "paper",
    url,
    year: typeof paper.year === "number" && Number.isFinite(paper.year) ? paper.year : null,
    authors,
    doi,
    citationCount: typeof paper.citationCount === "number" ? paper.citationCount : undefined,
    openAccessUrl,
    isOpenAccess: Boolean(paper.isOpenAccess),
    venue: venue || undefined,
    relevanceScore: scorePaper(paper, query),
    raw: paper,
  };
}

async function fetchSemanticScholarSearch(
  query: string,
  limit: number,
  offset: number,
): Promise<SemanticScholarSearchResponse> {
  const apiKey = getSemanticScholarApiKey();
  if (!apiKey) {
    return {
      source: "semantic-scholar",
      query,
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: "Semantic Scholar API key not configured",
    };
  }

  const url = new URL(S2_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("fields", S2_FIELDS);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (response.status === 429) {
    console.warn("[Semantic Scholar] rate limited (429), retrying once");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const retry = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });
    if (retry.ok) {
      const retryData = (await retry.json()) as S2SearchJson;
      const retryRaw = Array.isArray(retryData.data) ? retryData.data : [];
      const retryResults = retryRaw
        .map((paper) => normalizePaper(paper, query))
        .filter((item): item is SemanticScholarPaperResult => Boolean(item))
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      const retryTotal = typeof retryData.total === "number" ? retryData.total : null;
      const retryHasMore =
        retryTotal != null ? offset + retryResults.length < retryTotal : retryResults.length === limit;
      return {
        source: "semantic-scholar",
        query,
        count: retryTotal,
        displayedCount: retryResults.length,
        nextOffset: retryHasMore ? offset + limit : null,
        hasMore: retryHasMore,
        results: retryResults,
        error: null,
      };
    }
    console.warn("[Semantic Scholar] rate limited after retry");
    return {
      source: "semantic-scholar",
      query,
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: "Semantic Scholar rate limited",
    };
  }

  if (!response.ok) {
    const detail = await response.text();
    console.warn(`[Semantic Scholar] HTTP ${response.status}: ${detail.slice(0, 160)}`);
    return {
      source: "semantic-scholar",
      query,
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: `Semantic Scholar request failed (${response.status})`,
    };
  }

  const data = (await response.json()) as S2SearchJson;
  const raw = Array.isArray(data.data) ? data.data : [];
  const results = raw
    .map((paper) => normalizePaper(paper, query))
    .filter((item): item is SemanticScholarPaperResult => Boolean(item))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  const total = typeof data.total === "number" ? data.total : null;
  const hasMore =
    total != null ? offset + results.length < total : results.length === limit;
  const nextOffset = hasMore ? offset + limit : null;

  return {
    source: "semantic-scholar",
    query,
    count: total,
    displayedCount: results.length,
    nextOffset,
    hasMore,
    results,
    error: null,
  };
}

export async function searchSemanticScholarPapers({
  query: rawQuery,
  limit: rawLimit = 25,
  offset: rawOffset = 0,
}: SemanticScholarSearchParams): Promise<SemanticScholarSearchResponse> {
  const query = String(rawQuery || "").trim();
  const limit = clampPageSize(Number(rawLimit) || 25, SEARCH_DEFAULT_PAGE_SIZE);
  const offset = Math.max(0, Number(rawOffset) || 0);

  if (!query) {
    return {
      source: "semantic-scholar",
      query: "",
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      error: null,
    };
  }

  try {
    return await withSemanticScholarRateLimit(() =>
      fetchSemanticScholarSearch(query, limit, offset),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Semantic Scholar] search failed:", message);
    return {
      source: "semantic-scholar",
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
