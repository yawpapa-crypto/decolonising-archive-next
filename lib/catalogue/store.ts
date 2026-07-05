import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type {
  CatalogueEvidence,
  CatalogueRecord,
  CatalogueStats,
  CatalogueTaxonomyRow,
  CatalogueVerification,
  CatalogueVerificationTask,
  SourceRegistryRow,
  CatalogueFilterParams,
  EvidenceStatus,
} from "./types";
import { CATALOGUE_BUILD_ID } from "./types";
import { parseCsv } from "./csv-parser";

const DATA_DIR = join(process.cwd(), "data", "catalogue");

const FILES = {
  records: "catalogue-records.json",
  verification: "catalogue-verification.json",
  evidence: "catalogue-evidence.json",
  taxonomy: "catalogue-taxonomy.json",
  sourceRegistry: "catalogue-source-registry.json",
  importReport: "import-report.json",
  tasks: "catalogue-verification-tasks.json",
} as const;

let verificationCache: CatalogueVerification[] | null = null;
let evidenceCache: CatalogueEvidence[] | null = null;

function readJson<T>(filename: string, fallback: T): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(filename: string, data: unknown): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2) + "\n");
}

export function catalogueDataExists(): boolean {
  return existsSync(join(DATA_DIR, FILES.records));
}

export function loadCatalogueRecords(): CatalogueRecord[] {
  return readJson<CatalogueRecord[]>(FILES.records, []);
}

export function loadCatalogueVerification(): CatalogueVerification[] {
  if (!verificationCache) {
    verificationCache = readJson<CatalogueVerification[]>(FILES.verification, []);
  }
  return verificationCache;
}

export function loadCatalogueEvidence(): CatalogueEvidence[] {
  if (!evidenceCache) {
    evidenceCache = readJson<CatalogueEvidence[]>(FILES.evidence, []);
  }
  return evidenceCache;
}

export function loadCatalogueTaxonomy(): CatalogueTaxonomyRow[] {
  return readJson<CatalogueTaxonomyRow[]>(FILES.taxonomy, []);
}

export function loadSourceRegistry(): SourceRegistryRow[] {
  return readJson<SourceRegistryRow[]>(FILES.sourceRegistry, []);
}

export function saveCatalogueBundle(bundle: {
  records: CatalogueRecord[];
  verification: CatalogueVerification[];
  evidence: CatalogueEvidence[];
  taxonomy: CatalogueTaxonomyRow[];
  sourceRegistry: SourceRegistryRow[];
  importReport: Record<string, unknown>;
}): void {
  writeJson(FILES.records, bundle.records);
  writeJson(FILES.verification, bundle.verification);
  writeJson(FILES.evidence, bundle.evidence);
  writeJson(FILES.taxonomy, bundle.taxonomy);
  writeJson(FILES.sourceRegistry, bundle.sourceRegistry);
  writeJson(FILES.importReport, bundle.importReport);
  verificationCache = bundle.verification;
  evidenceCache = bundle.evidence;
}

export function getCatalogueRecord(id: string): CatalogueRecord | null {
  return loadCatalogueRecords().find((r) => r.id === id) ?? null;
}

export function getVerificationForRecord(recordId: string): CatalogueVerification | null {
  return loadCatalogueVerification().find((v) => v.catalogueRecordId === recordId) ?? null;
}

export function getEvidenceForRecord(recordId: string): CatalogueEvidence[] {
  return loadCatalogueEvidence().filter((e) => e.catalogueRecordId === recordId);
}

export function computeCatalogueStats(records?: CatalogueRecord[]): CatalogueStats {
  const all = records ?? loadCatalogueRecords();
  const publicRecords = all.filter((r) => r.publicVisibility);
  const byEvidenceStatus: Record<string, number> = {};
  for (const r of publicRecords) {
    byEvidenceStatus[r.evidenceStatus] = (byEvidenceStatus[r.evidenceStatus] ?? 0) + 1;
  }

  const byPeriod: Record<string, number> = {};
  const byVisual: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  for (const r of publicRecords) {
    if (r.periodLabel) byPeriod[r.periodLabel] = (byPeriod[r.periodLabel] ?? 0) + 1;
    if (r.visualSystemLabel) byVisual[r.visualSystemLabel] = (byVisual[r.visualSystemLabel] ?? 0) + 1;
    if (r.region) byRegion[r.region] = (byRegion[r.region] ?? 0) + 1;
  }

  return {
    buildId: CATALOGUE_BUILD_ID,
    totalRecords: publicRecords.length,
    verifiedCount: publicRecords.filter((r) => r.evidenceStatus === "verified").length,
    partiallyVerifiedCount: 0,
    disputedCount: 0,
    communityReviewCount: publicRecords.filter((r) => r.communityAuthorityRequired).length,
    rightsReviewCount: publicRecords.filter((r) =>
      ["unassessed", "permission_required", "restricted"].includes(r.rightsStatus ?? ""),
    ).length,
    historicalPeriodCount: Object.keys(byPeriod).length,
    visualSystemCount: Object.keys(byVisual).length,
    byPeriod,
    byVisualSystem: byVisual,
    byRegion,
    byEvidenceStatus,
  };
}

