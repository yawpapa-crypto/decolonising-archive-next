import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { ExtractedCatalogueRecord, ExtractionLogEntry } from "./types";

export const FINAL_HEADERS = [
  "record_id",
  "title",
  "alternate_title",
  "record_type",
  "period_id",
  "period_label",
  "visual_system_id",
  "visual_system_label",
  "date_display",
  "date_start",
  "date_end",
  "date_certainty",
  "region",
  "locality",
  "community_or_culture",
  "creator_or_authority",
  "creator_role",
  "creator_certainty",
  "commissioner",
  "workshop_or_printer",
  "institution_or_collection",
  "collection_number",
  "object_type",
  "medium",
  "technique",
  "dimensions",
  "language",
  "source_facts",
  "ared_interpretation",
  "historical_significance",
  "cultural_interpretation",
  "provenance",
  "acquisition_history",
  "primary_source_name",
  "primary_source_url",
  "secondary_sources",
  "bibliography",
  "evidence_summary",
  "access_date",
  "rights_status",
  "image_rights_status",
  "community_authority_status",
  "verification_status",
  "uncertainties",
  "related_record_ids",
  "tags",
  "build_id",
] as const;

function esc(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function recordToRow(r: ExtractedCatalogueRecord): Record<string, string> {
  return Object.fromEntries(FINAL_HEADERS.map((h) => [h, (r as unknown as Record<string, string>)[h] ?? ""]));
}

export function writeCsv(path: string, headers: string[], rows: Record<string, string>[]): void {
  mkdirSync(join(path, ".."), { recursive: true });
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h] ?? "")).join(","));
  }
  writeFileSync(path, lines.join("\n") + "\n");
}

export function writeCatalogueOutputs(
  dir: string,
  records: ExtractedCatalogueRecord[],
  logs: ExtractionLogEntry[],
  duplicates: { kept: string; dropped: string; reason: string }[],
  excluded: { record_id: string; reason: string }[],
): void {
  mkdirSync(dir, { recursive: true });
  writeCsv(
    join(dir, "research-catalogue-final.csv"),
    [...FINAL_HEADERS],
    records.map(recordToRow),
  );

  const people = records.filter((r) => r.record_type === "person" || r.record_type.includes("authority"));
  writeCsv(
    join(dir, "people-authorities-final.csv"),
    ["record_id", "title", "creator_or_authority", "institution_or_collection", "primary_source_url"],
    people.map((r) => ({
      record_id: r.record_id,
      title: r.title,
      creator_or_authority: r.creator_or_authority,
      institution_or_collection: r.institution_or_collection,
      primary_source_url: r.primary_source_url,
    })),
  );

  const institutions = [...new Set(records.map((r) => r.institution_or_collection))];
  writeCsv(
    join(dir, "institutions-final.csv"),
    ["institution", "record_count"],
    institutions.map((i) => ({
      institution: i,
      record_count: String(records.filter((r) => r.institution_or_collection === i).length),
    })),
  );

  const sources = [...new Map(records.map((r) => [r.primary_source_url, r])).values()];
  writeCsv(
    join(dir, "sources-final.csv"),
    ["source_name", "source_url", "institution", "records"],
    sources.map((r) => ({
      source_name: r.primary_source_name,
      source_url: r.primary_source_url,
      institution: r.source_institution,
      records: String(records.filter((x) => x.primary_source_url === r.primary_source_url).length),
    })),
  );

  writeCsv(join(dir, "bibliography-final.csv"), ["record_id", "bibliography", "primary_source_url"], records.map((r) => ({
    record_id: r.record_id,
    bibliography: r.bibliography || r.primary_source_url,
    primary_source_url: r.primary_source_url,
  })));

  writeCsv(
    join(dir, "verification-report-final.csv"),
    ["record_id", "title", "verification_status", "collection_number", "primary_source_url", "uncertainties"],
    records.map((r) => ({
      record_id: r.record_id,
      title: r.title,
      verification_status: r.verification_status,
      collection_number: r.collection_number,
      primary_source_url: r.primary_source_url,
      uncertainties: r.uncertainties,
    })),
  );

  writeCsv(
    join(dir, "duplicate-report.csv"),
    ["kept", "dropped", "reason"],
    duplicates.map((d) => ({ kept: d.kept, dropped: d.dropped, reason: d.reason })),
  );

  writeCsv(
    join(dir, "excluded-records.csv"),
    ["record_id", "reason"],
    excluded.map((e) => ({ record_id: e.record_id, reason: e.reason })),
  );

  writeCsv(
    join(dir, "research-log.csv"),
    ["institution", "search_terms", "pages_examined", "records_extracted", "records_rejected", "duplicates_merged", "inaccessible", "notes", "timestamp"],
    logs.map((l) => ({
      institution: l.institution,
      search_terms: l.search_terms,
      pages_examined: String(l.pages_examined),
      records_extracted: String(l.records_extracted),
      records_rejected: String(l.records_rejected),
      duplicates_merged: String(l.duplicates_merged),
      inaccessible: String(l.inaccessible),
      notes: l.notes,
      timestamp: l.timestamp,
    })),
  );
}
