import {
  SMITHSONIAN_COLLECTIONS,
  smithsonianCollectionSearchUrl,
  type SmithsonianOpenCollection,
} from "@/lib/data/smithsonian-collections";
import { scoreSearchResult } from "@/lib/search/ranking";
import type { UnifiedSearchResult } from "@/lib/unified-search";

const SMITHSONIAN_SEARCH_API = "https://api.si.edu/openaccess/api/v1.0/search";
const SMITHSONIAN_CONTENT_API = "https://api.si.edu/openaccess/api/v1.0/content";
const SMITHSONIAN_CATEGORY_SEARCH_API =
  "https://api.si.edu/openaccess/api/v1.0/category";
const SMITHSONIAN_OPEN_ACCESS_HOME = "https://www.si.edu/openaccess";
const SMITHSONIAN_DEFAULT_ROWS = 25;
const SMITHSONIAN_MAX_ROWS = 1000;

export type SmithsonianSort = "relevancy" | "newest" | "updated" | "random";
export type SmithsonianSearchType = "edanmdm" | "ead_collection" | "ead_component" | "all";
export type SmithsonianRowGroup = "objects" | "archives";
export type SmithsonianCategory = "art_design" | "history_culture" | "science_technology";
export type SmithsonianMediaFilter = "image" | "audio" | "video" | "object" | "article" | "all";

export type SearchSmithsonianRecordsParams = {
  query: string;
  rows?: number;
  start?: number;
  sort?: SmithsonianSort;
  type?: SmithsonianSearchType;
  rowGroup?: SmithsonianRowGroup;
  category?: SmithsonianCategory | null;
  media?: SmithsonianMediaFilter;
};

export type SmithsonianRecordType =
  | "Object"
  | "Image"
  | "Audio"
  | "Video"
  | "Article"
  | "Archive record"
  | "Collection item";

export type SmithsonianRecordResult = {
  id: string;
  source: "smithsonian";
  sourceLabel: "Smithsonian Open Access";
  resultKind: "primary";
  type: SmithsonianRecordType;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  year?: string | number;
  creators: string[];
  culture?: string[];
  place?: string[];
  unitCode?: string;
  mediaTypes: string[];
  hasOnlineMedia: boolean;
  openAccess: boolean;
  relevanceScore: number;
  raw?: unknown;
};

export type SmithsonianRecordsSearchResponse = {
  source: "smithsonian";
  query: string;
  results: SmithsonianRecordResult[];
  count: number | null;
  displayedCount: number;
  nextStart: number | null;
  hasMore: boolean;
  error: string | null;
};

type EdanLabelContent = { label?: string; content?: string };
type EdanSearchRow = {
  id?: string;
  title?: string;
  unitCode?: string;
  type?: string;
  url?: string;
  content?: {
    descriptiveNonRepeating?: Record<string, unknown>;
    indexedStructured?: Record<string, string[] | undefined>;
    freetext?: Record<string, EdanLabelContent[] | undefined>;
  };
};

type EdanSearchApiResponse = {
  status?: number;
  response?: {
    rowCount?: number;
    rows?: EdanSearchRow[];
  };
  error?: { code?: string; message?: string };
};

type EdanContentApiResponse = {
  status?: number;
  response?: EdanSearchRow & { error?: string };
  error?: { code?: string; message?: string };
};

function getApiKey(): string | null {
  const key = process.env.SMITHSONIAN_API_KEY?.trim();
  return key || null;
}

function clampSmithsonianRows(value: number | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return SMITHSONIAN_DEFAULT_ROWS;
  return Math.min(Math.max(Math.floor(n), 1), SMITHSONIAN_MAX_ROWS);
}

