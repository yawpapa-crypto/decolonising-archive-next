import type { ArchiveRecord } from "@/lib/records";
import { resolveRecordGeography } from "@/lib/workbench-intelligence-geo";

export type GeographyRecordRef = {
  recordId: string;
  title: string;
  source: string | null;
  year: string | null;
  region: string | null;
};

export type GeographicCountryCoverage = {
  country: string;
  iso3: string | null;
  count: number;
  records: GeographyRecordRef[];
};

export type GeographicRegionCoverage = {
  region: string;
  count: number;
};

export type UserGeographicCoverage = {
  countries: GeographicCountryCoverage[];
  regions: GeographicRegionCoverage[];
};

export type GeographyRecordInput = {
  recordId: string;
  title?: string | null;
  source?: string | null;
  year?: string | null;
  metadata?: Record<string, unknown> | null;
  archiveRecord?: ArchiveRecord | null;
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
  "south africa": "South Africa",
  kenya: "Kenya",
  egypt: "Egypt",
  ethiopia: "Ethiopia",
  senegal: "Senegal",
  morocco: "Morocco",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  usa: "United States",
  "united states": "United States",
  india: "India",
  china: "China",
  japan: "Japan",
  canada: "Canada",
  mexico: "Mexico",
  france: "France",
  germany: "Germany",
  "new zealand": "New Zealand",
};

export const COUNTRY_ISO3: Record<string, string> = {
  Ghana: "GHA",
  Nigeria: "NGA",
  Mali: "MLI",
  "South Africa": "ZAF",
  Kenya: "KEN",
  Egypt: "EGY",
  Ethiopia: "ETH",
  Senegal: "SEN",
  Morocco: "MAR",
  Brazil: "BRA",
  Australia: "AUS",
  Jamaica: "JAM",
  Haiti: "HTI",
  Cuba: "CUB",
  Barbados: "BRB",
  "Trinidad and Tobago": "TTO",
  "United Kingdom": "GBR",
  "United States": "USA",
  India: "IND",
  China: "CHN",
  Japan: "JPN",
  Canada: "CAN",
  Mexico: "MEX",
  France: "FRA",
  Germany: "DEU",
  "New Zealand": "NZL",
};

const REGION_KEYWORDS = [
  "West Africa",
  "North Africa",
  "East Africa",
  "Southern Africa",
  "Central Africa",
  "Sahel",
  "Africa-wide / Pan-African",
  "African Diaspora",
  "Global / Comparative",
  "Caribbean",
  "Global South",
];

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function readMetadataGeography(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return { countries: [] as string[], regions: [] as string[], places: [] as string[] };
  }

  return {
    countries: [
      ...asStringArray(metadata.country),
      ...asStringArray(metadata.countries),
      ...asStringArray(metadata.countryName),
      ...asStringArray(metadata.country_name),
    ],
    regions: [
      ...asStringArray(metadata.region),
      ...asStringArray(metadata.regions),
    ],
    places: [
      ...asStringArray(metadata.place),
      ...asStringArray(metadata.places),
    ],
  };
}

function inferCountriesFromText(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const [alias, label] of Object.entries(COUNTRY_ALIASES)) {
    if (lower.includes(alias) && !found.includes(label)) found.push(label);
  }
  return found;
}

function inferRegionsFromText(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const region of REGION_KEYWORDS) {
    if (lower.includes(region.toLowerCase()) && !found.includes(region)) found.push(region);
  }
  return found;
}

export function normaliseCountry(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const key = value.toLowerCase().trim();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  if (COUNTRY_ISO3[value.trim()]) return value.trim();
  if (/^[a-z\s.'-]+$/i.test(value.trim())) {
    return value
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
  return null;
}

export function countryToIso3(country: string): string | null {
  return COUNTRY_ISO3[country] ?? null;
}

export function extractCountriesFromRecord(input: GeographyRecordInput): {
  countries: string[];
  regions: string[];
  places: string[];
} {
  const countries = new Set<string>();
  const regions = new Set<string>();
  const places = new Set<string>();

  if (input.archiveRecord) {
    const geo = resolveRecordGeography(input.archiveRecord);
    for (const country of geo.countries) {
      const normalized = normaliseCountry(country);
      if (normalized) countries.add(normalized);
    }
    for (const region of geo.regions) regions.add(region);
    for (const place of geo.cities) places.add(place);
  }

  const fromMeta = readMetadataGeography(input.metadata ?? null);
  for (const country of fromMeta.countries) {
    const normalized = normaliseCountry(country);
    if (normalized) countries.add(normalized);
  }
  for (const region of fromMeta.regions) regions.add(region);
  for (const place of fromMeta.places) places.add(place);

  const text = [input.title, input.source].filter(Boolean).join(" ");
  for (const country of inferCountriesFromText(text)) countries.add(country);
  for (const region of inferRegionsFromText(text)) regions.add(region);

  return {
    countries: [...countries],
    regions: [...regions],
    places: [...places],
  };
}

export function coverageFillColor(count: number, maxCount: number, selected: boolean): string {
  if (selected) return "#0f3d2e";
  if (!count) return "#eef2ef";
  const intensity = Math.max(0.15, count / Math.max(1, maxCount));
  const g = Math.round(180 + intensity * 40);
  const b = Math.round(170 + intensity * 30);
  return `rgb(45, ${g}, ${b})`;
}
