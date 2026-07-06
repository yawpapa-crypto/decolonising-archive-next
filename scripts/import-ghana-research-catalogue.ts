/**
 * Import ARED Ghana catalogue: museum objects + documented historical entries.
 * Run: npx tsx scripts/generate-historical-catalogue.ts  (if historical CSV missing)
 *      npx tsx scripts/import-ghana-research-catalogue.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseCsv, parseLinkedIds, parseTags } from "../lib/catalogue/csv-parser";
import {
  saveCatalogueBundle,
  clearCatalogueCache,
  parseTaxonomyCsv,
} from "../lib/catalogue/store";
import type { CatalogueRecord, CatalogueVerification, EvidenceStatus } from "../lib/catalogue/types";
import { CATALOGUE_BUILD_ID } from "../lib/catalogue/types";

const DATA_DIR = join(process.cwd(), "data", "catalogue");
const FINAL_CSV = join(DATA_DIR, "research-catalogue-final.csv");
const HISTORICAL_CSV = join(DATA_DIR, "research-catalogue-historical.csv");
const TAXONOMY_CSV = join(DATA_DIR, "taxonomy.csv");

const PUBLIC_VERIFICATION_STATUSES = new Set([
  "verified",
  "partially_verified",
  "source_located",
  "source_checked",
]);

function mapEvidenceStatus(verificationStatus: string): EvidenceStatus {
  switch (verificationStatus) {
    case "verified":
      return "verified";
    case "partially_verified":
      return "partially_verified";
    case "source_checked":
      return "source_checked";
    case "source_located":
    default:
      return "source_located";
  }
}

function sourceAuthorityLevel(status: EvidenceStatus): "tier_1" | "tier_2" | "tier_3" | "tier_4" {
  if (status === "verified") return "tier_1";
  if (status === "partially_verified" || status === "source_checked") return "tier_2";
  return "tier_3";
}

function finalRowToRecord(row: Record<string, string>, importedAt: string): CatalogueRecord {
  const evidenceStatus = mapEvidenceStatus(row.verification_status ?? "verified");
  const isMuseumObject = evidenceStatus === "verified" && row.collection_number;
  const description = row.source_facts || row.ared_interpretation || "";

  return {
    id: row.record_id,
    buildId: row.build_id || CATALOGUE_BUILD_ID,
    importStatus: row.verification_status ?? "verified",
    publicationState:
      evidenceStatus === "verified"
        ? "verified public record"
        : "documented historical entry",
    title: row.title,
    recordType: row.record_type,
    periodId: row.period_id || null,
    periodLabel: row.period_label || null,
    dateStart: row.date_start || null,
    dateEnd: row.date_end || null,
    visualSystemId: row.visual_system_id || null,
    visualSystemLabel: row.visual_system_label || null,
    region: row.region || null,
    locality: row.locality || null,
    communityOrCulture: row.community_or_culture || null,
    creatorOrAuthority: row.creator_or_authority || null,
    creatorRole: row.creator_role || null,
    institutionOrCollection: row.institution_or_collection || null,
    objectOrRecordType: row.object_type || null,
    mediumOrFormat: row.medium || null,
    language: row.language || null,
    description,
    historicalSignificance: row.historical_significance || row.cultural_interpretation || null,
    sourceName: row.primary_source_name || null,
    sourceUrl: row.primary_source_url || null,
    secondarySourceUrl: row.secondary_sources || null,
    sourceType: isMuseumObject ? "museum object record" : "published historical source",
    rightsStatus: row.rights_status || null,
    rightsNote: row.image_rights_status || null,
    researchPriority: null,
    researchQuestion: row.uncertainties || null,
    provenanceOrCustodyNote: [row.provenance, row.acquisition_history].filter(Boolean).join("; ") || null,
    communityAuthorityRequired: row.community_authority_status?.includes("required") ?? false,
    linkedRecordIds: parseLinkedIds(row.related_record_ids),
    tags: parseTags(row.tags),
    currentResearchArea: null,
    whatRemainsToBeEstablished: row.uncertainties || null,
    publicVisibility: true,
    evidenceStatus,
    rawCsvRow: { ...row },
    importedAt,
  };
}

function verificationFromRecord(record: CatalogueRecord, row: Record<string, string>): CatalogueVerification {
  const tier = sourceAuthorityLevel(record.evidenceStatus);
  return {
    id: `ver-${record.id}`,
    catalogueRecordId: record.id,
    evidenceStatus: record.evidenceStatus,
    checkedBy: "import-ghana-research-catalogue.ts",
    checkedAt: row.access_date || new Date().toISOString(),
    primarySourceUrl: record.sourceUrl,
    secondarySourceUrl: record.secondarySourceUrl,
    sourceType: record.sourceType,
    sourceAuthorityLevel: tier,
    sourceSupportsTitle: true,
    sourceSupportsCreator: record.evidenceStatus === "verified",
    sourceSupportsDate: record.evidenceStatus !== "source_located",
    sourceSupportsLocation: true,
    sourceSupportsDescription: true,
    sourceSupportsHistoricalSignificance: Boolean(row.historical_significance),
    rightsChecked: Boolean(row.rights_status),
    provenanceChecked: Boolean(row.provenance),
    communityAuthorityChecked: !record.communityAuthorityRequired,
    conflictingEvidence: null,
    verificationNotes: row.evidence_summary || null,
    unresolvedQuestions: row.uncertainties || null,
    verificationDecision: record.evidenceStatus,
  };
}

function loadPublicRows(path: string): Record<string, string>[] {
  if (!existsSync(path)) return [];
  return parseCsv(readFileSync(path, "utf8")).filter(
    (r) =>
      r.record_id &&
      PUBLIC_VERIFICATION_STATUSES.has(r.verification_status ?? "verified"),
  );
}

function main() {
  if (!existsSync(FINAL_CSV) && !existsSync(HISTORICAL_CSV)) {
    console.error("No catalogue CSV found.");
    console.error("Run: npx tsx scripts/extract-object-catalogue.ts");
    console.error("     npx tsx scripts/generate-historical-catalogue.ts");
    process.exit(1);
  }

  const importedAt = new Date().toISOString();
  const museumRows = loadPublicRows(FINAL_CSV);
  const historicalRows = loadPublicRows(HISTORICAL_CSV);
  const allRows = [...museumRows, ...historicalRows];

  const records = allRows.map((row) => finalRowToRecord(row, importedAt));
  const verification = records.map((r) =>
    verificationFromRecord(r, allRows.find((x) => x.record_id === r.id)!),
  );

  const taxonomy = existsSync(TAXONOMY_CSV)
    ? parseTaxonomyCsv(readFileSync(TAXONOMY_CSV, "utf8"))
    : [];

  const verifiedCount = records.filter((r) => r.evidenceStatus === "verified").length;

  saveCatalogueBundle({
    records,
    verification,
    evidence: [],
    taxonomy,
    sourceRegistry: [],
    importReport: {
      buildId: CATALOGUE_BUILD_ID,
      importedAt,
      sourceFiles: [
        existsSync(FINAL_CSV) ? "research-catalogue-final.csv" : null,
        existsSync(HISTORICAL_CSV) ? "research-catalogue-historical.csv" : null,
      ].filter(Boolean),
      totalRecords: records.length,
      museumVerified: verifiedCount,
      historicalDocumented: records.length - verifiedCount,
      verifiedAtImport: verifiedCount,
      notes: [
        "Museum object records (verified) plus documented historical entries (source-located / partially verified).",
        "source_facts and ared_interpretation remain separated in CSV and on detail pages.",
      ],
    },
  });
  clearCatalogueCache();

  console.log("=== ARED Ghana Catalogue Import ===");
  console.log(`Total public records: ${records.length}`);
  console.log(`  Museum verified objects: ${verifiedCount}`);
  console.log(`  Documented historical entries: ${records.length - verifiedCount}`);
}

main();