function foldComparable(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ParsedRowContext = {
  title: string;
  description?: string;
  creators: string[];
  culture: string[];
  place: string[];
  objectTypes: string[];
  onlineMediaTypes: string[];
  mediaTypes: string[];
  year?: string | number;
  unitCode?: string;
  imageUrl?: string;
  hasOnlineMedia: boolean;
  isSilArticle: boolean;
  displayType: SmithsonianRecordType;
};

function readIndexedValues(
  indexed: Record<string, string[] | undefined>,
  key: string,
): string[] {
  const values = indexed[key];
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

function hasOnlineMediaBlock(dnr: Record<string, unknown>): boolean {
  const onlineMedia = dnr.online_media as { media?: unknown[]; mediaCount?: number } | undefined;
  if (!onlineMedia) return false;
  if (Number(onlineMedia.mediaCount) > 0) return true;
  return Array.isArray(onlineMedia.media) && onlineMedia.media.length > 0;
}

function isSilArticleIndex(
  unitCode: string | undefined,
  objectTypes: string[],
  mediaTypes: string[],
  onlineMediaTypes: string[],
  imageUrl?: string,
  hasOnlineMedia?: boolean,
): boolean {
  if (String(unitCode || "").toUpperCase() !== "SIL") return false;
  const haystack = [...objectTypes, ...mediaTypes, ...onlineMediaTypes]
    .join(" ")
    .toLowerCase();
  if (/article|articles|bibliographic|index|catalog|library record|publication|monograph|book/.test(
    haystack,
  )) {
    return true;
  }
  // SIL records without viewable media are usually library index entries, not museum objects.
  return !imageUrl && !hasOnlineMedia;
}

function onlineMediaTypeIncludes(onlineMediaTypes: string[], token: string): boolean {
  const pattern = new RegExp(token, "i");
  return onlineMediaTypes.some((value) => pattern.test(String(value || "")));
}

function inferDisplayType(
  row: EdanSearchRow,
  ctx: {
    objectTypes: string[];
    onlineMediaTypes: string[];
    mediaTypes: string[];
    imageUrl?: string;
    unitCode?: string;
    isSilArticle: boolean;
  },
): SmithsonianRecordType {
  const rowType = String(row.type || "").toLowerCase();
  if (rowType.startsWith("ead")) return "Archive record";
  if (ctx.isSilArticle) return "Article";

  if (onlineMediaTypeIncludes(ctx.onlineMediaTypes, "Images")) return "Image";
  if (onlineMediaTypeIncludes(ctx.onlineMediaTypes, "Audio")) return "Audio";
  if (onlineMediaTypeIncludes(ctx.onlineMediaTypes, "Video")) return "Video";

  const onlineJoined = ctx.onlineMediaTypes.join(" ").toLowerCase();
  if (/image|photograph/.test(onlineJoined) || ctx.imageUrl) return "Image";
  if (/audio|sound/.test(onlineJoined)) return "Audio";
  if (/video|film|moving/.test(onlineJoined)) return "Video";

  const objectJoined = ctx.objectTypes.join(" ").toLowerCase();
  const mediaJoined = ctx.mediaTypes.join(" ").toLowerCase();

  if (/photograph|image|negative|slide/.test(objectJoined) || /image|photograph/.test(mediaJoined)) {
    return "Image";
  }
  if (/audio|sound recording/.test(objectJoined) || /audio/.test(mediaJoined)) return "Audio";
  if (/video|film|moving image/.test(objectJoined) || /video|film/.test(mediaJoined)) return "Video";
  if (/manuscript|archive|correspondence|field notes/.test(objectJoined)) return "Archive record";
  if (/collection|series/.test(objectJoined)) return "Collection item";
  if (ctx.objectTypes.length > 0) return "Object";
  return "Object";
}

function computeSmithsonianRelevanceScore(
  record: {
    title: string;
    type: SmithsonianRecordType;
    imageUrl?: string;
    unitCode?: string;
    hasOnlineMedia: boolean;
    isSilArticle: boolean;
  },
  query: string,
  baseScore: number,
): number {
  let score = 0;
  const q = foldComparable(query);
  const title = foldComparable(record.title);

  if (q && title === q) score += 12;
  else if (q && title.includes(q)) score += 6;

  if (record.imageUrl) score += 8;
  if (record.hasOnlineMedia) score += 8;

  const unit = String(record.unitCode || "").toUpperCase();
  if (unit === "NMAFA") score += 10;
  else if (unit === "NMAAHC") score += 8;
  else if (unit === "NAA" || unit === "EEPA" || unit === "HSFA") score += 8;
  else if (unit === "FSG" || unit === "F|S" || unit === "NMNH") score += 8;

  const type = record.type.toLowerCase();
  if (type === "image" || type === "object" || type === "video" || type === "audio") {
    score += 6;
  }

  if (record.isSilArticle) score -= 4;

  // Keep EDAN text relevance as a tiebreaker so exact query matches still matter slightly.
  score += Math.min(Math.round(baseScore / 25), 12);

  return score;
}

function matchesMediaFilter(record: SmithsonianRecordResult, media: SmithsonianMediaFilter): boolean {
  if (!media || media === "all") return true;
  const type = record.type.toLowerCase();
  if (media === "image") return type === "image" || Boolean(record.imageUrl);
  if (media === "audio") return type === "audio";
  if (media === "video") return type === "video";
  if (media === "object") return type === "object";
  if (media === "article") return type === "article";
  return true;
}

function scoreSmithsonianRow(
  row: EdanSearchRow,
  title: string,
  description: string,
  query: string,
): number {
  const rankInput = {
    id: String(row.id || title),
    title,
    summary: description,
    abstract: description,
    description,
    tags: [
      ...(row.content?.indexedStructured?.topic || []),
      ...(row.content?.indexedStructured?.culture || []),
      ...(row.content?.indexedStructured?.place || []),
      row.unitCode || "",
    ],
    keywords: row.content?.indexedStructured?.topic || [],
    themes: row.content?.indexedStructured?.culture || [],
    source: "Smithsonian Open Access",
    institution: row.unitCode || "Smithsonian Institution",
    resultKind: "primary" as const,
    liveSourceHint: "smithsonian",
  };
  return scoreSearchResult(rankInput, query, { sourceKey: "smithsonian", isOpenAccess: true });
}

function readLabelContent(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value !== null && "content" in value) {
    return String((value as EdanLabelContent).content || "").trim();
  }
  return "";
}

function readFreetextValues(
  freetext: Record<string, EdanLabelContent[] | undefined> | undefined,
  key: string,
): string[] {
  const entries = freetext?.[key];
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => String(entry.content || "").trim()).filter(Boolean);
}

