import { clampPageSize, SEARCH_DEFAULT_PAGE_SIZE } from "@/lib/search-pagination";

/** LoC SRU gateway — LCDB (online catalog) is live; HLAS explain exists but search is currently unavailable. */
export const LOC_SRU_HOST = "http://lx2.loc.gov:210";
export const LOC_SRU_LCDB = "lcdb";
export const LOC_SRU_HLAS = "HLAS";

export type LocSruRecord = {
  title: string;
  creators: string[];
  subjects: string[];
  descriptions: string[];
  types: string[];
  dates: string[];
  publishers: string[];
  coverages: string[];
  languages: string[];
  identifiers: string[];
  relations: string[];
  sourceQuery?: string;
};

export type LocSruSearchParams = {
  query: string;
  limit?: number;
  offset?: number;
};

export type LocSruSearchResponse = {
  source: "loc-sru";
  database: string;
  query: string;
  count: number | null;
  displayedCount: number;
  nextOffset: number | null;
  hasMore: boolean;
  results: Record<string, unknown>[];
  hlasStatus: string | null;
  error: string | null;
};

/** Curated bibliographic subjects aligned with the library's non-Western scope. */
export const LOC_SRU_CURATED_SUBJECTS = [
  "African Americans",
  "Africa",
  "Indians of North America",
  "Latin America",
  "South Asia",
  "Caribbean Area",
  "Decolonization",
  "Black people",
  "Indigenous peoples",
];

export const LOC_SRU_CURATED_KEYWORDS = [
  "africa", "african", "afro", "pan-african", "ghana", "nigeria", "kenya", "ethiopia", "senegal",
  "south africa", "west africa", "east africa", "maghreb", "swahili", "yoruba", "zulu", "igbo",
  "african american", "black american", "black people", "negro", "harlem", "civil rights",
  "slavery", "emancipation", "diaspora", "caribbean", "jamaica", "haiti", "afro-caribbean",
  "indians of north america", "native american", "indigenous", "first nations", "american indian",
  "dakota", "sioux", "cherokee", "navajo", "latin america", "mexico", "brazil", "peru", "andean",
  "india", "south asia", "bengal", "punjab", "tamil", "pakistan", "bangladesh", "sri lanka",
  "arab", "persia", "iran", "egypt", "morocco", "middle east",
  "china", "chinese", "japan", "japanese", "korea", "vietnam", "philippines",
  "pacific", "maori", "aboriginal", "oceania",
  "decolon", "colonial", "anticolonial", "postcolonial",
];

const LOC_SRU_WESTERN_ONLY_HINTS = [
  "white house", "capitol building", "eiffel tower", "versailles", "buckingham",
  "napoleon", "louis xiv", "victorian england", "prussian", "habsburg",
];

const SRU_TIMEOUT_MS = 12_000;

function foldText(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function decodeXmlEntities(value: string): string {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function escapeCqlTerm(term: string): string {
  return `"${String(term || "").replace(/"/g, '""').trim()}"`;
}

function buildUserCqlQuery(query: string): string {
  const term = escapeCqlTerm(query);
  return `(dc.title = ${term} or dc.subject = ${term})`;
}

function buildSubjectCqlQuery(subject: string): string {
  return `dc.subject = ${escapeCqlTerm(subject)}`;
}

function getTagValues(recordXml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(recordXml)) !== null) {
    const text = decodeXmlEntities(match[1].replace(/\s+/g, " ").trim());
    if (text) values.push(text);
  }
  return values;
}

function parseSruRecords(xml: string, sourceQuery?: string): LocSruRecord[] {
  const records: LocSruRecord[] = [];
  const recordBlocks = xml.match(/<zs:record\b[\s\S]*?<\/zs:record>/gi) || [];
  for (const block of recordBlocks) {
    const title = getTagValues(block, "title")[0] || "";
    if (!title) continue;
    records.push({
      title,
      creators: getTagValues(block, "creator"),
      subjects: getTagValues(block, "subject"),
      descriptions: getTagValues(block, "description"),
      types: getTagValues(block, "type"),
      dates: getTagValues(block, "date"),
      publishers: getTagValues(block, "publisher"),
      coverages: getTagValues(block, "coverage"),
      languages: getTagValues(block, "language"),
      identifiers: getTagValues(block, "identifier"),
      relations: getTagValues(block, "relation"),
      sourceQuery,
    });
  }
  return records;
}

