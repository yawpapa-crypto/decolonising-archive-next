import { NextResponse } from "next/server";
import type { ExternalArchiveCollection } from "@/lib/data/aodl-collections";
import type { SmithsonianOpenCollection } from "@/lib/data/smithsonian-collections";
import { searchAodlCollections } from "@/lib/search/aodl";
import { searchSmithsonianCollections } from "@/lib/search/smithsonian";
import { enforceSearchRateLimit } from "@/src/lib/security/rate-limit";
import { normalizeSearchQuery, parseSearchLimit } from "@/src/lib/security/validate";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

/** Browse catalogue for African & Global Archives — same data path as the live library SPA. */
export async function GET(request: Request) {
  const rate = enforceSearchRateLimit(request);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } },
    );
  }

  const url = new URL(request.url);
  const q = normalizeSearchQuery(url.searchParams.get("q") ?? url.searchParams.get("query") ?? "");
  const limit = parseSearchLimit(url.searchParams, 120);

  try {
    const aodl = searchAodlCollections(q, { limit });
    const smithsonian = searchSmithsonianCollections(q, { limit });

    const aodlItems = aodl.results
      .map((r) => r.raw as ExternalArchiveCollection)
      .filter((c) => c && typeof c.id === "string");
    const smithsonianItems = smithsonian.results
      .map((r) => r.raw as SmithsonianOpenCollection)
      .filter((c) => c && typeof c.id === "string");

    return NextResponse.json({
      ok: true,
      query: q,
      source: "api",
      counts: {
        aodl: aodlItems.length,
        smithsonian: smithsonianItems.length,
        total: aodlItems.length + smithsonianItems.length,
      },
      aodl: aodlItems,
      smithsonian: smithsonianItems,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      query: q,
      error: safePublicError(e, "Archive catalogue unavailable"),
      aodl: [],
      smithsonian: [],
      counts: { aodl: 0, smithsonian: 0, total: 0 },
    });
  }
}