function parseEdanRowContext(row: EdanSearchRow): ParsedRowContext | null {
  const dnr = (row.content?.descriptiveNonRepeating || {}) as Record<string, unknown>;
  const indexed = row.content?.indexedStructured || {};
  const freetext = row.content?.freetext;

  const title =
    String(row.title || "").trim() ||
    readLabelContent(dnr.title) ||
    readFreetextValues(freetext, "title")[0];
  if (!title) return null;

  const creators = [
    ...readIndexedValues(indexed, "name"),
    ...readFreetextValues(freetext, "name"),
  ].filter(Boolean);
  const uniqueCreators = [...new Set(creators)].slice(0, 6);

  const culture = [
    ...new Set([
      ...readIndexedValues(indexed, "culture"),
      ...readFreetextValues(freetext, "culture"),
    ]),
  ].slice(0, 8);
  const place = [
    ...new Set([
      ...readIndexedValues(indexed, "place"),
      ...readFreetextValues(freetext, "place"),
    ]),
  ].slice(0, 8);
  const objectTypes = [
    ...readIndexedValues(indexed, "object_type"),
    ...readFreetextValues(freetext, "objectType"),
  ].filter(Boolean);

  const onlineMediaTypes = [
    ...readIndexedValues(indexed, "online_media_type"),
    ...readFreetextValues(freetext, "onlineMediaType"),
    ...(hasOnlineMediaBlock(dnr)
      ? (
          (
            dnr.online_media as {
              media?: Array<{ type?: string }>;
            }
          )?.media || []
        ).map((item) => item.type || "Images")
      : []),
  ].filter(Boolean);

  const mediaTypes = [...new Set([...objectTypes, ...onlineMediaTypes])].slice(0, 10);

  const descriptionParts = [
    ...readFreetextValues(freetext, "notes"),
    ...readFreetextValues(freetext, "description"),
    ...readFreetextValues(freetext, "summary"),
    ...readFreetextValues(freetext, "abstract"),
    ...readFreetextValues(freetext, "physicalDescription"),
    ...readFreetextValues(freetext, "topic").slice(0, 3),
  ].filter(Boolean);
  const description = descriptionParts.join(" · ") || undefined;

  const year =
    readIndexedValues(indexed, "date")[0] ||
    readFreetextValues(freetext, "date")[0] ||
    undefined;

  const imageUrl = pickImageUrl(dnr);
  const hasOnlineMedia = hasOnlineMediaBlock(dnr);
  const unitCode =
    row.unitCode || readLabelContent(dnr.unit_code) || readLabelContent(dnr.data_source) || undefined;
  const isSilArticle = isSilArticleIndex(
    unitCode,
    objectTypes,
    mediaTypes,
    onlineMediaTypes,
    imageUrl,
    hasOnlineMedia,
  );
  const displayType = inferDisplayType(row, {
    objectTypes,
    onlineMediaTypes,
    mediaTypes,
    imageUrl,
    unitCode,
    isSilArticle,
  });

  return {
    title,
    description,
    creators: uniqueCreators,
    culture,
    place,
    objectTypes,
    onlineMediaTypes,
    mediaTypes,
    year,
    unitCode,
    imageUrl,
    hasOnlineMedia,
    isSilArticle,
    displayType,
  };
}