function parseSruDiagnostics(xml: string): string | null {
  const match = xml.match(/<diag:message[^>]*>([\s\S]*?)<\/diag:message>/i);
  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function parseNumberOfRecords(xml: string): number | null {
  const match = xml.match(/<zs:numberOfRecords>(\d+)<\/zs:numberOfRecords>/i);
  return match ? Number(match[1]) : null;
}

function parseNextRecordPosition(xml: string): number | null {
  const match = xml.match(/<zs:nextRecordPosition>(\d+)<\/zs:nextRecordPosition>/i);
  return match ? Number(match[1]) : null;
}

function buildSruUrl(database: string, params: {
  query: string;
  startRecord: number;
  maximumRecords: number;
  version?: string;
}): string {
  const version = params.version || (database.toLowerCase() === LOC_SRU_HLAS.toLowerCase() ? "2.0" : "1.1");
  const search = new URLSearchParams({
    version,
    operation: "searchRetrieve",
    query: params.query,
    startRecord: String(params.startRecord),
    maximumRecords: String(params.maximumRecords),
    recordSchema: "dc",
  });
  return `${LOC_SRU_HOST}/${database}?${search.toString()}`;
}

async function fetchSruPage(database: string, query: string, startRecord: number, maximumRecords: number): Promise<{
  records: LocSruRecord[];
  total: number | null;
  nextStart: number | null;
  diagnostic: string | null;
}> {
  const url = buildSruUrl(database, { query, startRecord, maximumRecords });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SRU_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/xml, text/xml" },
      signal: controller.signal,
      cache: "no-store",
    });
    const xml = await response.text();
    const diagnostic = parseSruDiagnostics(xml);
    if (diagnostic) {
      return { records: [], total: null, nextStart: null, diagnostic };
    }
    const records = parseSruRecords(xml, query);
    return {
      records,
      total: parseNumberOfRecords(xml),
      nextStart: parseNextRecordPosition(xml),
      diagnostic: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function recordCuratedText(record: LocSruRecord): string {
  return [
    record.title,
    ...record.creators,
    ...record.subjects,
    ...record.descriptions,
    ...record.coverages,
  ].join(" ");
}

export function matchesLocSruCuratedScope(record: LocSruRecord, userQuery: string): boolean {
  const text = foldText(recordCuratedText(record));
  const query = foldText(String(userQuery || "").trim());
  const hasCuratedSignal = LOC_SRU_CURATED_KEYWORDS.some((keyword) => text.includes(foldText(keyword)));
  const queryIsCurated = query && LOC_SRU_CURATED_KEYWORDS.some((keyword) => query.includes(foldText(keyword)));
  const queryTokens = query.split(/\s+/).filter((token) => token.length >= 3);
  const queryMatchesItem = queryTokens.length
    ? queryTokens.some((token) => text.includes(token))
    : Boolean(query && text.includes(query));
  const westernOnly =
    LOC_SRU_WESTERN_ONLY_HINTS.some((hint) => text.includes(foldText(hint))) && !hasCuratedSignal;

  if (westernOnly) return false;
  if (hasCuratedSignal && (!query || queryMatchesItem || queryIsCurated)) return true;
  if (queryIsCurated && queryMatchesItem) return true;
  return false;
}

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pickCatalogUrl(record: LocSruRecord): string {
  for (const id of record.identifiers) {
    const lccn = id.match(/\b(20\d{8,}|\d{8,})\b/);
    if (lccn) return `https://lccn.loc.gov/${lccn[1]}`;
  }
  const title = record.title.replace(/\s+/g, " ").trim();
  const params = new URLSearchParams({
    searchArg: title,
    searchCode: "GKEY^*",
    searchType: "0",
  });
  return `https://catalog.loc.gov/vwebv/search?${params.toString()}`;
}

function mapLocType(raw: string): string {
  const text = foldText(raw);
  if (text.includes("text") || text.includes("book")) return "Book";
  if (text.includes("image") || text.includes("picture")) return "Image";
  if (text.includes("map")) return "Map";
  if (text.includes("manuscript")) return "Manuscript";
  if (text.includes("sound") || text.includes("audio")) return "Audio";
  return "Bibliographic record";
}

export function locSruRecordToClientPayload(
  record: LocSruRecord,
  userQuery: string,
  index: number,
): Record<string, unknown> {
  const creators = record.creators
    .map((value) => value.replace(/\s+https?:\/\/\S+/g, "").trim())
    .filter(Boolean);
  const creator = creators[0] || "Library of Congress";
  const period = record.dates[0] || "";
  const subjects = record.subjects.slice(0, 8);
  const summaryParts = [
    subjects.slice(0, 3).join("; "),
    record.publishers[0] || "",
    record.coverages[0] || "",
  ].filter(Boolean);
  const id = `live-loc-sru-${slugify(`${record.title}-${creator}-${index}`)}`;

  return {
    id,
    title: record.title,
    creator,
    summary: summaryParts.join(" · ") || "Bibliographic record from the Library of Congress online catalog (SRU/LCDB).",
    abstract: record.descriptions.join(" "),
    description: [
      record.publishers.length ? `Publisher: ${record.publishers.slice(0, 2).join("; ")}.` : "",
      subjects.length ? `Subjects: ${subjects.join("; ")}.` : "",
      record.coverages.length ? `Coverage: ${record.coverages.slice(0, 3).join("; ")}.` : "",
    ].filter(Boolean),
    period,
    type: mapLocType(record.types.join(" ")),
    cat: "Bibliographic & catalog records",
    region: record.coverages.join(" ") || subjects.join(" "),
    country: record.coverages[0] || "",
    collection: "LoC Catalog (SRU) · curated bibliographic scope",
    institution: "Library of Congress",
    source: "Library of Congress Catalog (SRU)",
    sourceName: "LoC Catalog (SRU)",
    sourceUrl: pickCatalogUrl(record),
    rights: "Bibliographic metadata from LoC SRU/LCDB. Access and reuse depend on the item at source.",
    rightsStatus: "Metadata Only",
    accessType: "External Link Only",
    sourceActionLabel: "View in LoC catalog",
    externalLinks: [{ label: "LoC catalog search", url: pickCatalogUrl(record) }],
    language: record.languages.slice(0, 3),
    tags: subjects,
    concepts: subjects.slice(0, 6),
    themes: subjects.slice(0, 6),
    images: [],
    provenance:
      "Bibliographic metadata from LoC SRU (lx2.loc.gov/lcdb). HLAS (Handbook of Latin American Studies) explain is published but searchRetrieve currently returns unavailable.",
    citation: `${creator}. ${record.title}${period ? ` (${period.replace(/\.$/, "")})` : ""}. Library of Congress catalog.`,
    notes: [
      "Curated LoC catalog scope: Africa, Black American, Indigenous Americas, Latin America, South Asia, and related non-Western subjects.",
      "SRU source: LCDB online catalog. HLAS database explain exists at lx2.loc.gov:210/HLAS but search is currently unavailable from LoC.",
    ],
    recordIdentifier: record.identifiers[0] || "",
    archiveIdentifier: `LOC-SRU-${index}`,
    resultMode: "live",
    trustScore: 0.88,
    liveSourceHint: "loc-catalog",
  };
}

function dedupeLocSruRecords(records: LocSruRecord[]): LocSruRecord[] {
  const seen = new Set<string>();
  const output: LocSruRecord[] = [];
  for (const record of records) {
    const key = foldText([record.title, record.creators[0] || "", record.dates[0] || ""].join("|"));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output;
}

export async function probeHlasAvailability(): Promise<string | null> {
  const page = await fetchSruPage(LOC_SRU_HLAS, "dc.title = brazil", 1, 1);
  return page.diagnostic;
}

export async function searchLocSruCatalog(
  params: LocSruSearchParams,
): Promise<LocSruSearchResponse> {
  const query = String(params.query || "").trim();
  const limit = clampPageSize(Number(params.limit || SEARCH_DEFAULT_PAGE_SIZE));
  const offset = Math.max(0, Number(params.offset || 0));
  const startRecord = offset + 1;

  if (!query) {
    return {
      source: "loc-sru",
      database: LOC_SRU_LCDB,
      query,
      count: 0,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      results: [],
      hlasStatus: null,
      error: null,
    };
  }

  const perSubject = Math.max(2, Math.ceil(limit / LOC_SRU_CURATED_SUBJECTS.length));
  const tasks: Array<Promise<{ records: LocSruRecord[]; total: number | null; nextStart: number | null; diagnostic: string | null }>> = [
    fetchSruPage(LOC_SRU_LCDB, buildUserCqlQuery(query), startRecord, limit),
    ...LOC_SRU_CURATED_SUBJECTS.map((subject) =>
      fetchSruPage(LOC_SRU_LCDB, buildSubjectCqlQuery(subject), 1, perSubject),
    ),
  ];

  const settled = await Promise.allSettled(tasks);
  const merged: LocSruRecord[] = [];
  let maxTotal = 0;
  let nextStart: number | null = null;

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    merged.push(...result.value.records);
    if (result.value.total && result.value.total > maxTotal) maxTotal = result.value.total;
    if (result.value.nextStart && !nextStart) nextStart = result.value.nextStart;
  }

  const curated = dedupeLocSruRecords(merged)
    .filter((record) => matchesLocSruCuratedScope(record, query))
    .slice(0, limit);

  const results = curated.map((record, index) => locSruRecordToClientPayload(record, query, index));
  const hasMore = Boolean(nextStart && curated.length >= limit);

  return {
    source: "loc-sru",
    database: LOC_SRU_LCDB,
    query,
    count: maxTotal || curated.length || null,
    displayedCount: results.length,
    nextOffset: hasMore ? offset + curated.length : null,
    hasMore,
    results,
    hlasStatus: "HLAS explain is published at lx2.loc.gov:210/HLAS but searchRetrieve currently returns “Database does not exist”. Using LCDB catalog instead.",
    error: null,
  };
}
