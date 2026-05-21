import { clampPageSize, SEARCH_DEFAULT_PAGE_SIZE } from "@/lib/search-pagination";

const LOC_SEARCH_URL = "https://www.loc.gov/search/";
const LOC_TIMEOUT_MS = 14_000;

export type LibraryOfCongressFormat =
  | "all"
  | "audio"
  | "video"
  | "photo"
  | "manuscript"
  | "map"
  | "film";

export type LibraryOfCongressSearchParams = {
  query: string;
  limit?: number;
  offset?: number;
  format?: LibraryOfCongressFormat | string;
  decolonialMode?: boolean;
};

export type LibraryOfCongressRecord = {
  id: string;
  source: "library-of-congress";
  sourceLabel: "Library of Congress";
  resultKind: "primary";
  type: string;
  title: string;
  description: string;
  creators: string[];
  year: string;
  country: string;
  region: string;
  language: string[];
  subjects: string[];
  mediaTypes: string[];
  imageUrl: string;
  audioUrl: string;
  videoUrl: string;
  url: string;
  rights: string;
  culturalSensitivity: string;
  openAccess: boolean;
  accessRestricted?: boolean;
  locItemId?: string;
  relevanceScore: number;
  decolonialSignal?: boolean;
  raw: unknown;
};

export type LibraryOfCongressSearchResponse = {
  source: "library-of-congress";
  query: string;
  count: number | null;
  displayedCount: number;
  nextOffset: number | null;
  hasMore: boolean;
  decolonialMode: boolean;
  format: string;
  results: LibraryOfCongressRecord[];
  error: string | null;
};

/** Decolonial scope terms — boost matches, never hard-filter Western records. */
export const LOC_DECOLONIAL_TERMS = [
  "africa", "african", "ghana", "nigeria", "kenya", "ethiopia", "south africa",
  "caribbean", "indigenous", "aboriginal", "native", "pacific", "latin america",
  "oral history", "folklore", "storytelling", "migration", "anti-colonial", "anticolonial",
  "colonialism", "black diaspora", "community memory", "language preservation", "radio", "recordings",
];

/** Media-focused terms for ranking boosts. */
export const LOC_MEDIA_TERMS = [
  "audio", "video", "oral history", "interviews", "field recordings", "films",
  "songs", "radio", "photographs", "photograph", "moving image", "sound recording",
];

const FORMAT_FACETS: Record<string, string> = {
  audio: "online_format:audio",
  video: "online_format:video",
  photo: "original_format:photo, print, drawing",
  manuscript: "original_format:manuscript/mixed material",
  map: "original_format:map",
  film: "original_format:film, video",
};

type LocResource = {
  url?: string;
  video?: string;
  video_stream?: string;
  audio?: string;
  image?: string;
  poster?: string;
  caption?: string;
};

type LocSearchItem = {
  id?: string;
  url?: string;
  title?: string;
  description?: string | string[];
  contributor?: string | string[];
  contributor_names?: string[];
  creator?: string;
  date?: string;
  dates?: string[];
  subject?: string[];
  language?: string | string[];
  original_format?: string[];
  online_format?: string[];
  image_url?: string[];
  resources?: LocResource[];
  access_restricted?: boolean | string;
  rights_advisory?: string;
  rights_information?: string;
  digitized?: boolean;
  item?: {
    subjects?: string[];
    format?: string[];
    genre?: string[];
    location?: string[];
    summary?: string;
    contributors?: string[];
    access_advisory?: string[];
    rights_advisory?: string;
  };
  locations?: string[];
};

type LocSearchJson = {
  results?: LocSearchItem[];
  pagination?: { total?: number; current?: number; perpage?: number };
  error?: string;
};

function foldText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function listify(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  return text ? [text] : [];
}