function mapEdanRowToRecord(row: EdanSearchRow, query: string): SmithsonianRecordResult | null {
  const ctx = parseEdanRowContext(row);
  if (!ctx) return null;

  const dnr = (row.content?.descriptiveNonRepeating || {}) as Record<string, unknown>;
  const recordId = String(row.id || readLabelContent(dnr.record_ID) || row.url || ctx.title);
  const baseScore = scoreSmithsonianRow(row, ctx.title, ctx.description || "", query);
  const relevanceScore = computeSmithsonianRelevanceScore(
    {
      title: ctx.title,
      type: ctx.displayType,
      imageUrl: ctx.imageUrl,
      unitCode: ctx.unitCode,
      hasOnlineMedia: ctx.hasOnlineMedia,
      isSilArticle: ctx.isSilArticle,
    },
    query,
    baseScore,
  );

  return {
    id: `smithsonian:${recordId}`,
    source: "smithsonian",
    sourceLabel: "Smithsonian Open Access",
    resultKind: "primary",
    type: ctx.displayType,
    title: ctx.title,
    description: ctx.description,
    url: buildRecordUrl(row, dnr),
    imageUrl: ctx.imageUrl,
    year: ctx.year,
    creators: ctx.creators,
    culture: ctx.culture.length ? ctx.culture : undefined,
    place: ctx.place.length ? ctx.place : undefined,
    unitCode: ctx.unitCode,
    mediaTypes: ctx.mediaTypes,
    hasOnlineMedia: ctx.hasOnlineMedia,
    openAccess: true,
    relevanceScore,
    raw: row,
  };
}

function buildRecordUrl(row: EdanSearchRow, dnr: Record<string, unknown>): string {
  const content = (row.content || {}) as Record<string, unknown>;
  const recordLink =
    readLabelContent(dnr.record_link) ||
    (typeof content.record_link === "string" ? content.record_link.trim() : "");
  if (recordLink) return recordLink;
  const guid =
    readLabelContent(dnr.guid) ||
    (typeof content.guid === "string" ? content.guid.trim() : "");
  if (guid.startsWith("http")) return guid;
  const recordId = readLabelContent(dnr.record_ID);
  if (recordId) {
    return `https://www.si.edu/object/${encodeURIComponent(recordId)}`;
  }
  if (row.id) {
    return `https://www.si.edu/search?edan_q=${encodeURIComponent(row.id)}`;
  }
  if (row.url) {
    return `${SMITHSONIAN_OPEN_ACCESS_HOME}?query=${encodeURIComponent(row.url)}`;
  }
  return SMITHSONIAN_OPEN_ACCESS_HOME;
}

