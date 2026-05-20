import type { ExternalArchiveRecord, ExternalSourceStatus } from "./external-record-types";
import { searchDoab } from "./adapters/doab";
import { buildExternalSourceHandoffs } from "./source-handoffs";

function readEnvBool(key: string, defaultValue: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return defaultValue;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

function readEnvInt(key: string, def: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
}

function clampText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normUrl(u: string): string {
  return u.trim().replace(/\/+$/, "").toLowerCase();
}

function dedupeExternalRecords(records: ExternalArchiveRecord[]): ExternalArchiveRecord[] {
  const seen = new Map<string, ExternalArchiveRecord>();
  const rank = (r: ExternalArchiveRecord) => {
    if (r.id.startsWith("extrec-")) return 3;
    if (r.id.startsWith("cached-")) return 3;
    if (r.sourceId === "doab") return 2;
    return 1;
  };

  for (const r of records) {
    const doi = (r.doi || "").trim().toLowerCase();
    const isbn = (r.isbn || [])
      .map((x) => x.replace(/[^0-9X]/gi, ""))
      .filter(Boolean)
      .sort()
      .join(",");
    const url = normUrl(r.sourceUrl || "");
    const key =
      doi ||
      (isbn ? `isbn:${isbn}` : "") ||
      (url ? `url:${url}` : "") ||
      `title:${r.title.trim().toLowerCase()}|${r.sourceId}`;

    const prev = seen.get(key);
    if (!prev || rank(r) > rank(prev)) seen.set(key, r);
  }
  return [...seen.values()];
}

type DbExternalRecord = {
  id: string;
  source_id: string;
  external_id: string | null;
  title: string;
  creator: string | null;
  contributors: string[] | null;
  description: string | null;
  publisher: string | null;
  publication_date: string | null;
  source_url: string;
  download_url: string | null;
  licence: string | null;
  licence_uri: string | null;
  rights_label: string;
  licence_label: string | null;
  access_label: string;
  review_label: string;
  caution: string | null;
  isbn: string[] | null;
  doi: string | null;
  subjects: string[] | null;
  language: string[] | null;
  region: string | null;
  country: string | null;
  metadata_licence: string | null;
  metadata_json: unknown;
};

function mapDbRowToExternal(row: DbExternalRecord, sourceLabel: string, sourceType: string): ExternalArchiveRecord {
  return {
    id: `extrec-${row.id}`,
    externalId: row.external_id || row.id,
    sourceId: row.source_id,
    sourceLabel,
    sourceType,
    title: row.title,
    creator: row.creator || undefined,
    contributors: row.contributors || undefined,
    description: row.description || undefined,
    publisher: row.publisher || undefined,
    publicationDate: row.publication_date || undefined,
    sourceUrl: row.source_url,
    downloadUrl: row.download_url || undefined,
    licence: row.licence || undefined,
    licenceUri: row.licence_uri || undefined,
    rightsLabel: row.rights_label,
    licenceLabel: row.licence_label || undefined,
    accessLabel: row.access_label,
    reviewLabel: row.review_label,
    caution: row.caution || undefined,
    isbn: row.isbn || undefined,
    doi: row.doi || undefined,
    subjects: row.subjects || undefined,
    language: row.language || undefined,
    region: row.region || undefined,
    country: row.country || undefined,
    metadataLicence: row.metadata_licence || undefined,
    metadataJson: row.metadata_json,
    resultMode: "external_record",
    recordTypeLabel: "External discovery record",
  };
}

async function fetchCachedExternalRecords(query: string): Promise<ExternalArchiveRecord[]> {
  if (!readEnvBool("EXTERNAL_SOURCE_CACHE_ENABLED", false)) return [];
  try {
    const { createClient } = await import("@/src/lib/supabase/server");
    const supabase = await createClient();
    const q = query.trim();
    if (!q) return [];

    const safe = q.replace(/[%_,]/g, " ").trim();
    if (!safe) return [];

    const { data: rows, error } = await supabase
      .from("external_records")
      .select(
        "id, source_id, external_id, title, creator, contributors, description, publisher, publication_date, source_url, download_url, licence, licence_uri, rights_label, licence_label, access_label, review_label, caution, isbn, doi, subjects, language, region, country, metadata_licence, metadata_json"
      )
      .eq("visible_in_discovery", true)
      .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
      .limit(readEnvInt("EXTERNAL_SOURCE_MAX_RESULTS", 20));

    if (error || !rows?.length) return [];

    const { data: sources } = await supabase
      .from("external_sources")
      .select("id, label, source_type")
      .eq("enabled", true);

    const labelById = new Map((sources || []).map((s) => [s.id, s.label as string]));
    const typeById = new Map((sources || []).map((s) => [s.id, s.source_type as string]));

    return (rows as DbExternalRecord[]).map((row) =>
      mapDbRowToExternal(
        row,
        labelById.get(row.source_id) || row.source_id,
        typeById.get(row.source_id) || "open_access_books"
      )
    );
  } catch {
    return [];
  }
}

export type ExternalSearchResult = {
  externalRecords: ExternalArchiveRecord[];
  handoffRecords: ExternalArchiveRecord[];
  sourceStatuses: ExternalSourceStatus[];
};

/**
 * Orchestrates rights-safe external discovery: cache (optional) → DOAB → registry handoffs.
 * Intended for server route handlers; failures are isolated per tier.
 */
export async function searchExternalSources(query: string): Promise<ExternalSearchResult> {
  const trimmed = query.trim();
  const max = Math.min(Math.max(readEnvInt("EXTERNAL_SOURCE_MAX_RESULTS", 20), 1), 50);
  const statuses: ExternalSourceStatus[] = [];

  if (!trimmed) {
    return { externalRecords: [], handoffRecords: [], sourceStatuses: [] };
  }

  let cached: ExternalArchiveRecord[] = [];
  try {
    cached = await fetchCachedExternalRecords(trimmed);
    statuses.push({
      id: "cache",
      label: "Cached external records",
      state: cached.length ? "ok" : "empty",
      count: cached.length,
    });
  } catch {
    statuses.push({
      id: "cache",
      label: "Cached external records",
      state: "skipped",
      message: "Cache unavailable",
    });
  }

  let doab: ExternalArchiveRecord[] = [];
  if (readEnvBool("EXTERNAL_SOURCE_DOAB_ENABLED", true)) {
    try {
      doab = await searchDoab(trimmed, Math.min(max, 20));
      statuses.push({
        id: "doab",
        label: "Directory of Open Access Books",
        state: doab.length ? "ok" : "empty",
        count: doab.length,
      });
    } catch (e) {
      statuses.push({
        id: "doab",
        label: "Directory of Open Access Books",
        state: "unavailable",
        message: e instanceof Error ? e.message : "DOAB unavailable",
      });
    }
  } else {
    statuses.push({
      id: "doab",
      label: "Directory of Open Access Books",
      state: "skipped",
      message: "Disabled by configuration",
    });
  }

  const mergedRecords = dedupeExternalRecords([...cached, ...doab]).slice(0, max);

  let handoffs: ExternalArchiveRecord[] = [];
  try {
    handoffs = buildExternalSourceHandoffs(trimmed);
    statuses.push({
      id: "handoffs",
      label: "Open access & OER source handoffs",
      state: handoffs.length ? "ok" : "empty",
      count: handoffs.length,
    });
  } catch (e) {
    statuses.push({
      id: "handoffs",
      label: "Open access & OER source handoffs",
      state: "fail",
      message: e instanceof Error ? e.message : "Handoff build failed",
    });
  }

  return {
    externalRecords: mergedRecords,
    handoffRecords: handoffs,
    sourceStatuses: statuses,
  };
}

/** JSON-safe client payloads for the archive search UI. */
export function mapExternalArchiveRecordToClientPayload(r: ExternalArchiveRecord): Record<string, unknown> {
  const isHandoff = r.resultMode === "external_handoff";
  const summary = r.description ? clampText(r.description, 420) : "";
  const typeLabel = r.recordTypeLabel || (isHandoff ? "Source handoff" : "External discovery record");

  const sourceLineName =
    r.sourceId === "doab"
      ? "External Source · DOAB"
      : `External Source · ${r.sourceLabel}`;

  const notes: string[] = [];
  if (r.caution) notes.push(r.caution);
  if (r.metadataLicence && r.sourceId === "doab") {
    notes.push(
      `DOAB catalogue metadata is openly available under ${r.metadataLicence}. Book reuse rights follow each record’s licence fields.`
    );
  }
  if (isHandoff) {
    notes.push("This is a discovery handoff to the listed platform. Rights must be confirmed at the destination.");
  }

  const subjectTags = [...(r.subjects || []).slice(0, 12)].map((s) => String(s || "").trim()).filter(Boolean);
  const conceptSeed = subjectTags.slice(0, 8);
  const clientSourceType =
    r.sourceType === "open_access_books" || r.sourceType === "open_textbook" || r.sourceType === "oer"
      ? "open_access"
      : r.sourceType;

  return {
    id: r.id,
    title: r.title,
    creator: r.creator || "Unknown creator",
    summary,
    abstract: summary,
    description: r.description ? [clampText(r.description, 600)] : [],
    type: typeLabel,
    cat: isHandoff ? "Open access source handoffs" : "Open access & external discovery",
    region: r.region || "Global / Comparative",
    country: r.country || "",
    collection: isHandoff ? "Source handoffs" : "Open Access Books & OER",
    institution: r.sourceLabel,
    source: r.sourceLabel,
    sourceName: sourceLineName,
    sourceUrl: r.sourceUrl,
    sourceActionLabel: "View source",
    sourceType: clientSourceType,
    sourceCategoryGroup: r.sourceCategoryGroup || "external_records",
    period: r.publicationDate || "",
    tags: subjectTags.slice(0, 8),
    concepts: conceptSeed,
    themes: conceptSeed,
    rights: [r.rightsLabel, r.licenceLabel, r.accessLabel, r.reviewLabel].filter(Boolean).join(" · "),
    rightsLabel: r.rightsLabel,
    accessLabel: r.accessLabel,
    access: r.accessLabel,
    accessType: r.accessLabel,
    reviewLabel: r.reviewLabel,
    reviewStatus: r.reviewLabel,
    licenceLabel: r.licenceLabel,
    externalRightsRow: {
      rights: r.rightsLabel,
      access: r.accessLabel,
      review: r.reviewLabel,
    },
    openAccessRightsStrict: readEnvBool("EXTERNAL_SOURCE_STRICT_RIGHTS", true),
    doi: r.doi,
    isbn: r.isbn,
    subjects: r.subjects,
    language: r.language,
    downloadUrl: r.downloadUrl,
    pdfUrl: r.downloadUrl,
    provenance: "External discovery record (metadata only). Not a hosted archive full text.",
    notes,
    recordIdentifier: r.externalId,
    archiveIdentifier: r.id,
    resultMode: isHandoff ? "external_handoff" : "live",
    trustScore: isHandoff ? 0.55 : 0.78,
    liveSourceHint: "openAccessPack",
    metadataLicenceNote: r.metadataLicence,
  };
}

export function defaultExternalOpenAccessNotices() {
  return {
    externalRights:
      "External source records are discovery links. Rights and reuse conditions must be checked at the original source.",
    doabMetadata:
      "Metadata from DOAB is openly available under CC0. Book reuse rights are determined by each record’s licence.",
  };
}
