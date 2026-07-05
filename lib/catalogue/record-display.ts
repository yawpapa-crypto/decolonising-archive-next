import type { CatalogueRecord } from "./types";

export type RecordImageAccess = "display" | "source_only" | "none";

export type RecordImageInfo = {
  access: RecordImageAccess;
  url: string | null;
  alt: string;
  sourceUrl: string | null;
  label: string | null;
};

/** Featured editorial breaks in the list */
export const FEATURED_RECORD_IDS = new Set([
  "ARED-GH-HIST-00019",
  "ARED-GH-HIST-00020",
  "ARED-GH-HIST-00011",
  "ARED-GH-HIST-00007",
  "ARED-GH-00044",
  "ARED-GH-00081",
]);

/** Open editorial / public-domain image overrides (also used server-side) */
export const EDITORIAL_IMAGE_OVERRIDES: Record<string, string> = {
  "ARED-GH-HIST-00019": "/images/ghana-hero/ghana-flag.svg",
  "ARED-GH-HIST-00020":
    "https://upload.wikimedia.org/wikipedia/commons/1/19/Coat_of_arms_of_Ghana.svg",
  "ARED-GH-HIST-00011": "/images/ghana-hero/asafo-flag.svg",
  "ARED-GH-HIST-00007":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Adinkra_cloth.jpg/440px-Adinkra_cloth.jpg",
};

export const EDITORIAL_CATEGORIES = [
  { id: "all", label: "ALL RECORDS" },
  { id: "objects", label: "OBJECTS", recordType: "museum object" },
  { id: "people", label: "PEOPLE", recordType: "person" },
  { id: "publications", label: "PUBLICATIONS", recordType: "publication" },
  { id: "institutions", label: "INSTITUTIONS", recordType: "institution" },
  { id: "practices", label: "LIVING PRACTICES", recordType: "documented practice" },
  { id: "asafo", label: "ASAFO", q: "asafo" },
  { id: "adinkra", label: "ADINKRA", q: "adinkra" },
  { id: "kente", label: "KENTE", q: "kente" },
  { id: "goldweights", label: "GOLDWEIGHTS", q: "goldweight" },
  { id: "state", label: "STATE IDENTITY", visualSystemId: "V5" },
  { id: "print", label: "PRINT", visualSystemId: "V4" },
  { id: "popular", label: "POPULAR GRAPHICS", visualSystemId: "V6" },
  { id: "digital", label: "DIGITAL DESIGN", visualSystemId: "V7" },
] as const;

export function recordDateLabel(record: CatalogueRecord): string {
  const display = record.rawCsvRow?.date_display;
  if (display) return display;
  if (record.dateStart || record.dateEnd) {
    return `${record.dateStart ?? "?"} – ${record.dateEnd ?? "?"}`;
  }
  return "";
}

export function recordMakerLabel(record: CatalogueRecord): string {
  const maker = record.creatorOrAuthority?.trim();
  if (maker && !/unrecorded|unknown|to be/i.test(maker) && maker.length < 80) {
    return maker;
  }
  return "";
}

