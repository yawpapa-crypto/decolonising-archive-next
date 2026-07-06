import { NextResponse } from "next/server";
import {
  defaultExternalOpenAccessNotices,
  mapExternalArchiveRecordToClientPayload,
  searchExternalSources,
} from "@/src/lib/external-sources/external-search";
import { enforceSearchRateLimit } from "@/src/lib/security/rate-limit";
import { normalizeSearchQuery, SEARCH_MAX_QUERY_LENGTH } from "@/src/lib/security/validate";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

/**
 * Aggregated open-access discovery: optional Supabase cache, DOAB live metadata,
 * and registry handoffs. Returns 200 with empty results on failure so clients
 * never hard-fail archive search.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQ = url.searchParams.get("q") || "";
  if (rawQ.trim().length > SEARCH_MAX_QUERY_LENGTH) {
    return NextResponse.json({ ok: false, error: "Query too long" }, { status: 400 });
  }
  const q = normalizeSearchQuery(rawQ);

  const rate = enforceSearchRateLimit(request);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } },
    );
  }

  try {
    const { externalRecords, handoffRecords, sourceStatuses } = await searchExternalSources(q);
    const results = [
      ...externalRecords.map(mapExternalArchiveRecordToClientPayload),
      ...handoffRecords.map(mapExternalArchiveRecordToClientPayload),
    ];

    return NextResponse.json({
      ok: true,
      results,
      sourceStatuses,
      notices: defaultExternalOpenAccessNotices(),
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      results: [],
      sourceStatuses: [
        {
          id: "open-access-aggregator",
          label: "Open access & OER aggregator",
          state: "fail" as const,
          message: safePublicError(e, "Aggregator error"),
        },
      ],
      notices: defaultExternalOpenAccessNotices(),
    });
  }
}
