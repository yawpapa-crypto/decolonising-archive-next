import type { ArchiveRecord } from "@/lib/records";
import { REGIONS } from "@/lib/archive-metadata";

export type GeoPlaceKind = "continent" | "region" | "country" | "city" | "diaspora";

export type RecordGeography = {
  continents: string[];
  regions: string[];
  countries: string[];
  cities: string[];
  diaspora: boolean;
};

export type GeoPlaceStats = {
  id: string;
  kind: GeoPlaceKind;
  label: string;
  continent: string | null;
  parentId: string | null;
  latitude: number;
  longitude: number;
  recordCount: number;
  userRecordCount: number;
  themes: Map<string, number>;
  sources: Map<string, number>;
  openAccess: number;
  missingCreator: number;
  missingInstitution: number;
  lastSynced: string | null;
};

/** Extensible country registry — add entries as the archive grows. */
export const COUNTRY_COORDINATES: Record<string, { lat: number; lon: number; continent: string }> = {
  ghana: { lat: 7.95, lon: -1.02, continent: "Africa" },
  nigeria: { lat: 9.08, lon: 8.68, continent: "Africa" },
  mali: { lat: 17.57, lon: -3.99, continent: "Africa" },
  "south africa": { lat: -30.56, lon: 22.94, continent: "Africa" },
  kenya: { lat: -0.02, lon: 37.91, continent: "Africa" },
  egypt: { lat: 26.82, lon: 30.8, continent: "Africa" },
  ethiopia: { lat: 9.15, lon: 40.49, continent: "Africa" },
  senegal: { lat: 14.5, lon: -14.45, continent: "Africa" },
  morocco: { lat: 31.79, lon: -7.09, continent: "Africa" },
  brazil: { lat: -14.24, lon: -51.93, continent: "South America" },
  "united states": { lat: 37.09, lon: -95.71, continent: "North America" },
  usa: { lat: 37.09, lon: -95.71, continent: "North America" },
  canada: { lat: 56.13, lon: -106.35, continent: "North America" },
  mexico: { lat: 23.63, lon: -102.55, continent: "North America" },
  "united kingdom": { lat: 55.38, lon: -3.44, continent: "Europe" },
  uk: { lat: 55.38, lon: -3.44, continent: "Europe" },
  france: { lat: 46.23, lon: 2.21, continent: "Europe" },
  germany: { lat: 51.17, lon: 10.45, continent: "Europe" },
  india: { lat: 20.59, lon: 78.96, continent: "Asia" },
  china: { lat: 35.86, lon: 104.2, continent: "Asia" },
  japan: { lat: 36.2, lon: 138.25, continent: "Asia" },
  australia: { lat: -25.27, lon: 133.78, continent: "Oceania" },
  "new zealand": { lat: -40.9, lon: 174.89, continent: "Oceania" },
  jamaica: { lat: 18.11, lon: -77.3, continent: "North America" },
  haiti: { lat: 18.97, lon: -72.29, continent: "North America" },
  cuba: { lat: 21.52, lon: -77.78, continent: "North America" },
  trinidad: { lat: 10.69, lon: -61.22, continent: "North America" },
  barbados: { lat: 13.19, lon: -59.54, continent: "North America" },
};

const CONTINENT_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  Africa: { lat: 8, lon: 20 },
  Asia: { lat: 34, lon: 100 },
  Europe: { lat: 54, lon: 15 },
  "North America": { lat: 45, lon: -100 },
  "South America": { lat: -15, lon: -60 },
  Oceania: { lat: -22, lon: 140 },
  Global: { lat: 20, lon: 0 },
};

/** Comparison presets — equal weight, not Ghana-centric. */
export const PLACE_COMPARISON_PRESETS = [
  { id: "ghana", label: "Ghana" },
  { id: "nigeria", label: "Nigeria" },
  { id: "brazil", label: "Brazil" },
  { id: "uk", label: "United Kingdom" },
  { id: "caribbean", label: "Caribbean" },
  { id: "australia", label: "Australia" },
] as const;

const REGION_TO_CONTINENT: Record<string, string> = {
  "West Africa": "Africa",
  "North Africa": "Africa",
  "East Africa": "Africa",
  "Southern Africa": "Africa",
  "Central Africa": "Africa",
  Sahel: "Africa",
  "Africa-wide / Pan-African": "Africa",
  "African Diaspora": "North America",
  "Global / Comparative": "Europe",
  Caribbean: "North America",
  "Global South": "South America",
};

