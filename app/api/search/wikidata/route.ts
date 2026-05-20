import { NextRequest, NextResponse } from "next/server";
import { searchWikidataEntities } from "@/lib/search/wikidata";
import { wikidataEntityToLibraryLive } from "@/lib/wikidata-library-live";
import { SEARCH_DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/search-pagination";
import { getCachedSearch, searchCacheKey, setCachedSearch } from "@/lib/search-cache";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { safePublicError } from "@/src/lib/security/sanitize";
import { parseSearchOffset } from "@/src/lib/security/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const guarded = await guardPublicSearch(request);
    if (!guarded.ok) return guarded.response;

    const { searchParams } = new URL(request.url);
    const query = guarded.query;
    const limit = clampPageSize(
      Number(searchParams.get("limit") || searchParams.get("perPage") || SEARCH_DEFAULT_PAGE_SIZE),
    );
    const offset = parseSearchOffset(searchParams);
    const language = String(searchParams.get("language") || "en").trim() || "en";

    const cacheKey = searchCacheKey("wikidata", query, { limit, offset, language });
    const cached = getCachedSearch<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const batch = await searchWikidataEntities({ query, limit, offset, language });
    const results = batch.results.map((entity, index) => wikidataEntityToLibraryLive(entity, index));

    const payload = {
      ok: !batch.error,
      source: batch.source,
      query: batch.query,
      count: batch.count,
      displayedCount: batch.displayedCount,
      nextOffset: batch.nextOffset,
      hasMore: batch.hasMore,
      results,
      error: batch.error,
    };
    setCachedSearch(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = safePublicError(error, "Search temporarily unavailable");
    console.warn("[Wikidata API]", message);
    return NextResponse.json(
      {
        ok: false,
        source: "wikidata",
        query: "",
        count: null,
        displayedCount: 0,
        nextOffset: null,
        hasMore: false,
        results: [],
        error: message,
      },
      { status: 503 },
    );
  }
}