function recordSortKey(r: CatalogueRecord): number {
  const m = r.id.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

export function filterCatalogueRecords(params: CatalogueFilterParams): {
  items: CatalogueRecord[];
  total: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 24));
  let items = loadCatalogueRecords().filter((r) => r.publicVisibility);

  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    items = items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.creatorOrAuthority?.toLowerCase().includes(q) ?? false) ||
        (r.region?.toLowerCase().includes(q) ?? false) ||
        (r.locality?.toLowerCase().includes(q) ?? false) ||
        (r.institutionOrCollection?.toLowerCase().includes(q) ?? false) ||
        (r.visualSystemLabel?.toLowerCase().includes(q) ?? false) ||
        (r.objectOrRecordType?.toLowerCase().includes(q) ?? false) ||
        (r.sourceName?.toLowerCase().includes(q) ?? false) ||
        r.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  if (params.evidenceStatus) {
    const statuses = Array.isArray(params.evidenceStatus)
      ? params.evidenceStatus
      : [params.evidenceStatus];
    items = items.filter((r) => statuses.includes(r.evidenceStatus));
  }

  if (params.periodId) items = items.filter((r) => r.periodId === params.periodId);
  if (params.visualSystemId)
    items = items.filter((r) => r.visualSystemId === params.visualSystemId);
  if (params.region)
    items = items.filter((r) => (r.region ?? "").toLowerCase().includes(params.region!.toLowerCase()));
  if (params.locality)
    items = items.filter((r) =>
      (r.locality ?? "").toLowerCase().includes(params.locality!.toLowerCase()),
    );
  if (params.recordType)
    items = items.filter((r) =>
      r.recordType.toLowerCase().includes(params.recordType!.toLowerCase()),
    );
  if (params.creator)
    items = items.filter((r) =>
      (r.creatorOrAuthority ?? "").toLowerCase().includes(params.creator!.toLowerCase()),
    );
  if (params.institution)
    items = items.filter((r) =>
      (r.institutionOrCollection ?? "").toLowerCase().includes(params.institution!.toLowerCase()),
    );
  if (params.rightsStatus)
    items = items.filter((r) => (r.rightsStatus ?? "").toLowerCase() === params.rightsStatus!.toLowerCase());
  if (params.communityReview)
    items = items.filter((r) => r.communityAuthorityRequired);
  if (params.provenanceKnown === true)
    items = items.filter((r) => Boolean(r.provenanceOrCustodyNote?.trim()));
  if (params.provenanceKnown === false)
    items = items.filter((r) => !r.provenanceOrCustodyNote?.trim());

  if (params.sort === "title") {
    items.sort((a, b) => a.title.localeCompare(b.title));
  } else if (params.sort === "maker") {
    items.sort((a, b) =>
      (a.creatorOrAuthority ?? a.title).localeCompare(b.creatorOrAuthority ?? b.title),
    );
  } else if (params.sort === "region") {
    items.sort((a, b) => (a.region ?? "").localeCompare(b.region ?? ""));
  } else if (params.sort === "evidence") {
    items.sort((a, b) => a.evidenceStatus.localeCompare(b.evidenceStatus));
  } else if (params.sort === "date_asc") {
    items.sort((a, b) => {
      const da = parseInt(a.dateStart ?? "9999", 10);
      const db = parseInt(b.dateStart ?? "9999", 10);
      return da - db;
    });
  } else if (params.sort === "oldest") {
    items.sort((a, b) => recordSortKey(a) - recordSortKey(b));
  } else {
    items.sort((a, b) => recordSortKey(b) - recordSortKey(a));
  }

  const total = items.length;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, limit };
}

export function parseTaxonomyCsv(content: string): CatalogueTaxonomyRow[] {
  return parseCsv(content).map((row) => ({
    taxonomyType: row.taxonomy_type,
    code: row.code,
    label: row.label,
    definition: row.definition || null,
    buildId: row.build_id,
  }));
}

export function parseSourceRegistryCsv(content: string): SourceRegistryRow[] {
  return parseCsv(content).map((row) => ({
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceType: row.source_type || null,
    recordsUsingSource: parseInt(row.records_using_source || "0", 10) || 0,
    buildId: row.build_id,
  }));
}

export function clearCatalogueCache(): void {
  verificationCache = null;
  evidenceCache = null;
}

export function loadVerificationTasks(): CatalogueVerificationTask[] {
  return readJson<CatalogueVerificationTask[]>(FILES.tasks, []);
}

export function saveVerificationTasks(tasks: CatalogueVerificationTask[]): void {
  writeJson(FILES.tasks, tasks);
}

export function addVerificationTask(
  task: Omit<CatalogueVerificationTask, "id" | "createdAt" | "status" | "resolvedAt">,
): CatalogueVerificationTask {
  const tasks = loadVerificationTasks();
  const entry: CatalogueVerificationTask = {
    ...task,
    id: `task-${task.catalogueRecordId}-${Date.now()}`,
    status: "open",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  tasks.push(entry);
  saveVerificationTasks(tasks);
  return entry;
}

export function addCatalogueEvidence(evidence: CatalogueEvidence): void {
  const all = loadCatalogueEvidence();
  const idx = all.findIndex((e) => e.id === evidence.id);
  if (idx >= 0) all[idx] = evidence;
  else all.push(evidence);
  writeJson(FILES.evidence, all);
  evidenceCache = all;
}

export function updateRecordEvidenceStatus(
  recordId: string,
  evidenceStatus: EvidenceStatus,
  verificationPatch: Partial<CatalogueVerification>,
): void {
  const records = loadCatalogueRecords();
  const record = records.find((r) => r.id === recordId);
  if (record) record.evidenceStatus = evidenceStatus;

  const verification = loadCatalogueVerification();
  const idx = verification.findIndex((v) => v.catalogueRecordId === recordId);
  if (idx >= 0) {
    verification[idx] = { ...verification[idx], ...verificationPatch, evidenceStatus };
  }

  writeJson(FILES.records, records);
  writeJson(FILES.verification, verification);
  verificationCache = verification;
}

export { FILES as CATALOGUE_FILES, DATA_DIR as CATALOGUE_DATA_DIR };
