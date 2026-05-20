import type {
  BookmarkRow,
  ReadingListItemRow,
  ReadingListRow,
} from "@/src/lib/member-workspace";

export type NormalizedSavedType =
  | "book"
  | "article"
  | "archive-record"
  | "image"
  | "audio"
  | "video"
  | "collection"
  | "external-source"
  | "record";

export type NormalizedSavedSource =
  | "archive"
  | "openalex"
  | "core"
  | "crossref"
  | "semantic-scholar"
  | "wikidata"
  | "aodl"
  | "smithsonian"
  | "trove"
  | "external";

export type SavedRecordSort =
  | "recent"
  | "title"
  | "year-newest"
  | "year-oldest"
  | "source"
  | "type"
  | "cited";

export type SavedRecordGroupMode =
  | "none"
  | "type"
  | "source"
  | "year"
  | "reading-list";

export type SavedRecordTypeFilter =
  | "all"
  | "books"
  | "articles"
  | "archive-records"
  | "images"
  | "audio"
  | "video"
  | "collections"
  | "external-sources"
  | "open-access";

export type SavedRecordSourceFilter = "all" | NormalizedSavedSource;

export type NormalizedSavedRecord = {
  normalizedType: NormalizedSavedType;
  normalizedSource: NormalizedSavedSource;
  mediaTypes: string[];
  sourceLabel: string;
  typeLabel: string;
  year: number | null;
  authorLabel: string;
  citedByCount: number | null;
  isOpenAccess: boolean;
};

export type SavedRecordWithLists = BookmarkRow & {
  normalized: NormalizedSavedRecord;
  listMemberships: ReadingListRow[];
};

export const TYPE_FILTERS: Array<{
  value: SavedRecordTypeFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "books", label: "Books" },
  { value: "articles", label: "Articles" },
  { value: "archive-records", label: "Archive records" },
  { value: "images", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "collections", label: "Collections" },
  { value: "external-sources", label: "External sources" },
  { value: "open-access", label: "Open access" },
];

export const SOURCE_FILTERS: Array<{
  value: SavedRecordSourceFilter;
  label: string;
}> = [
  { value: "all", label: "All sources" },
  { value: "archive", label: "Archive" },
  { value: "openalex", label: "OpenAlex" },
  { value: "core", label: "CORE" },
  { value: "crossref", label: "Crossref" },
  { value: "semantic-scholar", label: "Semantic Scholar" },
  { value: "wikidata", label: "Wikidata" },
  { value: "aodl", label: "AODL" },
  { value: "smithsonian", label: "Smithsonian" },
  { value: "trove", label: "Trove" },
];

export const SORT_OPTIONS: Array<{ value: SavedRecordSort; label: string }> = [
  { value: "recent", label: "Recently saved" },
  { value: "title", label: "Title A–Z" },
  { value: "year-newest", label: "Year (newest)" },
  { value: "year-oldest", label: "Year (oldest)" },
  { value: "source", label: "Source" },
  { value: "type", label: "Type" },
  { value: "cited", label: "Most cited" },
];

export const GROUP_OPTIONS: Array<{ value: SavedRecordGroupMode; label: string }> = [
  { value: "none", label: "Flat list" },
  { value: "type", label: "By type" },
  { value: "source", label: "By source" },
  { value: "year", label: "By year" },
  { value: "reading-list", label: "By reading list" },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function firstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function textList(...values: Array<unknown>) {
  const items: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) items.push(value.trim());
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string" && item.trim()) items.push(item.trim());
      });
    }
  }
  return Array.from(new Set(items));
}

function compactText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractYear(...values: Array<unknown>) {
  const text = firstText(...values);
  const match = text.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? Number(match[0]) : null;
}

