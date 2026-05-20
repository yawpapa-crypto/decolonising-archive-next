import { NextResponse } from "next/server";
import { searchAodlCollections } from "@/lib/search/aodl";

export const runtime = "nodejs";

/** Curated AODL collection search — metadata and external links only. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const limit = Number(url.searchParams.get("limit") || 12);

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
      error: e instanceof Error ? e.message : "AODL search failed",
    });
  }
}
