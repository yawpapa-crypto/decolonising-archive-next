/**
 * Verify the first 50 catalogue seed records.
 * Run: npx tsx scripts/verify-first-50-records.ts
 *
 * A working URL is NOT the same as evidence. This script checks links,
 * records metadata, and flags issues for manual review.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  loadCatalogueRecords,
  loadCatalogueVerification,
  loadCatalogueEvidence,
  saveCatalogueBundle,
  loadCatalogueTaxonomy,
  loadSourceRegistry,
  clearCatalogueCache,
  saveVerificationTasks,
} from "../lib/catalogue/store";
import { isSeedRecord } from "../lib/catalogue/csv-parser";
import type { CatalogueEvidence, CatalogueVerification, CatalogueVerificationTask, SourceAuthorityLevel } from "../lib/catalogue/types";

const DATA_DIR = join(process.cwd(), "data", "catalogue");
const FETCH_TIMEOUT_MS = 12000;

type UrlCheckResult = {
  url: string;
  ok: boolean;
  status: number | null;
  finalUrl: string | null;
  error: string | null;
  redirected: boolean;
};

type VerificationReportRow = {
  record_id: string;
  title: string;
  evidence_status: string;
  primary_source: string;
  secondary_source: string;
  creator_verified: string;
  date_verified: string;
  locality_verified: string;
  description_verified: string;
  historical_significance_verified: string;
  rights_checked: string;
  provenance_checked: string;
  community_authority_checked: string;
  conflicting_information: string;
  unresolved_questions: string;
  final_decision: string;
  verification_notes: string;
};

type VerificationErrorRow = {
  record_id: string;
  error_type: string;
  field: string;
  detail: string;
  url: string;
};

function escapeCsv(value: string | null | undefined): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowsToCsv(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

function classifySourceType(sourceType: string | null): SourceAuthorityLevel {
  if (!sourceType) return "tier_4";
  const s = sourceType.toLowerCase();
  if (
    s.includes("museum object") ||
    s.includes("family archive") ||
    s.includes("government") ||
    s.includes("official institutional") ||
    s.includes("institutional repository") ||
    s.includes("artist biography") && s.includes("archive")
  ) {
    return "tier_1";
  }
  if (
    s.includes("scholarly") ||
    s.includes("peer-reviewed") ||
    s.includes("encyclopedia") ||
    s.includes("museum publication")
  ) {
    return "tier_2";
  }
  if (
    s.includes("newspaper") ||
    s.includes("design publication") ||
    s.includes("documentary") ||
    s.includes("interview")
  ) {
    return "tier_3";
  }
  if (
    s.includes("wikipedia") ||
    s.includes("blog") ||
    s.includes("auction") ||
    s.includes("pinterest") ||
    s.includes("social media") ||
    s.includes("research lead")
  ) {
    return "tier_4";
  }
  return "tier_3";
}

async function checkUrl(url: string): Promise<UrlCheckResult> {
  if (!url || !url.startsWith("http")) {
    return { url, ok: false, status: null, finalUrl: null, error: "invalid_url", redirected: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ARED-Catalogue-Verifier/1.0 (research; mailto:archive@ared.design)" },
    });

    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "ARED-Catalogue-Verifier/1.0 (research; mailto:archive@ared.design)" },
      });
    }

    const finalUrl = res.url;
    return {
      url,
      ok: res.ok,
      status: res.status,
      finalUrl,
      error: res.ok ? null : `http_${res.status}`,
      redirected: finalUrl !== url,
    };
  } catch (err) {
    return {
      url,
      ok: false,
      status: null,
      finalUrl: null,
      error: err instanceof Error ? err.message : "fetch_failed",
      redirected: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const recordsPath = join(DATA_DIR, "catalogue-records.json");
  if (!existsSync(recordsPath)) {
    console.error("Catalogue not imported. Run: npx tsx scripts/import-ghana-research-catalogue.ts");
    process.exit(1);
  }

  const records = loadCatalogueRecords().filter((r) => isSeedRecord(r.id));
  const verification = loadCatalogueVerification();
  const evidence = [...loadCatalogueEvidence()];
  const reportRows: VerificationReportRow[] = [];
  const errorRows: VerificationErrorRow[] = [];
  const adminTasks: CatalogueVerificationTask[] = [];

  console.log(`Verifying ${records.length} seed records…`);

  for (const record of records) {
    const vIdx = verification.findIndex((v) => v.catalogueRecordId === record.id);
    const v: CatalogueVerification =
      vIdx >= 0
        ? verification[vIdx]
        : {
            id: `ver-${record.id}`,
            catalogueRecordId: record.id,
            evidenceStatus: record.evidenceStatus,
            checkedBy: "verify-first-50-records.ts",
            checkedAt: null,
            primarySourceUrl: record.sourceUrl,
            secondarySourceUrl: record.secondarySourceUrl,
            sourceType: record.sourceType,
            sourceAuthorityLevel: null,
            sourceSupportsTitle: null,
            sourceSupportsCreator: null,
            sourceSupportsDate: null,
            sourceSupportsLocation: null,
            sourceSupportsDescription: null,
            sourceSupportsHistoricalSignificance: null,
            rightsChecked: false,
            provenanceChecked: false,
            communityAuthorityChecked: false,
            conflictingEvidence: null,
            verificationNotes: null,
            unresolvedQuestions: null,
            verificationDecision: null,
          };

    const primaryCheck = record.sourceUrl ? await checkUrl(record.sourceUrl) : null;
    const secondaryCheck = record.secondarySourceUrl
      ? await checkUrl(record.secondarySourceUrl)
      : null;

    const issues: string[] = [];
    const unresolved: string[] = [];

    if (!record.sourceUrl) {
      errorRows.push({
        record_id: record.id,
        error_type: "missing_source",
        field: "source_url",
        detail: "No primary source URL",
        url: "",
      });
      issues.push("missing_primary_source");
    } else if (primaryCheck && !primaryCheck.ok) {
      errorRows.push({
        record_id: record.id,
        error_type: "broken_link",
        field: "source_url",
        detail: primaryCheck.error ?? "link_failed",
        url: record.sourceUrl,
      });
      issues.push("broken_primary_link");
    }

    if (record.secondarySourceUrl && secondaryCheck && !secondaryCheck.ok) {
      errorRows.push({
        record_id: record.id,
        error_type: "broken_link",
        field: "secondary_source_url",
        detail: secondaryCheck.error ?? "link_failed",
        url: record.secondarySourceUrl,
      });
      issues.push("broken_secondary_link");
    }

    if (!record.secondarySourceUrl) {
      unresolved.push("missing_second_independent_source");
      errorRows.push({
        record_id: record.id,
        error_type: "missing_second_source",
        field: "secondary_source_url",
        detail: "No second independent source recorded",
        url: "",
      });
    }

    const tier = classifySourceType(record.sourceType);
    v.sourceAuthorityLevel = tier;
    v.checkedAt = new Date().toISOString();
    v.checkedBy = "verify-first-50-records.ts";
    v.primarySourceUrl = record.sourceUrl;
    v.secondarySourceUrl = record.secondarySourceUrl;

    // Never auto-verify — only upgrade to source_checked if primary link works
    if (primaryCheck?.ok && tier !== "tier_4") {
      v.evidenceStatus = "source_checked";
      record.evidenceStatus = "source_checked";
    } else if (primaryCheck?.ok) {
      v.evidenceStatus = "source_located";
      record.evidenceStatus = "source_located";
    } else {
      v.evidenceStatus = "source_located";
      record.evidenceStatus = "source_located";
    }

    // Tier 4 alone cannot verify
    if (tier === "tier_4") {
      unresolved.push("source_is_tier_4_lead_only");
    }

    if (record.communityAuthorityRequired) {
      v.communityAuthorityChecked = false;
      unresolved.push("community_authority_required");
    }

    if (record.rightsStatus === "unassessed" || record.rightsStatus === "permission_required") {
      unresolved.push("rights_review_required");
    }

    v.sourceSupportsTitle = null;
    v.sourceSupportsCreator = null;
    v.sourceSupportsDate = null;
    v.sourceSupportsLocation = null;
    v.sourceSupportsDescription = null;
    v.sourceSupportsHistoricalSignificance = null;
    v.verificationNotes = [
      "Automated check only. CSV claims not treated as evidence.",
      primaryCheck?.ok ? "Primary URL responded." : "Primary URL failed or missing.",
      secondaryCheck?.ok ? "Secondary URL responded." : "Secondary source not confirmed.",
      `Source classified tier: ${tier}.`,
    ].join(" ");
    v.unresolvedQuestions = [...unresolved, record.researchQuestion].filter(Boolean).join("; ");
    v.verificationDecision = "manual_review_required";

    for (const issue of [...issues, ...unresolved]) {
      adminTasks.push({
        id: `task-${record.id}-${issue}`,
        catalogueRecordId: record.id,
        taskType: issue,
        description: `Manual review required: ${issue.replace(/_/g, " ")} (${record.title})`,
        status: "open",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      });
    }

    if (primaryCheck?.ok && record.sourceUrl) {
      evidence.push({
        id: `ev-${record.id}-primary`,
        catalogueRecordId: record.id,
        sourceTitle: record.sourceName,
        sourceAuthor: null,
        sourceInstitution: record.sourceName,
        sourceUrl: primaryCheck.finalUrl ?? record.sourceUrl,
        sourceType: record.sourceType,
        publicationDate: null,
        accessDate: new Date().toISOString().slice(0, 10),
        quotedEvidence: null,
        paraphrasedEvidence: null,
        claimSupported: "url_accessibility_only",
        reliabilityLevel: tier,
        archivedUrl: null,
        notes: "Automated URL check — does not confirm catalogue claims.",
      });
    }

    if (vIdx >= 0) verification[vIdx] = v;
    else verification.push(v);

    reportRows.push({
      record_id: record.id,
      title: record.title,
      evidence_status: record.evidenceStatus,
      primary_source: record.sourceUrl ?? "",
      secondary_source: record.secondarySourceUrl ?? "",
      creator_verified: "no",
      date_verified: "no",
      locality_verified: "no",
      description_verified: "no",
      historical_significance_verified: "no",
      rights_checked: "no",
      provenance_checked: "no",
      community_authority_checked: record.communityAuthorityRequired ? "required" : "no",
      conflicting_information: "",
      unresolved_questions: v.unresolvedQuestions ?? "",
      final_decision: "manual_review_required",
      verification_notes: v.verificationNotes ?? "",
    });
  }

  saveVerificationTasks(adminTasks);

  const verifiedCount = records.filter((r) => r.evidenceStatus === "verified").length;

  saveCatalogueBundle({
    records: loadCatalogueRecords().map((r) => records.find((s) => s.id === r.id) ?? r),
    verification,
    evidence,
    taxonomy: loadCatalogueTaxonomy(),
    sourceRegistry: loadSourceRegistry(),
    importReport: JSON.parse(readFileSync(join(DATA_DIR, "import-report.json"), "utf8")),
  });
  clearCatalogueCache();

  const reportHeaders = [
    "record_id",
    "title",
    "evidence_status",
    "primary_source",
    "secondary_source",
    "creator_verified",
    "date_verified",
    "locality_verified",
    "description_verified",
    "historical_significance_verified",
    "rights_checked",
    "provenance_checked",
    "community_authority_checked",
    "conflicting_information",
    "unresolved_questions",
    "final_decision",
    "verification_notes",
  ];

  writeFileSync(
    join(DATA_DIR, "verification-report-first-50.csv"),
    rowsToCsv(
      reportHeaders,
      reportRows.map((r) => ({ ...r })),
    ),
  );

  writeFileSync(
    join(DATA_DIR, "verification-errors.csv"),
    rowsToCsv(
      ["record_id", "error_type", "field", "detail", "url"],
      errorRows.map((r) => ({ ...r })),
    ),
  );

  console.log("=== Verification complete ===");
  console.log(`Seed records checked: ${records.length}`);
  console.log(`Auto-verified (must be 0): ${verifiedCount}`);
  console.log(`Admin tasks created: ${adminTasks.length}`);
  console.log(`→ data/catalogue/verification-report-first-50.csv`);
  console.log(`→ data/catalogue/verification-errors.csv`);

  if (verifiedCount > 0) {
    console.error("ERROR: Script must not mark records verified automatically.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