function numericValue(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function sourceFromText(sourceText: string, recordId: string, sourceUrl: string): NormalizedSavedSource {
  const haystack = compactText(`${sourceText} ${recordId} ${sourceUrl}`);
  if (haystack.includes("openalex")) return "openalex";
  if (haystack.includes("semantic scholar") || haystack.includes("semanticscholar")) return "semantic-scholar";
  if (haystack.includes("wikidata") || haystack.includes("wikibase")) return "wikidata";
  if (haystack.includes("crossref") || haystack.includes("doi org")) return "crossref";
  if (haystack.includes("core ac") || haystack.includes(" core ")) return "core";
  if (haystack.includes("aodl") || haystack.includes("african online digital library")) return "aodl";
  if (haystack.includes("smithsonian") || haystack.includes("si.edu")) return "smithsonian";
  if (haystack.includes("trove") || haystack.includes("nla gov au")) return "trove";
  if (haystack.includes("archive") || haystack.includes("collection")) return "archive";
  if (sourceUrl) return "external";
  return "archive";
}

function sourceLabel(source: NormalizedSavedSource, rawSource: string) {
  if (rawSource) {
    if (/openalex/i.test(rawSource)) return "OpenAlex";
    if (/semantic scholar/i.test(rawSource)) return "Semantic Scholar";
    if (/wikidata/i.test(rawSource)) return "Wikidata";
    if (/crossref/i.test(rawSource)) return "Crossref";
    if (/core/i.test(rawSource)) return "CORE";
    if (/aodl|african online digital library/i.test(rawSource)) return "AODL";
    if (/smithsonian|si\.edu/i.test(rawSource)) return "Smithsonian Open Access";
    if (/trove/i.test(rawSource)) return "Trove";
    if (source === "archive") return rawSource;
  }

  const labels: Record<NormalizedSavedSource, string> = {
    archive: "Archive",
    openalex: "OpenAlex",
    core: "CORE",
    crossref: "Crossref",
    "semantic-scholar": "Semantic Scholar",
    wikidata: "Wikidata",
    aodl: "AODL",
    smithsonian: "Smithsonian Open Access",
    trove: "Trove",
    external: "External source",
  };
  return labels[source];
}

function typeFromText(
  typeText: string,
  source: NormalizedSavedSource,
  mediaTypes: string[],
  resultKind: string,
): NormalizedSavedType {
  const haystack = compactText(`${typeText} ${mediaTypes.join(" ")} ${resultKind}`);
  if (haystack.includes("collection")) return "collection";
  if (haystack.includes("image") || haystack.includes("photograph") || haystack.includes("picture")) return "image";
  if (haystack.includes("audio") || haystack.includes("sound")) return "audio";
  if (haystack.includes("video") || haystack.includes("film") || haystack.includes("moving image")) return "video";
  if (haystack.includes("book") || haystack.includes("monograph")) return "book";
  if (haystack.includes("article") || haystack.includes("journal") || haystack.includes("paper")) return "article";
  if (haystack.includes("entity") || source === "wikidata") return "external-source";
  if (source === "openalex" || source === "core" || source === "crossref" || source === "semantic-scholar") {
    return "article";
  }
  if (source === "external") return "external-source";
  return "archive-record";
}

function typeLabel(type: NormalizedSavedType) {
  const labels: Record<NormalizedSavedType, string> = {
    book: "Book",
    article: "Article",
    "archive-record": "Archive record",
    image: "Image",
    audio: "Audio",
    video: "Video",
    collection: "Collection",
    "external-source": "External source",
    record: "Record",
  };
  return labels[type];
}

function openAccessFromMetadata(metadata: Record<string, unknown>, sourceUrl: string) {
  const status = compactText(
    firstText(
      metadata.open_access_status,
      metadata.oa_status,
      metadata.accessLabel,
      metadata.access_label,
      metadata.licence,
      metadata.license,
      metadata.rightsLabel,
    ),
  );
  return Boolean(
    metadata.isOpenAccess === true ||
      metadata.is_open_access === true ||
      metadata.openAccess === true ||
      firstText(metadata.openAccessUrl, metadata.open_access_url) ||
      status.includes("open access") ||
      status.includes("public domain") ||
      /doab|openaccess|open-access/i.test(sourceUrl),
  );
}

export function normalizeSavedRecord(
  record: Pick<
    BookmarkRow | ReadingListItemRow,
    | "record_id"
    | "record_source"
    | "record_source_url"
    | "record_type"
    | "record_year"
    | "record_metadata"
  > & { record_author?: string | null },
): NormalizedSavedRecord {
  const metadata = asRecord(record.record_metadata);
  const rawSource = firstText(
    metadata.normalizedSource,
    metadata.sourceLabel,
    metadata.source_label,
    record.record_source,
    metadata.source,
    metadata.source_name,
    metadata.publisher,
    metadata.archive,
    metadata.collection,
    metadata.sourceId,
    metadata.source_id,
  );
  const sourceUrl = firstText(record.record_source_url, metadata.source_url, metadata.sourceUrl, metadata.url);
  const normalizedSource = sourceFromText(rawSource, record.record_id, sourceUrl);
  const mediaTypes = textList(
    metadata.mediaTypes,
    metadata.media_types,
    metadata.mediaType,
    metadata.media_type,
    metadata.format,
    metadata.formats,
  ).map((item) => item.toLowerCase());
  const normalizedType = typeFromText(
    firstText(
      metadata.normalizedType,
      record.record_type,
      metadata.type,
      metadata.work_type,
      metadata.workType,
      metadata.entity,
      metadata.entity_type,
      metadata.recordTypeLabel,
      metadata.record_type_label,
    ),
    normalizedSource,
    mediaTypes,
    firstText(metadata.resultKind, metadata.result_kind, metadata.resultMode, metadata.result_mode),
  );

  return {
    normalizedType,
    normalizedSource,
    mediaTypes,
    sourceLabel: firstText(metadata.sourceLabel, metadata.source_label) || sourceLabel(normalizedSource, rawSource),
    typeLabel: typeLabel(normalizedType),
    year: extractYear(record.record_year, metadata.year, metadata.publication_year, metadata.publicationDate, metadata.date),
    authorLabel: firstText(
      record.record_author,
      metadata.author,
      metadata.creator,
      metadata.contributor,
      metadata.authors,
      metadata.creators,
    ),
    citedByCount: numericValue(metadata.citedByCount, metadata.cited_by_count, metadata.citation_count),
    isOpenAccess: openAccessFromMetadata(metadata, sourceUrl),
  };
}

export function withSavedRecordMemberships(
  bookmarks: BookmarkRow[],
  readingLists: ReadingListRow[],
  readingListItems: ReadingListItemRow[],
) {
  const listsById = new Map(readingLists.map((list) => [list.id, list]));
  const listIdsByRecordId = new Map<string, Set<string>>();

  readingListItems.forEach((item) => {
    const listIds = listIdsByRecordId.get(item.record_id) ?? new Set<string>();
    listIds.add(item.reading_list_id);
    listIdsByRecordId.set(item.record_id, listIds);
  });

  return bookmarks.map((bookmark): SavedRecordWithLists => {
    const listMemberships = Array.from(listIdsByRecordId.get(bookmark.record_id) ?? [])
      .map((id) => listsById.get(id))
      .filter((list): list is ReadingListRow => Boolean(list));

    return {
      ...bookmark,
      normalized: normalizeSavedRecord(bookmark),
      listMemberships,
    };
  });
}

export function filterSavedRecords(
  records: SavedRecordWithLists[],
  typeFilter: SavedRecordTypeFilter,
  sourceFilter: SavedRecordSourceFilter,
) {
  return records.filter((record) => {
    const type = record.normalized.normalizedType;
    const typeMatch =
      typeFilter === "all" ||
      (typeFilter === "books" && type === "book") ||
      (typeFilter === "articles" && type === "article") ||
      (typeFilter === "archive-records" && type === "archive-record") ||
      (typeFilter === "images" && type === "image") ||
      (typeFilter === "audio" && type === "audio") ||
      (typeFilter === "video" && type === "video") ||
      (typeFilter === "collections" && type === "collection") ||
      (typeFilter === "external-sources" && type === "external-source") ||
      (typeFilter === "open-access" && record.normalized.isOpenAccess);

    const sourceMatch =
      sourceFilter === "all" || record.normalized.normalizedSource === sourceFilter;

    return typeMatch && sourceMatch;
  });
}

export function sortSavedRecords(records: SavedRecordWithLists[], sort: SavedRecordSort) {
  return [...records].sort((a, b) => {
    if (sort === "title") {
      return (a.record_title || a.record_id).localeCompare(b.record_title || b.record_id);
    }
    if (sort === "year-newest") {
      return (b.normalized.year ?? -Infinity) - (a.normalized.year ?? -Infinity);
    }
    if (sort === "year-oldest") {
      return (a.normalized.year ?? Infinity) - (b.normalized.year ?? Infinity);
    }
    if (sort === "source") {
      return a.normalized.sourceLabel.localeCompare(b.normalized.sourceLabel);
    }
    if (sort === "type") {
      return a.normalized.typeLabel.localeCompare(b.normalized.typeLabel);
    }
    if (sort === "cited") {
      return (b.normalized.citedByCount ?? -1) - (a.normalized.citedByCount ?? -1);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function searchSavedRecords(records: SavedRecordWithLists[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return records;

  return records.filter((record) => {
    const haystack = [
      record.record_title,
      record.record_id,
      record.note,
      record.normalized.authorLabel,
      record.normalized.sourceLabel,
      record.normalized.typeLabel,
      record.normalized.year ? String(record.normalized.year) : "",
      ...record.listMemberships.map((list) => list.title),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
}

export type SavedRecordGroup = {
  key: string;
  label: string;
  records: SavedRecordWithLists[];
};

export function groupSavedRecords(
  records: SavedRecordWithLists[],
  group: SavedRecordGroupMode,
  readingLists: ReadingListRow[],
): SavedRecordGroup[] {
  if (group === "none") {
    return records.length ? [{ key: "all", label: "", records }] : [];
  }

  if (group === "reading-list") {
    const buckets = new Map<string, SavedRecordGroup>();
    buckets.set("unsorted", { key: "unsorted", label: "Not in a reading list", records: [] });

    readingLists.forEach((list) => {
      buckets.set(list.id, { key: list.id, label: list.title, records: [] });
    });

    records.forEach((record) => {
      if (!record.listMemberships.length) {
        buckets.get("unsorted")?.records.push(record);
        return;
      }
      record.listMemberships.forEach((list) => {
        buckets.get(list.id)?.records.push(record);
      });
    });

    return Array.from(buckets.values()).filter((bucket) => bucket.records.length > 0);
  }

  const buckets = new Map<string, SavedRecordGroup>();

  records.forEach((record) => {
    let key = "";
    let label = "";

    if (group === "type") {
      key = record.normalized.normalizedType;
      label = record.normalized.typeLabel;
    } else if (group === "source") {
      key = record.normalized.normalizedSource;
      label = record.normalized.sourceLabel;
    } else if (group === "year") {
      key = record.normalized.year ? String(record.normalized.year) : "unknown";
      label = record.normalized.year ? String(record.normalized.year) : "Year unknown";
    }

    const bucket = buckets.get(key) ?? { key, label, records: [] };
    bucket.records.push(record);
    buckets.set(key, bucket);
  });

  const groups = Array.from(buckets.values());

  if (group === "year") {
    return groups.sort((a, b) => {
      if (a.key === "unknown") return 1;
      if (b.key === "unknown") return -1;
      return Number(b.key) - Number(a.key);
    });
  }

  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

export function validTypeFilter(value: unknown): SavedRecordTypeFilter {
  return TYPE_FILTERS.some((item) => item.value === value)
    ? (value as SavedRecordTypeFilter)
    : "all";
}

export function validSourceFilter(value: unknown): SavedRecordSourceFilter {
  return SOURCE_FILTERS.some((item) => item.value === value)
    ? (value as SavedRecordSourceFilter)
    : "all";
}

export function validSavedSort(value: unknown): SavedRecordSort {
  return SORT_OPTIONS.some((item) => item.value === value)
    ? (value as SavedRecordSort)
    : "recent";
}

export function validGroupMode(value: unknown): SavedRecordGroupMode {
  return GROUP_OPTIONS.some((item) => item.value === value)
    ? (value as SavedRecordGroupMode)
    : "none";
}