function pickImageUrl(dnr: Record<string, unknown>): string | undefined {
  const onlineMedia = dnr.online_media as
    | { media?: Array<{ thumbnail?: string; content?: string; resources?: Array<{ url?: string; label?: string }> }> }
    | undefined;
  const media = onlineMedia?.media?.[0];
  if (!media) return undefined;

  const thumbResource = media.resources?.find((resource) =>
    /thumbnail/i.test(String(resource.label || "")),
  );
  const raw =
    thumbResource?.url ||
    media.thumbnail ||
    media.content ||
    media.resources?.find((resource) => resource.url)?.url;

  if (!raw) return undefined;

  // Prefer lightweight thumbnail delivery when Smithsonian provides a full image URL.
  if (/ids\.si\.edu\/ids\/deliveryService\?id=([^&]+)/i.test(raw)) {
    const id = raw.match(/ids\.si\.edu\/ids\/deliveryService\?id=([^&]+)/i)?.[1];
    if (id) return `https://ids.si.edu/ids/download?id=${id}_thumb`;
  }
  if (/ids\.si\.edu\/ids\/download\?id=([^&]+)/i.test(raw) && !/_thumb/i.test(raw)) {
    const id = raw.match(/ids\.si\.edu\/ids\/download\?id=([^&]+)/i)?.[1];
    if (id) return `https://ids.si.edu/ids/download?id=${id}_thumb`;
  }
  return raw;
}

function isVisualMediaQuery(query: string): boolean {
  return /\b(photographs?|photography|photographic|images?|portraits?|pictures?|masks?|arts?|artifacts?|artefacts?|objects?|sculptures?|visuals?|galleries)\b/i.test(
    query,
  );
}

