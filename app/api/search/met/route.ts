import { NextRequest, NextResponse } from "next/server";
import { fetchExternalJson } from "@/lib/search/external-http";
import { guardPublicSearch } from "@/src/lib/security/search-guard";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

const MET_SEARCH_LABEL = "metmuseum.org/collection/v1/search";
const MET_OBJECT_LABEL = "metmuseum.org/collection/v1/objects";

export async function GET(request: NextRequest) {
  try {
    const guarded = await guardPublicSearch(request);
    if (!guarded.ok) return guarded.response;

    const { searchParams } = new URL(request.url);
    const query = guarded.query;
    const idOffset = Math.max(0, Number(searchParams.get("idOffset") || 0));
    const batchSize = Math.min(12, Math.max(1, Number(searchParams.get("limit") || 6)));
    const idsParam = searchParams.get("ids");
    const started = Date.now();
    let retryAttempted = false;

    let allIds: number[] | null = null;
    if (idsParam) {
      allIds = idsParam
        .split(",")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => Number.isFinite(id));
    }

    if (!allIds?.length) {
      const searchUrl = new URL(
        "https://collectionapi.metmuseum.org/public/collection/v1/search",
      );
      searchUrl.searchParams.set("hasImages", "true");
      searchUrl.searchParams.set("q", query);

      const searchRes = await fetchExternalJson<{ objectIDs?: number[] | null }>(
        searchUrl.toString(),
        { timeoutMs: 12_000, maxRetries: 1, cacheSeconds: 600 },
      );
      retryAttempted = searchRes.retryAttempted;

      if (!searchRes.ok) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[external-search]", "met", {
            status: searchRes.status,
            errorCode: searchRes.error?.code,
            message: searchRes.error?.message,
            durationMs: searchRes.durationMs,
            endpoint: MET_SEARCH_LABEL,
            retryAttempted: searchRes.retryAttempted,
          });
        }
        return NextResponse.json({
          ok: false,
          source: "met",
          error: {
            code: searchRes.error?.code || "upstream_error",
            message: searchRes.error?.message || "Met search failed",
            status: searchRes.status || undefined,
          },
          objectIDs: [],
          objects: [],
          durationMs: Date.now() - started,
          retryAttempted,
          endpointLabel: MET_SEARCH_LABEL,
        });
      }

      const searchJson = searchRes.data || {};
      allIds = Array.isArray(searchJson.objectIDs) ? searchJson.objectIDs : [];
    }

    if (!allIds?.length) {
      return NextResponse.json({
        ok: true,
        source: "met",
        objectIDs: [],
        objects: [],
        count: 0,
        displayedCount: 0,
        nextOffset: null,
        durationMs: Date.now() - started,
        retryAttempted,
        endpointLabel: MET_SEARCH_LABEL,
      });
    }

    const ids = allIds.slice(idOffset, idOffset + batchSize);
    const objects: unknown[] = [];
    for (const id of ids) {
      const objectRes = await fetchExternalJson(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
        { timeoutMs: 8_000, maxRetries: 0, cacheSeconds: 600 },
      );
      if (objectRes.retryAttempted) retryAttempted = true;
      if (objectRes.ok && objectRes.data) objects.push(objectRes.data);
    }

    const nextIdOffset = idOffset + ids.length;
    return NextResponse.json({
      ok: true,
      source: "met",
      objectIDs: allIds,
      objects,
      count: allIds.length,
      displayedCount: objects.length,
      nextOffset: nextIdOffset < allIds.length ? nextIdOffset : null,
      durationMs: Date.now() - started,
      retryAttempted,
      endpointLabel: MET_OBJECT_LABEL,
    });
  } catch (error) {
    const message = safePublicError(error, "Met Collection search temporarily unavailable");
    return NextResponse.json({
      ok: false,
      source: "met",
      error: { code: "internal_error", message },
      objectIDs: [],
      objects: [],
    });
  }
}
