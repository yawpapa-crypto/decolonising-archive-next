/**
 * Rebuild the ARED Ghana catalogue as a verified-only historical archive.
 *
 * Reads the legacy 2,850-row planning grid, excludes all placeholders,
 * and produces verified-only output files.
 *
 * Run: npx tsx scripts/rebuild-evidence-catalogue.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { parseCsv } from "../lib/catalogue/csv-parser";
import {
  isPlaceholderRow,
  isPublishableRecordType,
  isSystemOrFieldRecord,
} from "../lib/catalogue/placeholder-detection";
import {
  FINAL_CATALOGUE_HEADERS,
  legacyRowToFinalRow,
} from "../lib/catalogue/final-catalogue-schema";

const DATA_DIR = join(process.cwd(), "data", "catalogue");
const LEGACY_CSV = join(DATA_DIR, "research-catalogue-legacy-planning-grid.csv");
const FETCH_TIMEOUT_MS = 10000;

type UrlCheck = { ok: boolean; status: number | null; error?: string };

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function rowsToCsv(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}

function classifySourceTier(url: string, sourceType: string): 1 | 2 | 3 | 4 {
  const u = url.toLowerCase();
  const t = sourceType.toLowerCase();
  if (
    u.includes("metmuseum.org") ||
    u.includes("britishmuseum.org") ||
    u.includes("si.edu") ||
    u.includes("brooklynmuseum.org") ||
    u.includes("high.org") ||
    u.includes("horniman.ac.uk") ||
    u.includes("fowler.ucla.edu") ||
    u.includes("ghanamuseums.org") ||
    u.includes("bog.gov.gh") ||
    u.includes("knust.edu.gh") ||
    u.includes("ug.edu.gh") ||
    u.includes("amonkotei.com") ||
    t.includes("museum object") ||
    t.includes("family archive") ||
    t.includes("official institutional")
  ) {
    return 1;
  }
  if (
    t.includes("scholarly") ||
    t.includes("encyclopedia") ||
    u.includes("routledge.com") ||
    u.includes("studiomuseum.org")
  ) {
    return 2;
  }
  if (u.includes("wikipedia.org") || u.includes("ared.design")) return 4;
  return 3;
}

async function checkUrl(url: string): Promise<UrlCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "ARED-Catalogue-Rebuild/1.0 (research; mailto:archive@ared.design)" },
    });
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "ARED-Catalogue-Rebuild/1.0 (research; mailto:archive@ared.design)" },
      });
      return { ok: getRes.ok, status: getRes.status };
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : "fetch_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

type VerificationResult = {
  verified: boolean;
  notes: string[];
  evidenceSummary: string;
};

async function assessForVerification(row: Record<string, string>): Promise<VerificationResult> {
  const notes: string[] = [];
  const id = row.record_id;

  if (!isPublishableRecordType(row.record_type ?? "")) {
    return { verified: false, notes: ["record_type not publishable"], evidenceSummary: "" };
  }

  if (isSystemOrFieldRecord(row)) {
    return { verified: false, notes: ["system/field/collection-level row requires object-level research"], evidenceSummary: "" };
  }

  if (!row.title?.trim()) {
    return { verified: false, notes: ["missing title"], evidenceSummary: "" };
  }

  if (!row.source_url?.trim()) {
    return { verified: false, notes: ["missing primary source URL"], evidenceSummary: "" };
  }

  const primary = await checkUrl(row.source_url);
  if (!primary.ok) {
    notes.push(`primary source unreachable (${primary.error ?? primary.status})`);
    return { verified: false, notes, evidenceSummary: "" };
  }

  let secondaryOk = false;
  if (row.secondary_source_url?.trim()) {
    const secondary = await checkUrl(row.secondary_source_url);
    secondaryOk = secondary.ok;
    if (!secondaryOk) notes.push(`secondary source unreachable (${secondary.error ?? secondary.status})`);
  }

  const tier = classifySourceTier(row.source_url, row.source_type ?? "");
  if (tier === 4 && !secondaryOk) {
    notes.push("tier-4 source cannot verify alone");
    return { verified: false, notes, evidenceSummary: "" };
  }

  const hasCreator =
    Boolean(row.creator_or_authority?.trim()) &&
    !row.creator_or_authority!.toLowerCase().includes("to be identified") &&
    !row.creator_or_authority!.toLowerCase().includes("unknown / to be researched");

  const hasAnonymousMuseumAttribution =
    row.creator_or_authority?.toLowerCase().includes("unidentified") &&
    tier === 1 &&
    (row.record_type ?? "").toLowerCase().includes("museum");

  if (!hasCreator && !hasAnonymousMuseumAttribution) {
    notes.push("creator/attribution not established");
    return { verified: false, notes, evidenceSummary: "" };
  }

  const hasDate = Boolean(row.date_start?.trim()) || Boolean(row.date_end?.trim());
  if (!hasDate && (row.record_type ?? "").toLowerCase() !== "person") {
    notes.push("date or date range not established");
    return { verified: false, notes, evidenceSummary: "" };
  }

  if (!row.region?.trim() && !row.locality?.trim()) {
    notes.push("location not established");
    return { verified: false, notes, evidenceSummary: "" };
  }

  const needsTwoSources = tier >= 3;
  if (needsTwoSources && !secondaryOk) {
    notes.push("requires two independent credible sources");
    return { verified: false, notes, evidenceSummary: "" };
  }

  if (row.community_authority_required === "Yes" && tier === 1 && (row.record_type ?? "").includes("Asafo")) {
    notes.push("community authority assessment pending — withheld from public verified set");
    return { verified: false, notes, evidenceSummary: "" };
  }

  const evidenceSummary = [
    `Primary: ${row.source_name} (${row.source_url})`,
    row.secondary_source_url ? `Secondary: ${row.secondary_source_url}` : "",
    `Source tier: ${tier}`,
    `Automated URL check passed ${new Date().toISOString().slice(0, 10)}`,
    "Manual claim-by-claim review still recommended before treating as fully closed.",
  ]
    .filter(Boolean)
    .join("; ");

  notes.push("passed automated verification gate");
  return { verified: true, notes, evidenceSummary };
}

async function main() {
  if (!existsSync(LEGACY_CSV)) {
    console.error(`Missing ${LEGACY_CSV}`);
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const accessDate = new Date().toISOString().slice(0, 10);
  const allRows = parseCsv(readFileSync(LEGACY_CSV, "utf8"));

  const excluded: Record<string, string>[] = [];
  const unresolved: Record<string, string>[] = [];
  const verifiedFinal: Record<string, string>[] = [];
  const verificationReport: Record<string, string>[] = [];

  const personAuthorities = new Map<string, Record<string, string>>();
  const institutions = new Map<string, Record<string, string>>();
  const sourceRegistry = new Map<string, Record<string, string>>();

  console.log(`Processing ${allRows.length} legacy rows…`);

  for (const row of allRows) {
    const id = row.record_id;
    if (!id) continue;

    const placeholder = isPlaceholderRow(row);
    if (placeholder) {
      excluded.push({
        record_id: id,
        title: row.title,
        exclusion_reason: placeholder.code,
        detail: placeholder.detail,
        publication_state: row.publication_state ?? "",
        record_type: row.record_type ?? "",
      });
      continue;
    }

    // Extract reference entities from non-placeholder rows
    if ((row.record_type ?? "").toLowerCase() === "person" && row.creator_or_authority) {
      personAuthorities.set(row.creator_or_authority, {
        name: row.creator_or_authority,
        record_id: id,
        role: row.creator_role ?? "",
        region: row.region ?? "",
        source_url: row.source_url ?? "",
      });
    }
    if ((row.record_type ?? "").toLowerCase() === "institution" && row.institution_or_collection) {
      institutions.set(row.institution_or_collection, {
        name: row.institution_or_collection,
        record_id: id,
        locality: row.locality ?? "",
        source_url: row.source_url ?? "",
      });
    }
    if (row.source_url?.trim()) {
      sourceRegistry.set(row.source_url, {
        source_name: row.source_name ?? "",
        source_url: row.source_url,
        source_type: row.source_type ?? "",
        records_using: "1",
      });
    }

    const assessment = await assessForVerification(row);
    verificationReport.push({
      record_id: id,
      title: row.title,
      record_type: row.record_type,
      verification_status: assessment.verified ? "verified" : "unverified",
      primary_source: row.source_url ?? "",
      secondary_source: row.secondary_source_url ?? "",
      passed: assessment.verified ? "yes" : "no",
      notes: assessment.notes.join("; "),
    });

    if (assessment.verified) {
      verifiedFinal.push(
        legacyRowToFinalRow(row, {
          verificationStatus: "verified",
          verificationNotes: assessment.notes.join("; "),
          sourceAccessDate: accessDate,
          evidenceSummary: assessment.evidenceSummary,
          secondarySourceName: row.secondary_source_url ? "Secondary source" : "",
        }),
      );
    } else {
      unresolved.push({
        record_id: id,
        title: row.title,
        record_type: row.record_type,
        reason: assessment.notes.join("; ") || "insufficient evidence for publication",
        source_url: row.source_url ?? "",
        secondary_source_url: row.secondary_source_url ?? "",
        research_priority: row.research_priority ?? "",
        research_question: row.research_question ?? "",
      });
    }
  }

  writeFileSync(
    join(DATA_DIR, "research-catalogue-final.csv"),
    rowsToCsv([...FINAL_CATALOGUE_HEADERS], verifiedFinal),
  );
  writeFileSync(
    join(DATA_DIR, "excluded-placeholder-records.csv"),
    rowsToCsv(
      ["record_id", "title", "exclusion_reason", "detail", "publication_state", "record_type"],
      excluded,
    ),
  );
  writeFileSync(
    join(DATA_DIR, "unresolved-research-private.csv"),
    rowsToCsv(
      [
        "record_id",
        "title",
        "record_type",
        "reason",
        "source_url",
        "secondary_source_url",
        "research_priority",
        "research_question",
      ],
      unresolved,
    ),
  );
  writeFileSync(
    join(DATA_DIR, "verification-report.csv"),
    rowsToCsv(
      [
        "record_id",
        "title",
        "record_type",
        "verification_status",
        "primary_source",
        "secondary_source",
        "passed",
        "notes",
      ],
      verificationReport,
    ),
  );
  writeFileSync(
    join(DATA_DIR, "person-authorities.csv"),
    rowsToCsv(["name", "record_id", "role", "region", "source_url"], [...personAuthorities.values()]),
  );
  writeFileSync(
    join(DATA_DIR, "institutions-and-collections.csv"),
    rowsToCsv(["name", "record_id", "locality", "source_url"], [...institutions.values()]),
  );
  writeFileSync(
    join(DATA_DIR, "source-registry-final.csv"),
    rowsToCsv(["source_name", "source_url", "source_type", "records_using"], [...sourceRegistry.values()]),
  );

  const byPeriod: Record<string, number> = {};
  const byVisual: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  for (const r of verifiedFinal) {
    byPeriod[r.period_label] = (byPeriod[r.period_label] ?? 0) + 1;
    byVisual[r.visual_system_label] = (byVisual[r.visual_system_label] ?? 0) + 1;
    byRegion[r.region] = (byRegion[r.region] ?? 0) + 1;
  }

  const summary = {
    rebuiltAt: new Date().toISOString(),
    legacyRows: allRows.length,
    excludedPlaceholders: excluded.length,
    unresolvedPrivate: unresolved.length,
    verifiedPublicRecords: verifiedFinal.length,
    byPeriod,
    byVisualSystem: byVisual,
    byRegion,
    message:
      verifiedFinal.length === 0
        ? "No records passed automated verification. Manual research required before publication."
        : "Only verified records written to research-catalogue-final.csv",
  };

  writeFileSync(join(DATA_DIR, "catalogue-rebuild-report.json"), JSON.stringify(summary, null, 2) + "\n");

  console.log("=== Catalogue rebuild complete ===");
  console.log(`Legacy rows: ${allRows.length}`);
  console.log(`Excluded placeholders: ${excluded.length}`);
  console.log(`Unresolved (private): ${unresolved.length}`);
  console.log(`Verified public records: ${verifiedFinal.length}`);
  console.log("→ data/catalogue/research-catalogue-final.csv");
  console.log("→ data/catalogue/excluded-placeholder-records.csv");
  console.log("→ data/catalogue/unresolved-research-private.csv");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