function buildImageSupplementQueries(query: string): string[] {
  const stripped = query
    .replace(
      /\b(photograph|photo|photos|photography|photographic|image|images|portrait|picture|pictures|visual|gallery)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  const queries = [];
  if (stripped) queries.push(stripped);
  const tokens = stripped.split(/\s+/).filter((token) => token.length > 2);
  const lead = tokens[0];
  if (lead && !queries.includes(`${lead} mask`)) queries.push(`${lead} mask`);
  if (lead && !queries.includes(`${lead} art`)) queries.push(`${lead} art`);
  if (!queries.length) queries.push(query);
  return [...new Set(queries)].slice(0, 3);
}

async function fetchEdanSearchRows(
  query: string,
  params: {
    apiKey: string;
    start: number;
    rows: number;
    sort: SmithsonianSort;
    type: SmithsonianSearchType;
    rowGroup: SmithsonianRowGroup;
    category?: SmithsonianCategory | null;
  },
): Promise<{ rows: EdanSearchRow[]; rowCount: number | null; error: string | null }> {
  const searchParams = new URLSearchParams({
    q: query,
    start: String(params.start),
    rows: String(params.rows),
    sort: params.sort,
    api_key: params.apiKey,
  });

  let requestUrl: string;
  if (params.category) {
    requestUrl = `${SMITHSONIAN_CATEGORY_SEARCH_API}/${encodeURIComponent(params.category)}/search?${searchParams.toString()}`;
  } else {
    searchParams.set("type", params.type);
    searchParams.set("row_group", params.rowGroup);
    requestUrl = `${SMITHSONIAN_SEARCH_API}?${searchParams.toString()}`;
  }

  const response = await fetch(requestUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  const payload = (await response.json().catch(() => ({}))) as EdanSearchApiResponse;
  if (!response.ok || payload.error) {
    return {
      rows: [],
      rowCount: null,
      error: payload.error?.message || `Smithsonian search failed (${response.status})`,
    };
  }
  return {
    rows: payload.response?.rows || [],
    rowCount: Number(payload.response?.rowCount ?? 0),
    error: null,
  };
}

function mergeImageSupplementResults(
  primary: SmithsonianRecordResult[],
  supplement: SmithsonianRecordResult[],
  limit: number,
): SmithsonianRecordResult[] {
  const seen = new Set(primary.map((row) => row.id));
  const extras = supplement
    .filter((row) => row.imageUrl && !seen.has(row.id))
    .slice(0, limit)
    .map((row) => ({ ...row, relevanceScore: row.relevanceScore + 12 }));

  if (!extras.length) return primary;

  const primaryHasImages = primary.some((row) => row.imageUrl);
  if (!primaryHasImages) {
    const previewCount = Math.min(4, extras.length);
    return [...extras.slice(0, previewCount), ...primary];
  }

  const merged = [...primary, ...extras].sort(
    (a, b) =>
      b.relevanceScore - a.relevanceScore ||
      Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
      a.title.localeCompare(b.title),
  );

  return merged;
}

const SMITHSONIAN_RERANK_POOL_CAP = 100;

/** Live EDAN item search — server-side only. Requires SMITHSONIAN_API_KEY. */
export async function searchSmithsonianRecords(
  params: SearchSmithsonianRecordsParams,
): Promise<SmithsonianRecordsSearchResponse> {
  const normalized = String(params.query || "").trim();
  const rows = clampSmithsonianRows(params.rows);
  const start = Math.max(0, Number(params.start) || 0);
  const sort: SmithsonianSort = params.sort || "relevancy";
  const type: SmithsonianSearchType = params.type || "all";
  const rowGroup: SmithsonianRowGroup = params.rowGroup || "objects";
  const category = params.category || null;
  const media: SmithsonianMediaFilter = params.media || "all";

  if (!normalized) {
    return {
      source: "smithsonian",
      query: normalized,
      results: [],
      count: 0,
      displayedCount: 0,
      nextStart: null,
      hasMore: false,
      error: "Missing query",
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      source: "smithsonian",
      query: normalized,
      results: [],
      count: 0,
      displayedCount: 0,
      nextStart: null,
      hasMore: false,
      error: "Smithsonian API key not configured.",
    };
  }

  const shouldExpandRankPool =
    sort === "relevancy" && media === "all" && start < SMITHSONIAN_RERANK_POOL_CAP;
  const apiStart = shouldExpandRankPool ? 0 : start;
  const apiRows = shouldExpandRankPool ? SMITHSONIAN_RERANK_POOL_CAP : rows;

  try {
    const batch = await fetchEdanSearchRows(normalized, {
      apiKey,
      start: apiStart,
      rows: apiRows,
      sort,
      type,
      rowGroup,
      category,
    });

    if (batch.error && !batch.rows.length) {
      return {
        source: "smithsonian",
        query: normalized,
        results: [],
        count: null,
        displayedCount: 0,
        nextStart: null,
        hasMore: false,
        error: batch.error,
      };
    }

    const total = batch.rowCount ?? 0;
    let ranked = batch.rows
      .map((row) => mapEdanRowToRecord(row, normalized))
      .filter((row): row is SmithsonianRecordResult => Boolean(row))
      .filter((row) => matchesMediaFilter(row, media))
      .sort(
        (a, b) =>
          b.relevanceScore - a.relevanceScore ||
          Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
          a.title.localeCompare(b.title),
      );

    if (
      start === 0 &&
      media === "all" &&
      type === "all" &&
      !category &&
      isVisualMediaQuery(normalized)
    ) {
      const supplementQueries = buildImageSupplementQueries(normalized);
      const imageRecords: SmithsonianRecordResult[] = [];
      for (const supplementQuery of supplementQueries) {
        const imageBatch = await fetchEdanSearchRows(supplementQuery, {
          apiKey,
          start: 0,
          rows: 20,
          sort,
          type: "edanmdm",
          rowGroup: "objects",
        });
        imageBatch.rows
          .map((row) => mapEdanRowToRecord(row, normalized))
          .filter((row): row is SmithsonianRecordResult => Boolean(row && row.imageUrl))
          .forEach((row) => imageRecords.push(row));
        if (imageRecords.length >= 8) break;
      }
      ranked = mergeImageSupplementResults(ranked, imageRecords, 8);
    }

    const mapped = shouldExpandRankPool
      ? ranked.slice(start, start + rows)
      : ranked.slice(0, rows);

    const nextStart = start + rows;
    const hasMore = total > 0 ? nextStart < total : mapped.length === rows;

    return {
      source: "smithsonian",
      query: normalized,
      results: mapped,
      count: Number.isFinite(total) ? total : null,
      displayedCount: mapped.length,
      nextStart: hasMore ? nextStart : null,
      hasMore,
      error: null,
    };
  } catch (error) {
    return {
      source: "smithsonian",
      query: normalized,
      results: [],
      count: null,
      displayedCount: 0,
      nextStart: null,
      hasMore: false,
      error: error instanceof Error ? error.message : "Smithsonian search failed",
    };
  }
}

/** Fetch a single EDAN record by id for in-app record pages and deep links. */
export async function fetchSmithsonianRecordByEdanId(
  edanId: string,
): Promise<SmithsonianRecordResult | null> {
  const normalized = String(edanId || "").trim();
  if (!normalized) return null;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${SMITHSONIAN_CONTENT_API}/${encodeURIComponent(normalized)}?api_key=${encodeURIComponent(apiKey)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      },
    );
    const payload = (await response.json().catch(() => ({}))) as EdanContentApiResponse;
    if (!response.ok || payload.error || payload.status !== 200) return null;

    const row = payload.response;
    if (!row || row.error || !String(row.id || "").trim()) return null;
    return mapEdanRowToRecord(row, normalized);
  } catch {
    return null;
  }
}

