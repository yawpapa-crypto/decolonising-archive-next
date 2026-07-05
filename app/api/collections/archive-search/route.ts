import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { normalizeArchiveRecord } from "@/lib/archive-metadata";
import { filterCatalogueRecords, catalogueDataExists } from "@/lib/catalogue/store";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

const SCAN_CAP = 120;

function recordMatchesQuery(record: Record<string, unknown>, tokens: string[]): boolean {
  const haystack = [
    record.title,
    record.creator,
    record.summary,
    record.abstract,
    record.collection,
    record.institution,
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...(Array.isArray(record.themes) ? record.themes : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function toDiscoverRow(record: Record<string, unknown>) {
  const images = Array.isArray(record.images) ? record.images : [];
  const firstImage = images[0] as { src?: string; url?: string } | undefined;
  const thumb = record.thumbnailUrl || record.imageUrl || firstImage?.src || firstImage?.url;
  return {
    id: String(record.id ?? ""),
    title: String(record.title ?? "Untitled"),
    creator: record.creator ? String(record.creator) : undefined,
    summary: record.summary ? String(record.summary).slice(0, 280) : undefined,
    sourceUrl: record.sourceUrl ? String(record.sourceUrl) : undefined,
    source: "ARED Archive",
    type: record.type ? String(record.type) : undefined,
    thumbnailUrl: thumb ? String(thumb) : undefined,
    hasThumbnail: Boolean(thumb),
  };
}

/** Lightweight archive search for collection Discover — never returns the full records dump. */
export async function GET(request: NextRequest) {
  try {
    const guarded = await guardPublicSearch(request);
    if (!guarded.ok) return guarded.response;

    const { searchParams } = new URL(request.url);
    const query = guarded.query;
    const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit") || 8)));
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (catalogueDataExists() && tokens.length) {
      const catalogue = filterCatalogueRecords({ q: query, page: 1, limit });
      const results = catalogue.items.map((item) => ({
        id: item.id,
        title: item.title,
        creator: item.creatorOrAuthority ?? undefined,
        summary: item.description?.slice(0, 280),
        sourceUrl: item.sourceUrl ?? undefined,
        source: "ARED Catalogue",
        type: item.recordType,
        thumbnailUrl: null as string | null,
        hasThumbnail: false,
      }));
      if (results.length) {
        return NextResponse.json({
          ok: true,
          source: "archive",
          query,
          count: results.length,
          results,
        });
      }
    }

    const { data, error } = await supabase
      .from("records")
      .select("id, content")
      .order("id", { ascending: false })
      .limit(SCAN_CAP);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const results = [];
    for (const row of data ?? []) {
      const normalized = normalizeArchiveRecord(row.content) as Record<string, unknown>;
      if (!tokens.length || recordMatchesQuery(normalized, tokens)) {
        results.push(toDiscoverRow(normalized));
      }
      if (results.length >= limit) break;
    }

    return NextResponse.json({
      ok: true,
      source: "archive",
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    const message = safePublicError(error, "Archive search temporarily unavailable");
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