const COUNTRY_ALIASES: Record<string, string> = {
  ghana: "Ghana",
  nigeria: "Nigeria",
  mali: "Mali",
  brazil: "Brazil",
  australia: "Australia",
  jamaica: "Jamaica",
  haiti: "Haiti",
  cuba: "Cuba",
  barbados: "Barbados",
  trinidad: "Trinidad and Tobago",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  usa: "United States",
  "united states": "United States",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalCountry(raw: string): string | null {
  const key = raw.toLowerCase().trim();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  if (COUNTRY_COORDINATES[key]) {
    return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (key.length >= 3 && /^[a-z\s.-]+$/i.test(raw)) {
    return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

function inferCountriesFromText(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const [alias, label] of Object.entries(COUNTRY_ALIASES)) {
    if (lower.includes(alias)) found.push(label);
  }
  for (const key of Object.keys(COUNTRY_COORDINATES)) {
    const label = canonicalCountry(key);
    if (label && lower.includes(key) && !found.includes(label)) {
      found.push(label);
    }
  }
  return found;
}

function inferRegionsFromText(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const region of REGIONS) {
    if (lower.includes(region.toLowerCase())) found.push(region);
  }
  if (/caribbean/i.test(lower)) found.push("Caribbean");
  if (/global south/i.test(lower)) found.push("Global South");
  return [...new Set(found)];
}

export function resolveRecordGeography(record: ArchiveRecord): RecordGeography {
  const countries = new Set<string>();
  const cities = new Set<string>();
  const regions = new Set<string>(record.region ?? []);
  const continents = new Set<string>();

  for (const c of record.country ?? []) {
    const canon = canonicalCountry(c);
    if (canon) countries.add(canon);
  }

  for (const p of record.place ?? []) {
    if (p.trim()) cities.add(p.trim());
  }

  const tagText = [
    ...(record.knowledgeAreas ?? []),
    record.title,
    record.description,
    record.creator,
    record.publisher,
    ...(record.contributors ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  for (const c of inferCountriesFromText(tagText)) countries.add(c);
  for (const r of inferRegionsFromText(tagText)) regions.add(r);

  for (const region of regions) {
    const continent = REGION_TO_CONTINENT[region];
    if (continent) continents.add(continent);
  }

  for (const country of countries) {
    const meta = COUNTRY_COORDINATES[country.toLowerCase()];
    if (meta) continents.add(meta.continent);
  }

  if (!continents.size && regions.size) continents.add("Africa");
  if (!continents.size && !regions.size && !countries.size) {
    continents.add("Global");
  }

  const diaspora =
    regions.has("African Diaspora") ||
    /diaspora/i.test(tagText) ||
    [...regions].some((r) => /diaspora/i.test(r));

  return {
    continents: [...continents],
    regions: [...regions],
    countries: [...countries],
    cities: [...cities],
    diaspora,
  };
}

export function getPlaceCoordinates(
  kind: GeoPlaceKind,
  label: string,
  continent?: string | null,
): { lat: number; lon: number } {
  const key = label.toLowerCase();
  if (kind === "country" && COUNTRY_COORDINATES[key]) {
    return { lat: COUNTRY_COORDINATES[key].lat, lon: COUNTRY_COORDINATES[key].lon };
  }
  if (continent && CONTINENT_CENTROIDS[continent]) {
    return CONTINENT_CENTROIDS[continent];
  }
  return CONTINENT_CENTROIDS.Global;
}

export function projectToMap(lat: number, lon: number, width = 1000, height = 500) {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

export function placeId(kind: GeoPlaceKind, label: string) {
  return `${kind}:${slugify(label)}`;
}

export function matchesComparisonPreset(
  presetId: string,
  geo: RecordGeography,
  record: ArchiveRecord,
): boolean {
  const text = [
    ...geo.countries,
    ...geo.regions,
    ...geo.cities,
    record.title,
    record.description,
    ...(record.knowledgeAreas ?? []),
  ]
    .join(" ")
    .toLowerCase();

  switch (presetId) {
    case "ghana":
      return geo.countries.some((c) => c.toLowerCase() === "ghana") || /ghana/i.test(text);
    case "nigeria":
      return geo.countries.some((c) => c.toLowerCase() === "nigeria") || /nigeria/i.test(text);
    case "brazil":
      return geo.countries.some((c) => c.toLowerCase() === "brazil") || /brazil/i.test(text);
    case "uk":
      return (
        geo.countries.some((c) => /united kingdom|^uk$/i.test(c)) ||
        /\b(united kingdom|britain|england|\buk\b)/i.test(text)
      );
    case "caribbean":
      return (
        geo.regions.some((r) => /caribbean/i.test(r)) ||
        /caribbean|jamaica|haiti|cuba|barbados|trinidad/i.test(text)
      );
    case "australia":
      return geo.countries.some((c) => c.toLowerCase() === "australia") || /australia/i.test(text);
    default:
      return false;
  }
}

function isOpenAccess(record: ArchiveRecord) {
  if (["Public Domain", "Creative Commons", "Open Access", "Metadata Only"].includes(record.rightsStatus)) {
    return true;
  }
  if (record.licence?.startsWith("CC")) return true;
  return /open access|public domain|creative commons/i.test(record.rightsStatus);
}

export function buildGeographyIndex(
  records: ArchiveRecord[],
  userRecordIds: Set<string>,
) {
  const places = new Map<string, GeoPlaceStats>();

  function ensure(
    id: string,
    kind: GeoPlaceKind,
    label: string,
    continent: string | null,
    parentId: string | null,
    lat: number,
    lon: number,
  ) {
    if (!places.has(id)) {
      places.set(id, {
        id,
        kind,
        label,
        continent,
        parentId,
        latitude: lat,
        longitude: lon,
        recordCount: 0,
        userRecordCount: 0,
        themes: new Map(),
        sources: new Map(),
        openAccess: 0,
        missingCreator: 0,
        missingInstitution: 0,
        lastSynced: null,
      });
    }
    return places.get(id)!;
  }

  function bump(bucket: GeoPlaceStats, record: ArchiveRecord, isUser: boolean) {
    bucket.recordCount += 1;
    if (isUser) bucket.userRecordCount += 1;
    for (const theme of record.knowledgeAreas ?? []) {
      bucket.themes.set(theme, (bucket.themes.get(theme) ?? 0) + 1);
    }
    bucket.sources.set(record.sourceName, (bucket.sources.get(record.sourceName) ?? 0) + 1);
    if (isOpenAccess(record)) bucket.openAccess += 1;
    if (!record.creator?.trim()) bucket.missingCreator += 1;
    if (!record.publisher?.trim() && !record.contributors?.length) bucket.missingInstitution += 1;
    if (record.dateAccessed && (!bucket.lastSynced || record.dateAccessed > bucket.lastSynced)) {
      bucket.lastSynced = record.dateAccessed;
    }
  }

  for (const record of records) {
    const geo = resolveRecordGeography(record);
    const isUser = userRecordIds.has(record.id);

    for (const continent of geo.continents) {
      const id = placeId("continent", continent);
      const coords = getPlaceCoordinates("continent", continent, continent);
      bump(
        ensure(id, "continent", continent, continent, null, coords.lat, coords.lon),
        record,
        isUser,
      );
    }

    for (const region of geo.regions) {
      const continent = REGION_TO_CONTINENT[region] ?? geo.continents[0] ?? "Global";
      const id = placeId("region", region);
      const coords = getPlaceCoordinates("region", region, continent);
      bump(
        ensure(
          id,
          "region",
          region,
          continent,
          placeId("continent", continent),
          coords.lat,
          coords.lon,
        ),
        record,
        isUser,
      );
    }

    for (const country of geo.countries) {
      const meta = COUNTRY_COORDINATES[country.toLowerCase()];
      const continent = meta?.continent ?? geo.continents[0] ?? "Global";
      const coords = getPlaceCoordinates("country", country, continent);
      const id = placeId("country", country);
      bump(
        ensure(
          id,
          "country",
          country,
          continent,
          placeId("continent", continent),
          coords.lat,
          coords.lon,
        ),
        record,
        isUser,
      );
    }

    for (const city of geo.cities) {
      const country = geo.countries[0] ?? null;
      const continent = country
        ? COUNTRY_COORDINATES[country.toLowerCase()]?.continent ?? geo.continents[0]
        : geo.continents[0];
      const parentId = country ? placeId("country", country) : null;
      const base = country
        ? getPlaceCoordinates("country", country, continent ?? null)
        : getPlaceCoordinates("city", city, continent ?? null);
      const id = placeId("city", city);
      bump(
        ensure(
          id,
          "city",
          city,
          continent ?? null,
          parentId,
          base.lat + (slugify(city).length % 5) * 0.4,
          base.lon + (slugify(city).length % 7) * 0.5,
        ),
        record,
        isUser,
      );
    }

    if (geo.diaspora) {
      const id = placeId("diaspora", "African Diaspora");
      const coords = getPlaceCoordinates("diaspora", "African Diaspora", "North America");
      bump(
        ensure(id, "diaspora", "African Diaspora", "North America", null, coords.lat, coords.lon),
        record,
        isUser,
      );
    }
  }

  return places;
}

export function topLabels(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}
