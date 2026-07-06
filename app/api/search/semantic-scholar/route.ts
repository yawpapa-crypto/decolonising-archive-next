import { NextRequest, NextResponse } from "next/server";
import { semanticScholarPaperToLibraryLive } from "@/lib/semantic-scholar-library-live";
import { searchSemanticScholarPapers } from "@/lib/search/semantic-scholar";
import { SEARCH_DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/search-pagination";
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

    const batch = await searchSemanticScholarPapers({ query, limit, offset });
    const results = batch.results.map((paper, index) =>
      semanticScholarPaperToLibraryLive(paper, index),
    );

    return NextResponse.json({
      ok: !batch.error,
      source: batch.source,
      query: batch.query,
      count: batch.count,
      displayedCount: batch.displayedCount,
      nextOffset: batch.nextOffset,
      hasMore: batch.hasMore,
      results,
      error: batch.error,
    });
  } catch (error) {
    const message = safePublicError(error, "Search temporarily unavailable");
    console.warn("[Semantic Scholar API]", message);
    return NextResponse.json(
      {
        ok: false,
        source: "semantic-scholar",
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
