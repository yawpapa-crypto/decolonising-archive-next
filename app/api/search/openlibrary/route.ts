import { NextRequest, NextResponse } from "next/server";
import { fetchExternalJson } from "@/lib/search/external-http";
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

    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const fetched = await fetchExternalJson<{ docs?: unknown[]; numFound?: number }>(
      url.toString(),
      { timeoutMs: 10_000, maxRetries: 1, cacheSeconds: 300 },
    );

    if (!fetched.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[external-search]", "openlibrary", {
          status: fetched.status,
          errorCode: fetched.error?.code,
          message: fetched.error?.message,
          durationMs: fetched.durationMs,
          endpoint: "openlibrary.org/search.json",
          retryAttempted: fetched.retryAttempted,
        });
      }
      return NextResponse.json({
        ok: false,
        source: "openlibrary",
        error: {
          code: fetched.error?.code || "upstream_error",
          message: fetched.error?.message || "Open Library search failed",
          status: fetched.status || undefined,
        },
        docs: [],
        numFound: 0,
        durationMs: fetched.durationMs,
        retryAttempted: fetched.retryAttempted,
        endpointLabel: "openlibrary.org/search.json",
      });
    }

    const json = fetched.data || {};
    const docs = Array.isArray(json.docs) ? json.docs : [];
    const numFound = Number(json.numFound || 0);

    return NextResponse.json({
      ok: true,
      source: "openlibrary",
      docs,
      numFound,
      count: numFound,
      displayedCount: docs.length,
      durationMs: fetched.durationMs,
      retryAttempted: fetched.retryAttempted,
      endpointLabel: "openlibrary.org/search.json",
    });
  } catch (error) {
    const message = safePublicError(error, "Open Library search temporarily unavailable");
    return NextResponse.json({
      ok: false,
      source: "openlibrary",
      error: { code: "internal_error", message },
      docs: [],
      numFound: 0,
    });
  }
}
