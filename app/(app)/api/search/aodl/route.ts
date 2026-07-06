import { NextResponse } from "next/server";
import { searchAodlCollections } from "@/lib/search/aodl";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { parseSearchLimit } from "@/src/lib/security/validate";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

/** Curated AODL collection search — metadata and external links only. */
export async function GET(request: Request) {
  const guarded = await guardPublicSearch(request);
  if (!guarded.ok) return guarded.response;

  const url = new URL(request.url);
  const q = guarded.query;
  const limit = parseSearchLimit(url.searchParams, 12);

  try {
    const { results, clientResults } = searchAodlCollections(q, { limit });

    return NextResponse.json({
      ok: true,
      query: q,
      count: results.length,
      results: clientResults,
      unifiedResults: results,
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      query: q,
      count: 0,
      results: [],
      unifiedResults: [],
      error: safePublicError(e, "AODL search failed"),
    });
  }
}
