/**
 * UNESCO World Heritage layer for ared.design and AR/D Fieldnotes (built by
 * scripts/import-unesco-world-heritage.mjs from UNESCO's official WHC export).
 *
 * - Inscribed properties only. Components use UNESCO's own coordinates; a property published with a
 *   single point is flagged `representativePoint` and never presented as each site's location.
 * - The listing citation uses only fields UNESCO publishes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

type Component = { name: string; reference: string; latitude: number; longitude: number };
type HeritageRecord = {
  id: string; idNo: string; name: string; countries: string[]; region: string | null; inscribed: string | null;
  category: string; criteria: string | null; danger: boolean; transboundary: boolean; shortDescription: string | null;
  description: string | null; officialUrl: string; latitude: number; longitude: number; locationPrecision: string;
  coordinateSource: string; componentsCount: number; components: Component[];
  image: { url: string; author: string | null; copyright: string | null; caption: string | null } | null;
  searchNames: string[];
};
type Feature = { id: string; propertyId: string; kind: "property" | "component"; name: string; latitude: number; longitude: number; category: string; inscribed: string | null; danger: boolean };
type Dataset = { metadata: Record<string, string | null>; records: HeritageRecord[]; features: Feature[] };

let data: Dataset | null = null;
let byId: Map<string, HeritageRecord> | null = null;

function load(): Dataset {
  if (!data) {
    data = JSON.parse(readFileSync(path.join(process.cwd(), "data/unesco/world-heritage.json"), "utf8")) as Dataset;
    byId = new Map();
    for (const r of data.records) { byId.set(r.id, r); byId.set(r.idNo, r); }
  }
  return data;
}

export type Bounds = { west: number; south: number; east: number; north: number };

export function parseBounds(bbox: string | null | undefined): Bounds | null {
  const parts = (bbox ?? "").split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts as [number, number, number, number];
  if (south < -90 || north > 90 || south > north) return null;
  return { west, south, east, north };
}

const inBounds = (lat: number, lng: number, b: Bounds) =>
  lat >= b.south && lat <= b.north && (b.west <= b.east ? lng >= b.west && lng <= b.east : lng >= b.west || lng <= b.east);

/** Zoomed out: one point per property. Zoomed in (≥7): verified components replace their property. */
export function heritageInBounds(bounds: Bounds, zoom: number, limit = 800) {
  const { features } = load();
  const showComponents = zoom >= 7;
  const hasComponents = new Set(features.filter((f) => f.kind === "component").map((f) => f.propertyId));
  const records = byId!;
  const picked = features
    .filter((f) => inBounds(f.latitude, f.longitude, bounds))
    .filter((f) => (f.kind === "component" ? showComponents : !(showComponents && hasComponents.has(f.propertyId))))
    .map((f) => {
      const parent = records.get(f.propertyId);
      return { ...f, propertyName: parent?.name ?? f.name, representativePoint: f.kind === "property" && (parent?.components.length ?? 0) <= 1 };
    });
  return { features: picked.slice(0, limit), truncated: picked.length > limit };
}

export function heritageSearch(q: string, limit = 8) {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  return load().records
    .map((r) => {
      const names = r.searchNames.map((n) => n.toLowerCase());
      const score = names.some((n) => n === term) ? 3 : names.some((n) => n.startsWith(term)) ? 2 : names.some((n) => n.includes(term)) ? 1 : 0;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
    .slice(0, limit)
    .map(({ r }) => ({ id: r.id, name: r.name, country: r.countries.join(", "), latitude: r.latitude, longitude: r.longitude, inscribed: r.inscribed, category: r.category }));
}

export function heritageDetail(id: string) {
  load();
  const key = id.trim().match(/^(unesco-wh-\d+)-component-/i)?.[1] ?? id.trim();
  const r = byId!.get(key) ?? byId!.get(key.toLowerCase());
  if (!r) return null;
  const meta = data!.metadata;
  return {
    id: r.id, unescoId: r.idNo, name: r.name, countries: r.countries, region: r.region, inscribed: r.inscribed,
    category: r.category, criteria: r.criteria, danger: r.danger, transboundary: r.transboundary,
    shortDescription: r.shortDescription, description: r.description, officialUrl: r.officialUrl,
    latitude: r.latitude, longitude: r.longitude, locationPrecision: r.locationPrecision, coordinateSource: r.coordinateSource,
    components: r.components.map((c) => ({ id: `${r.id}-component-${c.reference}`, ...c })),
    componentsCount: r.componentsCount,
    representativePoint: r.components.length <= 1,
    image: r.image,
    source: { name: "UNESCO World Heritage List", version: meta.sourceVersion ?? null, importedAt: meta.importedAt ?? null },
    citation: { apa: `UNESCO World Heritage Centre. (${r.inscribed ?? "n.d."}). ${r.name}. UNESCO World Heritage List. ${r.officialUrl}`, subject: "unesco_listing" as const },
  };
}