export function recordExcerpt(record: CatalogueRecord, max = 220): string {
  const text =
    record.rawCsvRow?.source_facts ||
    record.description.replace(/^\[Source facts\]\s*/i, "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Pastel tale palettes keyed by visual system id */
export const RECORD_CARD_PALETTES: Record<
  string,
  { bg: string; accent: string; muted: string; border: string }
> = {
  V1: { bg: "#f7ede3", accent: "#9a6b2f", muted: "#6b5340", border: "#dcc4a8" },
  V2: { bg: "#e8f0fa", accent: "#2c5282", muted: "#4a5568", border: "#b8cce8" },
  V3: { bg: "#fce8ef", accent: "#b83280", muted: "#744057", border: "#f0b8cc" },
  V4: { bg: "#eef3ff", accent: "#3b5998", muted: "#4a5568", border: "#b8c8f0" },
  V5: { bg: "#fff6e5", accent: "#b7791f", muted: "#744210", border: "#f0d898" },
  V6: { bg: "#e8f6ec", accent: "#276749", muted: "#3d5c48", border: "#b8dcc4" },
  V7: { bg: "#f3ebff", accent: "#6b46c1", muted: "#553c7b", border: "#d4b8f0" },
};

const RECORD_TYPE_PALETTES: Record<
  string,
  { bg: string; accent: string; muted: string; border: string }
> = {
  person: { bg: "#fff0eb", accent: "#c05621", muted: "#744530", border: "#f0c8b8" },
  publication: { bg: "#e8f4fc", accent: "#2b6cb0", muted: "#3d5a6b", border: "#b8d8f0" },
  institution: { bg: "#edf7f6", accent: "#0d9488", muted: "#3d5c58", border: "#b8e0dc" },
  "documented practice": { bg: "#f5f0e8", accent: "#8b6914", muted: "#5c5038", border: "#e0d4b8" },
  default: { bg: "#f4f0ec", accent: "#4a5568", muted: "#5c5348", border: "#d8d0c8" },
};

const GENERIC_ARED_RE =
  /ARED research note:|This interpretation is ARED analysis|forms part of Ghana's history of graphic design and visual communication/i;

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function cleanMuseumPreamble(text: string): string {
  return text
    .replace(
      /^The (?:Metropolitan Museum of Art|Cleveland Museum of Art) records (?:object|accession) [\w.]+ as "[^"]+"\.\s*/i,
      "",
    )
    .trim();
}

function extractArtistFromFacts(facts: string): string | null {
  const tombstone = facts.match(
    /Tombstone:[^.]*\.\s*([A-Z][^.]*?\([^)]+\d{4}[^)]*\))/,
  );
  if (tombstone) {
    const name = tombstone[1].match(/^([^(]+)/)?.[1]?.trim();
    if (name && name.length < 60) return name;
  }
  const named = facts.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)+) \([^,)]+,\s*\d{4}/);
  return named?.[1]?.trim() ?? null;
}

function isNoiseCulture(value: string | null | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  return (
    v.length === 0 ||
    v.length > 85 ||
    /^(America|France|Unrecorded|unknown|to be established)$/i.test(v)
  );
}

function shortenPeriod(label: string): string {
  return label.replace(/^([^,]+),.*$/, "$1").trim();
}

function shortenCulture(culture: string): string {
  if (culture.length <= 48) return culture;
  const parts = culture.split(",").map((p) => p.trim());
  return parts.slice(0, 2).join(", ");
}

export function recordCardPalette(record: CatalogueRecord): {
  bg: string;
  accent: string;
  muted: string;
  border: string;
} {
  const vsId = record.visualSystemId;
  if (vsId && RECORD_CARD_PALETTES[vsId]) return RECORD_CARD_PALETTES[vsId];

  const rt = record.recordType.toLowerCase();
  for (const [key, palette] of Object.entries(RECORD_TYPE_PALETTES)) {
    if (key !== "default" && rt.includes(key)) return palette;
  }
  return RECORD_TYPE_PALETTES.default;
}

export type RecordCardBrief = {
  overview: string;
  analysis: string | null;
  detailLines: { label: string; value: string }[];
};

function synthesizeMuseumOverview(record: CatalogueRecord, facts: string): string {
  const date = recordDateLabel(record);
  const medium = record.mediumOrFormat;
  const artist =
    extractArtistFromFacts(facts) ||
    (recordMakerLabel(record) && !isNoiseCulture(recordMakerLabel(record))
      ? recordMakerLabel(record)
      : null);
  const institution = record.institutionOrCollection;
  const accession = record.rawCsvRow?.collection_number;
  const place = record.locality || record.region;
  const technique = facts.match(/Technique\/material:\s*([^.\n]+)/i)?.[1]?.trim();

  const sentences: string[] = [];

  let opener = `“${record.title}”`;
  if (date) opener += ` (${date})`;
  if (medium || technique) opener += ` is a ${technique || medium} work`;
  if (artist) opener += ` by ${artist}`;
  if (place) opener += ` connected to ${place}`;
  sentences.push(`${opener}.`);

  const holding: string[] = [];
  if (record.objectOrRecordType) holding.push(`a ${record.objectOrRecordType.toLowerCase()}`);
  if (institution) {
    holding.push(`at ${institution}${accession ? ` (${accession})` : ""}`);
  }
  if (holding.length) sentences.push(`Catalogued as ${holding.join(" ")}.`);

  return truncate(sentences.join(" "), 280);
}

