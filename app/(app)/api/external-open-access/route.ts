import { NextResponse } from "next/server";
import {
  defaultExternalOpenAccessNotices,
  mapExternalArchiveRecordToClientPayload,
  searchExternalSources,
} from "@/src/lib/external-sources/external-search";

export const runtime = "nodejs";

/**
 * Aggregated open-access discovery: optional Supabase cache, DOAB live metadata,
 * and registry handoffs. Returns 200 with empty results on failure so clients
 * never hard-fail archive search.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

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
          message: e instanceof Error ? e.message : "Aggregator error",
        },
      ],
      notices: defaultExternalOpenAccessNotices(),
    });
  }
}
