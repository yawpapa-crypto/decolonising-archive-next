import { NextRequest, NextResponse } from "next/server";
import { fetchExternalJson } from "@/lib/search/external-http";
import { SEARCH_DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/search-pagination";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { safePublicError } from "@/src/lib/security/sanitize";
import { parseSearchOffset } from "@/src/lib/security/validate";

export const runtime = "nodejs";

const WIKIMEDIA_ENDPOINT = "commons.wikimedia.org/w/api.php";

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

    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrlimit", String(limit));
    if (offset > 0) url.searchParams.set("gsroffset", String(offset));
    url.searchParams.set("prop", "imageinfo|info");
    url.searchParams.set("iiprop", "url|extmetadata");
    url.searchParams.set("inprop", "url");
    url.searchParams.set("format", "json");

    const fetched = await fetchExternalJson<{
      query?: { pages?: Record<string, unknown> };
      continue?: { gsroffset?: number };
    }>(url.toString(), { timeoutMs: 12_000, maxRetries: 1, cacheSeconds: 300 });

    if (!fetched.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[external-search]", "wikimedia", {
          status: fetched.status,
          errorCode: fetched.error?.code,
          message: fetched.error?.message,
          durationMs: fetched.durationMs,
          endpoint: WIKIMEDIA_ENDPOINT,
          retryAttempted: fetched.retryAttempted,
        });
      }
      return NextResponse.json({
        ok: false,
        source: "wikimedia",
        error: {
          code: fetched.error?.code || "upstream_error",
          message: fetched.error?.message || "Wikimedia search failed",
          status: fetched.status || undefined,
        },
        pages: [],
        continue: null,
        durationMs: fetched.durationMs,
        retryAttempted: fetched.retryAttempted,
        endpointLabel: WIKIMEDIA_ENDPOINT,
      });
    }

    const json = fetched.data || {};
    const pages = json.query?.pages ? Object.values(json.query.pages) : [];

    return NextResponse.json({
      ok: true,
      source: "wikimedia",
      pages,
      continue: json.continue ?? null,
      count: pages.length,
      displayedCount: pages.length,
      durationMs: fetched.durationMs,
      retryAttempted: fetched.retryAttempted,
      endpointLabel: WIKIMEDIA_ENDPOINT,
    });
  } catch (error) {
    const message = safePublicError(error, "Wikimedia search temporarily unavailable");
    return NextResponse.json({
      ok: false,
      source: "wikimedia",
      error: { code: "internal_error", message },
      pages: [],
      continue: null,
    });
  }
}