function synthesizeMuseumAnalysis(record: CatalogueRecord): string | null {
  const chunks: string[] = [];
  if (record.periodLabel) {
    chunks.push(`Read within ${shortenPeriod(record.periodLabel).toLowerCase()}`);
  }
  if (record.visualSystemLabel) {
    chunks.push(`it maps to ${record.visualSystemLabel.toLowerCase()}`);
  }
  if (record.communityOrCulture && !isNoiseCulture(record.communityOrCulture)) {
    chunks.push(`with cultural attribution to ${shortenCulture(record.communityOrCulture)}`);
  }
  if (record.objectOrRecordType) {
    chunks.push(`as a ${record.objectOrRecordType.toLowerCase()} in Ghana's visual archive`);
  }
  if (!chunks.length) return null;
  return `${chunks.join(", ")}.`;
}

export function recordInterpretationDisplay(record: CatalogueRecord): string | null {
  const raw = record.rawCsvRow?.ared_interpretation?.trim();
  if (!raw || GENERIC_ARED_RE.test(raw)) return null;
  return raw;
}

export function recordCardBrief(record: CatalogueRecord): RecordCardBrief {
  const raw = record.rawCsvRow;
  const sourceFacts = raw?.source_facts || record.description;
  const cleaned = cleanMuseumPreamble(sourceFacts);
  const interpretation = raw?.ared_interpretation?.trim() || null;
  const significance =
    record.historicalSignificance?.trim() || raw?.historical_significance?.trim() || null;
  const cultural = raw?.cultural_interpretation?.trim() || null;

  const isHistoricalEntry =
    record.publicationState.includes("historical") ||
    record.evidenceStatus === "partially_verified" ||
    record.evidenceStatus === "source_located";

  let overview: string;
  let analysis: string | null = null;

  if (isHistoricalEntry) {
    overview = truncate(cleaned, 320);
    if (interpretation && !GENERIC_ARED_RE.test(interpretation)) {
      analysis = truncate(interpretation, 240);
    }
  } else {
    overview = synthesizeMuseumOverview(record, cleaned);
    analysis = synthesizeMuseumAnalysis(record);
    if (interpretation && !GENERIC_ARED_RE.test(interpretation) && !analysis) {
      analysis = truncate(interpretation, 240);
    }
  }

  if (significance) analysis = truncate(significance, 240);
  else if (cultural && !analysis) analysis = truncate(cultural, 240);

  if (record.whatRemainsToBeEstablished && !analysis) {
    analysis = `Research note: ${truncate(record.whatRemainsToBeEstablished, 200)}`;
  }

  const detailLines = [
    record.periodLabel
      ? { label: "Period", value: shortenPeriod(record.periodLabel) }
      : null,
    record.visualSystemLabel
      ? { label: "Visual system", value: record.visualSystemLabel }
      : null,
    record.mediumOrFormat ? { label: "Medium", value: record.mediumOrFormat } : null,
    record.locality
      ? { label: "Place", value: record.locality }
      : record.region
        ? { label: "Region", value: record.region }
        : null,
    record.communityOrCulture && !isNoiseCulture(record.communityOrCulture)
      ? { label: "Culture", value: shortenCulture(record.communityOrCulture) }
      : null,
    record.institutionOrCollection
      ? {
          label: "Collection",
          value: [record.institutionOrCollection, raw?.collection_number]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return { overview, analysis, detailLines };
}

export function recordInitial(record: CatalogueRecord): string {
  const base = recordMakerLabel(record) || record.title;
  const letter = base.replace(/[^a-zA-Z]/g, "").charAt(0);
  return (letter || "A").toUpperCase();
}

export function listItemVariant(
  index: number,
  featured: boolean,
): "default" | "imageRight" | "imageLeft" | "centred" | "featured" | "textOnly" {
  if (featured) return "featured";
  const mod = index % 6;
  if (mod === 1) return "centred";
  if (mod === 2) return "imageRight";
  if (mod === 4) return "imageLeft";
  if (mod === 5) return "textOnly";
  return "default";
}

export function recordTypeIcon(recordType: string): string {
  const t = recordType.toLowerCase();
  if (t.includes("person")) return "◉";
  if (t.includes("institution")) return "▣";
  if (t.includes("publication")) return "▤";
  if (t.includes("practice")) return "◈";
  if (t.includes("museum")) return "◫";
  return "—";
}
