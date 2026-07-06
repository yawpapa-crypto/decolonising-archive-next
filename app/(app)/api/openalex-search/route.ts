import { NextRequest, NextResponse } from "next/server";
import { scholarlyResultToLibraryLive } from "@/lib/openalex-library-live";
import { SEARCH_DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/search-pagination";
import { searchOpenAlexWorksPage } from "@/lib/scholarly-search";
import { getCachedSearch, searchCacheKey, setCachedSearch } from "@/lib/search-cache";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { safePublicError } from "@/src/lib/security/sanitize";

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
    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam && cursorParam.trim() ? cursorParam.trim() : "*";

    const cacheKey = searchCacheKey("openalex", query, { limit, cursor });
    const cached = getCachedSearch<{
      ok: boolean;
      source: string;
      query: string;
      count: number | null;
      displayedCount: number;
      nextCursor: string | null;
      nextOffset: null;
      results: unknown[];
      error: null;
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const batch = await searchOpenAlexWorksPage(query, limit, cursor);
    const results = batch.results.map((item, index) => scholarlyResultToLibraryLive(item, index));

    const payload = {
      ok: true,
      source: "openalex",
      query,
      count: batch.totalCount,
      displayedCount: results.length,
      nextCursor: batch.nextCursor,
      nextOffset: null,
      results,
      error: null,
    };
    setCachedSearch(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = safePublicError(error, "Search temporarily unavailable");
    return NextResponse.json(
      {
        ok: false,
        source: "openalex",
        query: "",
        count: null,
        displayedCount: 0,
        nextCursor: null,
        nextOffset: null,
        results: [],
        error: message,
      },
      { status: 503 },
    );
  }
}