export type SearchSmithsonianOptions = {
  limit?: number;
  query?: string;
};

function inferRegion(countries: string[]): string {
  if (countries.includes("Pan-Africa")) return "Pan-Africa";
  if (countries.includes("Global")) return "Global";
  if (countries.length === 1) return countries[0];
  return countries.slice(0, 2).join(" / ");
}

export function mapSmithsonianCollectionToUnifiedResult(
  collection: SmithsonianOpenCollection,
  relevanceScore: number,
  query?: string,
): UnifiedSearchResult {
  return {
    id: `smithsonian:${collection.id}`,
    source: "smithsonian",
    sourceLabel: "Smithsonian Open Access",
    resultKind: "collection",
    type: collection.type,
    title: collection.title,
    description: collection.description,
    url: smithsonianCollectionSearchUrl(collection, query),
    subtitle: `${collection.unitCode} · ${collection.platform}`,
    authors: [collection.platform],
    abstract: collection.description,
    relevanceScore,
    unifiedRelevanceScore: relevanceScore,
    raw: collection,
  };
}

/** JSON-safe archive card fields for the library SPA. */
export function mapSmithsonianCollectionToClientPayload(
  collection: SmithsonianOpenCollection,
  relevanceScore: number,
  query?: string,
): Record<string, unknown> {
  const region = inferRegion(collection.countries);
  const searchUrl = smithsonianCollectionSearchUrl(collection, query);
  const tagPool = [
    collection.unitCode,
    ...collection.themes,
    ...collection.keywords,
    ...collection.mediaTypes,
    ...collection.countries,
  ];

  return {
    id: `smithsonian:${collection.id}`,
    title: collection.title,
    creator: collection.platform,
    summary: collection.description,
    abstract: collection.description,
    description: [collection.description],
    type: collection.type,
    cat: "Global open cultural collections",
    region,
    country: collection.countries[0] || "",
    countries: collection.countries,
    collection: "Smithsonian Open Access Collections",
    institution: "Smithsonian Institution",
    source: "Smithsonian Open Access",
    sourceName: "External Source · Smithsonian Open Access",
    sourceUrl: searchUrl,
    sourceActionLabel: "Search collection",
    sourceCategoryGroup: "global_open_collections",
    resultMode: "external_handoff",
    resultKind: "collection",
    liveSourceHint: "smithsonian",
    trustScore: 0.88,
    tags: tagPool.slice(0, 12),
    themes: collection.themes,
    keywords: collection.keywords,
    concepts: collection.themes.slice(0, 6),
    language: collection.languages,
    mediaTypes: collection.mediaTypes,
    unitCode: collection.unitCode,
    licence: collection.licence,
    accessLabel: "CC0 · External open collection",
    access: "CC0 · External open collection",
    rights: "CC0 1.0 metadata · Confirm image/person/cultural sensitivity at source",
    rightsLabel: "CC0 (confirm at source)",
    notes: [
      "Hosted externally by the Smithsonian Institution. Media is not stored on this archive.",
      "Metadata is CC0 1.0; still show source attribution and respect cultural/person/image sensitivity.",
      `Unit: ${collection.unitCode}. Home: ${collection.url}`,
    ],
    externalLinks: [
      { label: "Unit home", url: collection.url },
      { label: "Smithsonian Open Access", url: "https://www.si.edu/openaccess" },
    ],
    relevanceScore,
    unifiedRelevanceScore: relevanceScore,
    externalHostingDisclaimer: "Hosted externally by Smithsonian Open Access (CC0 metadata)",
  };
}

