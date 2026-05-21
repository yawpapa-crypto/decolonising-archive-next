import { NextRequest, NextResponse } from "next/server";
import { libraryOfCongressRecordToLibraryLive } from "@/lib/loc-library-live";
import {
  searchLibraryOfCongressRecords,
  type LibraryOfCongressFormat,
} from "@/lib/search/library-of-congress";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { parseSearchLimit, parseSearchOffset } from "@/src/lib/security/validate";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

const FORMAT_VALUES = new Set<LibraryOfCongressFormat>([
  "all",
  "audio",
  "video",
  "photo",
  "manuscript",
  "map",
  "film",
]);

function parseFormat(value: string | null): LibraryOfCongressFormat {
  const format = String(value || "all").trim().toLowerCase() as LibraryOfCongressFormat;
  return FORMAT_VALUES.has(format) ? format : "all";
}

function parseDecolonialMode(searchParams: URLSearchParams): boolean {
  const raw = searchParams.get("decolonialMode") ?? searchParams.get("decolonial");
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Library of Congress live media & archive search (JSON API). */
export async function GET(request: NextRequest) {
  const guarded = await guardPublicSearch(request);
  if (!guarded.ok) return guarded.response;

  const { searchParams } = new URL(request.url);
  const q = guarded.query;
  const limit = parseSearchLimit(searchParams, 25);
  const offset = parseSearchOffset(searchParams);
  const format = parseFormat(searchParams.get("format"));
  const decolonialMode = parseDecolonialMode(searchParams);

  try {
    const batch = await searchLibraryOfCongressRecords({
      query: q,
      limit,
      offset,
      format,
      decolonialMode,
    });

    const results = batch.results.map((record, index) =>
      libraryOfCongressRecordToLibraryLive(record, index),
    );

    return NextResponse.json({
      ok: !batch.error,
      source: batch.source,
      query: batch.query,
      count: batch.count,
      displayedCount: batch.displayedCount,
      nextOffset: batch.nextOffset,
      hasMore: batch.hasMore,
      decolonialMode: batch.decolonialMode,
      format: batch.format,
      results,
      error: batch.error,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      source: "library-of-congress",
      query: q,
      count: 0,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      decolonialMode,
      format,
      results: [],
      error: safePublicError(error, "Library of Congress search failed"),
    });
  }
}
