/**
 * Generate research-catalogue-historical.csv from curated historical entries.
 * Run: npx tsx scripts/generate-historical-catalogue.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { HISTORICAL_ENTRIES } from "../lib/catalogue/historical/entries";
import { FINAL_HEADERS } from "../lib/catalogue/extraction/csv-writer";
import type { HistoricalEntry } from "../lib/catalogue/historical/types";
import { CATALOGUE_BUILD_ID } from "../lib/catalogue/types";

const OUT = join(process.cwd(), "data", "catalogue", "research-catalogue-historical.csv");
const ACCESS_DATE = new Date().toISOString().slice(0, 10);

function esc(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function entryToRow(entry: HistoricalEntry, index: number): Record<string, string> {
  return {
    record_id: `ARED-GH-HIST-${String(index).padStart(5, "0")}`,
    title: entry.title,
    alternate_title: entry.alternate_title ?? "",
    record_type: entry.record_type,
    period_id: entry.period_id,
    period_label: entry.period_label,
    visual_system_id: entry.visual_system_id,
    visual_system_label: entry.visual_system_label,
    date_display: entry.date_display,
    date_start: entry.date_start,
    date_end: entry.date_end,
    date_certainty: entry.date_certainty ?? "historical dating",
    region: entry.region ?? "Ghana",
    locality: entry.locality ?? "",
    community_or_culture: entry.community_or_culture ?? "",
    creator_or_authority: entry.creator_or_authority ?? "",
    creator_role: entry.creator_role ?? "",
    creator_certainty: "documented in cited sources",
    commissioner: "",
    workshop_or_printer: "",
    institution_or_collection: entry.institution_or_collection ?? "",
    collection_number: "",
    object_type: entry.object_type ?? entry.record_type,
    medium: entry.medium ?? "",
    technique: "",
    dimensions: "",
    language: "",
    source_facts: entry.source_facts,
    ared_interpretation: entry.ared_interpretation,
    historical_significance: entry.historical_significance ?? "",
    cultural_interpretation: "",
    provenance: "",
    acquisition_history: "",
    primary_source_name: entry.primary_source_name,
    primary_source_url: entry.primary_source_url,
    secondary_sources: entry.secondary_sources ?? "",
    bibliography: entry.bibliography ?? "",
    evidence_summary: `Historical entry compiled ${ACCESS_DATE} from cited published sources.`,
    access_date: ACCESS_DATE,
    rights_status: "metadata_only",
    image_rights_status: "text record; images not bundled",
    community_authority_status: "assess where culturally governed",
    verification_status: entry.verification_status,
    uncertainties: entry.uncertainties ?? "",
    related_record_ids: "",
    tags: entry.tags,
    build_id: CATALOGUE_BUILD_ID,
  };
}

function main() {
  const rows = HISTORICAL_ENTRIES.map((e, i) => entryToRow(e, i + 1));
  const lines = [
    FINAL_HEADERS.join(","),
    ...rows.map((row) => FINAL_HEADERS.map((h) => esc(row[h] ?? "")).join(",")),
  ];
  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`Wrote ${rows.length} historical entries → ${OUT}`);
}

main();