function extractItemId(item: LocSearchItem): string {
  const raw = String(item.id || item.url || "").trim();
  const match = raw.match(/\/item\/([^/?#]+)/i) || raw.match(/lccn\.loc\.gov\/([^/?#]+)/i);
  if (match) return match[1];
  return raw.replace(/[^\w.-]+/g, "-").slice(0, 80) || "unknown";
}

function pickImageUrl(item: LocSearchItem, resources: LocResource[]): string {
  const fromItem = listify(item.image_url)[0];
  if (fromItem) return fromItem;
  for (const resource of resources) {
    if (resource.image) return resource.image;
    if (resource.poster) return resource.poster;
  }
  return "";
}

function pickMediaUrls(resources: LocResource[]): { audioUrl: string; videoUrl: string } {
  let audioUrl = "";
  let videoUrl = "";
  for (const resource of resources) {
    if (!audioUrl && resource.audio) audioUrl = resource.audio;
    if (!videoUrl && resource.video) videoUrl = resource.video;
    if (!videoUrl && resource.video_stream) videoUrl = resource.video_stream;
  }
  return { audioUrl, videoUrl };
}

function inferMediaTypes(item: LocSearchItem): string[] {
  const values = unique([
    ...listify(item.original_format),
    ...listify(item.online_format),
    ...listify(item.item?.format),
    ...listify(item.item?.genre),
  ]);
  return values;
}

function mapRecordType(mediaTypes: string[], hasAudio: boolean, hasVideo: boolean, hasImage: boolean): string {
  const text = foldText(mediaTypes.join(" "));
  if (hasVideo || text.includes("video") || text.includes("moving image") || text.includes("film")) {
    return "Film / Video";
  }
  if (hasAudio || text.includes("audio") || text.includes("sound") || text.includes("recording")) {
    return "Audio / Recording";
  }
  if (text.includes("oral histor")) return "Oral History";
  if (text.includes("manuscript")) return "Manuscript";
  if (text.includes("map")) return "Map";
  if (hasImage || text.includes("photo") || text.includes("print") || text.includes("drawing")) {
    return "Photograph";
  }
  if (text.includes("web page")) return "Web Archive";
  return "Archival Record";
}

function gatherRecordText(item: LocSearchItem, subjects: string[], mediaTypes: string[]): string {
  const description = listify(item.description).join(" ");
  return foldText(
    [
      item.title,
      description,
      item.creator,
      ...listify(item.contributor),
      ...(item.contributor_names || []),
      ...(item.item?.contributors || []),
      ...subjects,
      ...mediaTypes,
      ...(item.item?.location || []),
      ...(item.locations || []),
      item.item?.summary,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function countTermHits(text: string, terms: string[]): number {
  return terms.reduce((count, term) => (text.includes(foldText(term)) ? count + 1 : count), 0);
}

function scoreLocRecord(
  item: LocSearchItem,
  query: string,
  options: { decolonialMode: boolean },
): { score: number; decolonialSignal: boolean } {
  const subjects = unique([
    ...listify(item.subject),
    ...listify(item.item?.subjects),
  ]);
  const mediaTypes = inferMediaTypes(item);
  const text = gatherRecordText(item, subjects, mediaTypes);
  const resources = Array.isArray(item.resources) ? item.resources : [];
  const { audioUrl, videoUrl } = pickMediaUrls(resources);
  const imageUrl = pickImageUrl(item, resources);

  let score = 0;
  const queryFold = foldText(query);
  const queryTokens = queryFold.split(/\s+/).filter((token) => token.length >= 2);
  if (queryFold && foldText(item.title).includes(queryFold)) score += 40;
  score += countTermHits(text, queryTokens) * 8;

  const decolonialHits = countTermHits(text, LOC_DECOLONIAL_TERMS);
  const decolonialSignal = decolonialHits > 0;
  if (decolonialSignal) score += 12 + decolonialHits * 4;
  if (options.decolonialMode && decolonialSignal) score += 18 + decolonialHits * 6;

  const mediaHits = countTermHits(text, LOC_MEDIA_TERMS);
  if (mediaHits) score += 8 + mediaHits * 3;
  if (audioUrl || videoUrl) score += 16;
  else if (imageUrl) score += 8;
  if (item.digitized === true || listify(item.online_format).length) score += 4;
  if (item.access_restricted === false) score += 2;

  return { score, decolonialSignal };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

function inferCountry(item: LocSearchItem, subjects: string[]): string {
  const locations = unique([...listify(item.item?.location), ...listify(item.locations)]);
  if (locations.length) return locations[0];
  for (const subject of subjects) {
    if (/--/.test(subject)) return subject.split("--")[0].trim();
  }
  return "";
}

function buildSearchUrl(params: {
  query: string;
  page: number;
  count: number;
  format?: string;
}): string {
  const search = new URLSearchParams({
    fo: "json",
    q: params.query,
    sp: String(params.page),
    c: String(params.count),
  });

  const formatKey = String(params.format || "all").toLowerCase();
  const facet = FORMAT_FACETS[formatKey];
  if (facet) search.set("fa", facet);

  const apiKey = process.env.LOC_API_KEY?.trim();
  if (apiKey) search.set("api_key", apiKey);

  return `${LOC_SEARCH_URL}?${search.toString()}`;
}

function mapLocItemToRecord(
  item: LocSearchItem,
  query: string,
  options: { decolonialMode: boolean },
): LibraryOfCongressRecord | null {
  const title = String(item.title || "").trim();
  if (!title) return null;

  const itemId = extractItemId(item);
  const subjects = unique([...listify(item.subject), ...listify(item.item?.subjects)]);
  const mediaTypes = inferMediaTypes(item);
  const resources = Array.isArray(item.resources) ? item.resources : [];
  const imageUrl = pickImageUrl(item, resources);
  const { audioUrl, videoUrl } = pickMediaUrls(resources);
  const creators = unique([
    ...listify(item.contributor_names),
    ...listify(item.contributor),
    ...listify(item.creator),
    ...listify(item.item?.contributors),
  ]);
  const year = String(item.date || listify(item.dates)[0] || "").slice(0, 10);
  const description =
    listify(item.description).join(" ") ||
    String(item.item?.summary || "").trim() ||
    subjects.slice(0, 3).join("; ");
  const country = inferCountry(item, subjects);
  const rights =
    String(item.rights_advisory || item.rights_information || item.item?.rights_advisory?.[0] || "").trim() ||
    String(item.item?.access_advisory?.[0] || "").trim() ||
    (item.access_restricted ? "Access may be restricted — check source record." : "Check rights at Library of Congress.");
  const accessRestricted = item.access_restricted === true || /restricted|permission/i.test(rights);
  const { score, decolonialSignal } = scoreLocRecord(item, query, options);

  return {
    id: `loc:${itemId}`,
    source: "library-of-congress",
    sourceLabel: "Library of Congress",
    resultKind: "primary",
    type: mapRecordType(mediaTypes, Boolean(audioUrl), Boolean(videoUrl), Boolean(imageUrl)),
    title,
    description,
    creators,
    year,
    country,
    region: country,
    language: unique(listify(item.language)),
    subjects,
    mediaTypes,
    imageUrl,
    audioUrl,
    videoUrl,
    url: String(item.url || item.id || `https://www.loc.gov/item/${itemId}/`),
    rights,
    culturalSensitivity: accessRestricted ? "Community Review Needed" : "Public",
    openAccess: item.access_restricted === false && Boolean(imageUrl || audioUrl || videoUrl),
    accessRestricted,
    locItemId: itemId,
    relevanceScore: score,
    decolonialSignal,
    raw: item,
  };
}

export async function searchLibraryOfCongressRecords(
  params: LibraryOfCongressSearchParams,
): Promise<LibraryOfCongressSearchResponse> {
  const query = String(params.query || "").trim();
  const limit = clampPageSize(Number(params.limit || SEARCH_DEFAULT_PAGE_SIZE));
  const offset = Math.max(0, Number(params.offset || 0));
  const format = String(params.format || "all").toLowerCase();
  const decolonialMode = Boolean(params.decolonialMode);
  const page = Math.floor(offset / limit) + 1;

  if (!query) {
    return {
      source: "library-of-congress",
      query,
      count: 0,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      decolonialMode,
      format,
      results: [],
      error: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOC_TIMEOUT_MS);

  try {
    const url = buildSearchUrl({ query, page, count: limit, format });
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        source: "library-of-congress",
        query,
        count: null,
        displayedCount: 0,
        nextOffset: null,
        hasMore: false,
        decolonialMode,
        format,
        results: [],
        error: `Library of Congress search failed (${response.status})`,
      };
    }

    const json = (await response.json()) as LocSearchJson;
    const total = Number(json.pagination?.total || 0) || null;
    const mapped = (json.results || [])
      .map((item) => mapLocItemToRecord(item, query, { decolonialMode }))
      .filter((item): item is LibraryOfCongressRecord => Boolean(item));

    mapped.sort((a, b) => b.relevanceScore - a.relevanceScore || a.title.localeCompare(b.title));

    const nextOffset = total && offset + mapped.length < total ? offset + mapped.length : null;
    const hasMore = nextOffset != null && mapped.length >= limit;

    return {
      source: "library-of-congress",
      query,
      count: total,
      displayedCount: mapped.length,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      decolonialMode,
      format,
      results: mapped,
      error: json.error ? String(json.error) : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library of Congress search failed";
    return {
      source: "library-of-congress",
      query,
      count: null,
      displayedCount: 0,
      nextOffset: null,
      hasMore: false,
      decolonialMode,
      format,
      results: [],
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}
