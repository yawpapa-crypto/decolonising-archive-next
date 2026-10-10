import { NextResponse } from "next/server";
import { nearbyArchive } from "@/lib/geo/nearby-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/places/nearby-records?lat=&lng=&radius=&limit=
 * Archival material with genuine coordinates near a point (live partner archives).
 * Coordinates are rounded to 4 decimals in the request; nothing about the caller is stored.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
  const radius = Math.min(20_000, Math.max(200, Number(q.get("radius")) || 5_000));
  const limit = Math.min(60, Math.max(1, Number(q.get("limit")) || 30));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
  }
  const result = await nearbyArchive({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)), radius, limit });
  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=600" } });
}
