import { COUNTRY_COORDINATES, getPlaceCoordinates } from "@/lib/workbench-intelligence-geo";
import type { IntelligenceItem } from "@/lib/workbench-intelligence-types";

export type MapRecordPoint = {
  longitude: number;
  latitude: number;
  weight: number;
  placeId: string | null;
  label: string | null;
};

export function itemsToMapPoints(items: IntelligenceItem[]): MapRecordPoint[] {
  const points: MapRecordPoint[] = [];

  for (const item of items) {
    if (item.type !== "record") continue;

    let lat: number | null = null;
    let lon: number | null = null;
    let label: string | null = item.country ?? item.region ?? item.continent ?? null;
    let placeId: string | null = item.placeIds?.[0] ?? null;

    if (item.country) {
      const meta = COUNTRY_COORDINATES[item.country.toLowerCase()];
      if (meta) {
        lat = meta.lat;
        lon = meta.lon;
      }
    }

    if (lat == null && item.continent) {
      const coords = getPlaceCoordinates("continent", item.continent, item.continent);
      lat = coords.lat;
      lon = coords.lon;
    }

    if (lat == null) continue;

    const jitter = ((item.id.charCodeAt(0) % 10) - 5) * 0.35;
    points.push({
      longitude: lon! + jitter,
      latitude: lat + jitter * 0.5,
      weight: 1,
      placeId,
      label,
    });
  }

  return points;
}
