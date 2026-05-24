import { NextRequest, NextResponse } from "next/server";
import { crossrefWorkToLibraryLive } from "@/lib/crossref-library-live";
import { searchCrossrefWorks } from "@/lib/search/crossref";
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

    const cacheKey = searchCacheKey("crossref", query, { limit, offset });
    const cached = getCachedSearch<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const batch = await searchCrossrefWorks({ query, limit, offset });
    const results = batch.results.map((work, index) =>
      crossrefWorkToLibraryLive(work, query, index),
    );

    if (batch.error && process.env.NODE_ENV === "development") {
      console.warn("[external-search]", "crossref", {
        errorCode: "upstream_error",
        message: batch.error,
        endpoint: "api.crossref.org/works",
      });
    }

    const payload = {
      ok: !batch.error,
      source: batch.source,
      query: batch.query,
      count: batch.count ?? 0,
      displayedCount: batch.displayedCount,
      nextOffset: batch.nextOffset,
      hasMore: batch.hasMore,
      results,
      error: batch.error ? { code: "upstream_error", message: batch.error } : undefined,
      endpointLabel: "api.crossref.org/works",
    };
    if (!batch.error) setCachedSearch(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = safePublicError(error, "Search temporarily unavailable");
    console.warn("[Crossref API]", message);
    return NextResponse.json(
      {
        ok: false,
        source: "crossref",
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
