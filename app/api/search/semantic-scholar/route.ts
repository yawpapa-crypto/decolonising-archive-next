import { NextRequest, NextResponse } from "next/server";
import { semanticScholarPaperToLibraryLive } from "@/lib/semantic-scholar-library-live";
import { searchSemanticScholarPapers } from "@/lib/search/semantic-scholar";
import { SEARCH_DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/search-pagination";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get("q") || searchParams.get("query") || "").trim();
    const limit = clampPageSize(
      Number(searchParams.get("limit") || searchParams.get("perPage") || SEARCH_DEFAULT_PAGE_SIZE),
    );
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    if (!query) {
      return NextResponse.json({ ok: false, error: "Missing q parameter" }, { status: 400 });
    }

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
    const message = error instanceof Error ? error.message : String(error);
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
