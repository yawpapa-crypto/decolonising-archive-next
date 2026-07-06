import { NextRequest, NextResponse } from "next/server";
import { searchLocSruCatalog } from "@/lib/search/loc-sru";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { parseSearchLimit, parseSearchOffset } from "@/src/lib/security/validate";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

/** LoC SRU bibliographic search — LCDB online catalog (HLAS explain exists; search currently unavailable). */
export async function GET(request: NextRequest) {
  const guarded = await guardPublicSearch(request);
  if (!guarded.ok) return guarded.response;

  const { searchParams } = new URL(request.url);
  const q = guarded.query;
  const limit = parseSearchLimit(searchParams, 12);
  const offset = parseSearchOffset(searchParams);

  try {
    const batch = await searchLocSruCatalog({ query: q, limit, offset });

    return NextResponse.json({
      ok: true,
      source: batch.source,
      database: batch.database,
      query: batch.query,
      count: batch.count,
      displayedCount: batch.displayedCount,
      nextOffset: batch.nextOffset,
      hasMore: batch.hasMore,
      results: batch.results,
      hlasStatus: batch.hlasStatus,
      error: batch.error,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      source: "loc-sru",
      database: "lcdb",
      query: q,
      count: 0,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      hlasStatus: null,
      error: safePublicError(error, "LoC SRU search failed"),
    });
  }
}