export function searchSmithsonianCollections(
  query: string,
  options: SearchSmithsonianOptions = {},
): { results: UnifiedSearchResult[]; clientResults: Record<string, unknown>[] } {
  const normalized = String(query || options.query || "").trim();
  const limit = Math.max(1, Math.min(options.limit ?? 8, SMITHSONIAN_COLLECTIONS.length));

  const scored = SMITHSONIAN_COLLECTIONS.map((collection) => {
    const rankInput = {
      id: `smithsonian:${collection.id}`,
      title: collection.title,
      summary: collection.description,
      abstract: collection.description,
      description: collection.description,
      tags: [
        collection.unitCode,
        ...collection.themes,
        ...collection.keywords,
        ...collection.mediaTypes,
      ],
      keywords: collection.keywords,
      themes: collection.themes,
      concepts: collection.themes,
      countries: collection.countries,
      country: collection.countries[0],
      region: inferRegion(collection.countries),
      language: collection.languages,
      source: "Smithsonian Open Access",
      institution: "Smithsonian Institution",
      collection: "Smithsonian Open Access Collections",
      type: collection.type,
      cat: "Global open cultural collections",
      sourceCategoryGroup: "global_open_collections",
      resultKind: "collection" as const,
      liveSourceHint: "smithsonian",
      resultMode: "external_handoff",
    };

    const relevanceScore = normalized
      ? scoreSearchResult(rankInput, normalized, { sourceKey: "smithsonian" })
      : 1;

    return { collection, relevanceScore };
  })
    .filter(({ relevanceScore }) => (normalized ? relevanceScore > 0 : true))
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore ||
        a.collection.title.localeCompare(b.collection.title),
    )
    .slice(0, limit);

  return {
    results: scored.map(({ collection, relevanceScore }) =>
      mapSmithsonianCollectionToUnifiedResult(collection, relevanceScore, normalized),
    ),
    clientResults: scored.map(({ collection, relevanceScore }) =>
      mapSmithsonianCollectionToClientPayload(collection, relevanceScore, normalized),
    ),
  };
}

export function listAllSmithsonianClientPayloads(): Record<string, unknown>[] {
  return SMITHSONIAN_COLLECTIONS.map((collection) =>
    mapSmithsonianCollectionToClientPayload(collection, 0),
  );
}
