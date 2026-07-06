import { NextResponse } from "next/server";
import { clampPageSize, SEARCH_MAX_PAGE_SIZE } from "@/lib/search-pagination";

export const SEARCH_MAX_QUERY_LENGTH = 300;
export const SEARCH_MAX_OFFSET = 5000;

/** Same-origin path only — blocks open redirects. */
export function safeNextPath(value: string | null | undefined, fallback = "/workspace"): string {
  const v = String(value ?? "").trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return fallback;
}

export function normalizeSearchQuery(raw: string | null | undefined): string {
  return String(raw ?? "").trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
}

export function parseSearchQueryParam(
  searchParams: URLSearchParams,
): { ok: true; query: string } | { ok: false; response: NextResponse } {
  const query = normalizeSearchQuery(
    searchParams.get("q") || searchParams.get("query"),
  );
  if (!query) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Missing q parameter" }, { status: 400 }),
    };
  }
  const rawLen = String(searchParams.get("q") || searchParams.get("query") || "").trim().length;
  if (rawLen > SEARCH_MAX_QUERY_LENGTH) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: `Query too long (max ${SEARCH_MAX_QUERY_LENGTH} characters)` },
        { status: 400 },
      ),
    };
  }
  return { ok: true, query };
}

export function parseSearchLimit(
  searchParams: URLSearchParams,
  fallback?: number,
): number {
  const raw =
    searchParams.get("limit") ||
    searchParams.get("perPage") ||
    searchParams.get("rows") ||
    undefined;
  return clampPageSize(Number(raw), fallback);
}

export function parseSearchOffset(searchParams: URLSearchParams): number {
  const raw = Math.max(
    0,
    Number(
      searchParams.get("offset") ||
        searchParams.get("start") ||
        0,
    ),
  );
  return Math.min(Math.floor(raw), SEARCH_MAX_OFFSET);
}

export { clampPageSize, SEARCH_MAX_PAGE_SIZE };
