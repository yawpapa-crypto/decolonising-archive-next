import { NextRequest, NextResponse } from "next/server";
import { smithsonianRecordToLibraryLive } from "@/lib/smithsonian-library-live";
import {
  searchSmithsonianCollections,
  searchSmithsonianRecords,
  type SmithsonianCategory,
  type SmithsonianMediaFilter,
  type SmithsonianRowGroup,
  type SmithsonianSearchType,
  type SmithsonianSort,
} from "@/lib/search/smithsonian";
import { getCachedSearch, searchCacheKey, setCachedSearch } from "@/lib/search-cache";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { parseSearchLimit, parseSearchOffset } from "@/src/lib/security/validate";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

const SORT_VALUES = new Set<SmithsonianSort>(["relevancy", "newest", "updated", "random"]);
const TYPE_VALUES = new Set<SmithsonianSearchType>([
  "edanmdm",
  "ead_collection",
  "ead_component",
  "all",
]);
const ROW_GROUP_VALUES = new Set<SmithsonianRowGroup>(["objects", "archives"]);
const CATEGORY_VALUES = new Set<SmithsonianCategory>([
  "art_design",
  "history_culture",
  "science_technology",
]);
const MEDIA_VALUES = new Set<SmithsonianMediaFilter>([
  "image",
  "audio",
  "video",
  "object",
  "article",
  "all",
]);

function parseSort(value: string | null): SmithsonianSort {
  const sort = String(value || "relevancy").trim() as SmithsonianSort;
  return SORT_VALUES.has(sort) ? sort : "relevancy";
}

function parseType(value: string | null): SmithsonianSearchType {
  const type = String(value || "all").trim() as SmithsonianSearchType;
  return TYPE_VALUES.has(type) ? type : "all";
}

function parseRowGroup(value: string | null): SmithsonianRowGroup {
  const rowGroup = String(value || "objects").trim() as SmithsonianRowGroup;
  return ROW_GROUP_VALUES.has(rowGroup) ? rowGroup : "objects";
}

function parseCategory(value: string | null): SmithsonianCategory | null {
  const category = String(value || "").trim() as SmithsonianCategory;
  return CATEGORY_VALUES.has(category) ? category : null;
}

function parseMedia(value: string | null): SmithsonianMediaFilter {
  const media = String(value || "all").trim() as SmithsonianMediaFilter;
  return MEDIA_VALUES.has(media) ? media : "all";
}

/** Smithsonian Open Access — live EDAN items (default) or curated unit gateways (`mode=collections`). */
export async function GET(request: NextRequest) {
  const guarded = await guardPublicSearch(request);
  if (!guarded.ok) return guarded.response;

  const { searchParams } = new URL(request.url);
  const q = guarded.query;
  const mode = String(searchParams.get("mode") || "items").toLowerCase();

  if (mode === "collections") {
    try {
      const limit = parseSearchLimit(searchParams, 8);
      const { results, clientResults } = searchSmithsonianCollections(q, { limit });
      return NextResponse.json({
        ok: true,
        mode: "collections",
        query: q,
        count: results.length,
        displayedCount: clientResults.length,
        results: clientResults,
        unifiedResults: results,
        notices: {
          licence:
            "Smithsonian Open Access metadata is CC0 1.0. Confirm cultural, person, and image sensitivity at source.",
        },
      });
    } catch (error) {
      const message = safePublicError(error, "Smithsonian collection search failed");
      return NextResponse.json({
        ok: true,
        mode: "collections",
        query: q,
        count: 0,
        displayedCount: 0,
        results: [],
        unifiedResults: [],
        error: message,
      });
    }
  }

  const rows = parseSearchLimit(searchParams, 25);
  const start = parseSearchOffset(searchParams);
  const sort = parseSort(searchParams.get("sort"));
  const type = parseType(searchParams.get("type"));
  const rowGroup = parseRowGroup(searchParams.get("rowGroup") || searchParams.get("row_group"));
  const category = parseCategory(searchParams.get("category"));
  const media = parseMedia(searchParams.get("media"));

  const cacheKey = searchCacheKey("smithsonian", q, {
    rows,
    start,
    sort,
    type,
    rowGroup,
    category: category || "",
    media,
    rank: "v6",
  });
  const cached = getCachedSearch<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const batch = await searchSmithsonianRecords({
      query: q,
      rows,
      start,
      sort,
      type,
      rowGroup,
      category,
      media,
    });

    const results = batch.results.map((item, index) =>
      smithsonianRecordToLibraryLive(item, index),
    );

    const payload = {
      ok: !batch.error || results.length > 0,
      source: batch.source,
      query: batch.query,
      results,
      count: batch.count,
      displayedCount: batch.displayedCount,
      nextStart: batch.nextStart,
      nextOffset: batch.nextStart,
      hasMore: batch.hasMore,
      error: batch.error,
    };

    if (!batch.error) {
      setCachedSearch(cacheKey, payload);
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message = safePublicError(error, "Smithsonian search failed");
    return NextResponse.json({
      ok: false,
      source: "smithsonian",
      query: q,
      results: [],
      count: null,
      displayedCount: 0,
      nextStart: null,
      nextOffset: null,
      hasMore: false,
      error: message,
    });
  }
}
