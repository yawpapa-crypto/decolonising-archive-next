import "server-only";

import type { ArchiveRecord } from "@/lib/records";
import { readRecords } from "@/lib/records";
import {
  countryToIso3,
  extractCountriesFromRecord,
  type GeographicCountryCoverage,
  type GeographyRecordRef,
  type UserGeographicCoverage,
} from "@/lib/intelligence/geography-shared";
import { getMemberWorkspaceData } from "@/src/lib/member-workspace";
import { createClient } from "@/src/lib/supabase/server";

export type {
  GeographicCountryCoverage,
  GeographicRegionCoverage,
  GeographyRecordInput,
  GeographyRecordRef,
  UserGeographicCoverage,
} from "@/lib/intelligence/geography-shared";

export { countryToIso3, extractCountriesFromRecord, normaliseCountry } from "@/lib/intelligence/geography-shared";

type SavedRow = {
  record_id: string;
  record_title?: string | null;
  record_source?: string | null;
  record_year?: string | null;
  record_metadata?: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function upsertRecord(
  bucket: Map<string, GeographyRecordRef & { countries: Set<string>; regions: Set<string> }>,
  row: SavedRow,
  archiveById: Map<string, ArchiveRecord>,
) {
  const recordId = row.record_id;
  const archiveRecord = archiveById.get(recordId) ?? null;
  const title = row.record_title?.trim() || archiveRecord?.title?.trim() || recordId;
  const extracted = extractCountriesFromRecord({
    recordId,
    title,
    source: row.record_source ?? archiveRecord?.sourceName ?? null,
    year: row.record_year ?? archiveRecord?.datePublished?.slice(0, 4) ?? null,
    metadata: row.record_metadata ?? null,
    archiveRecord,
  });

  const existing = bucket.get(recordId);
  const entry =
    existing ??
    {
      recordId,
      title,
      source: row.record_source ?? archiveRecord?.sourceName ?? null,
      year: row.record_year ?? archiveRecord?.datePublished?.slice(0, 4) ?? null,
      region: extracted.regions[0] ?? archiveRecord?.region?.[0] ?? null,
      countries: new Set<string>(),
      regions: new Set<string>(),
    };

  for (const country of extracted.countries) entry.countries.add(country);
  for (const region of extracted.regions) entry.regions.add(region);
  if (!entry.region && extracted.regions[0]) entry.region = extracted.regions[0];

  bucket.set(recordId, entry);
}

export async function getUserGeographicCoverage(userId: string): Promise<UserGeographicCoverage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error("Unauthorized intelligence geography access.");
  }

  const workspace = await getMemberWorkspaceData("/my/workbench/intelligence");

  let archiveRecords: ArchiveRecord[] = [];
  try {
    archiveRecords = await readRecords();
  } catch {
    archiveRecords = [...workspace.recordsById.values()];
  }

  const archiveById = new Map(archiveRecords.map((record) => [record.id, record]));
  const recordBucket = new Map<
    string,
    GeographyRecordRef & { countries: Set<string>; regions: Set<string> }
  >();

  for (const bookmark of workspace.bookmarks) {
    upsertRecord(recordBucket, bookmark, archiveById);
  }

  for (const item of workspace.readingListItems) {
    upsertRecord(recordBucket, item, archiveById);
  }

  const { data: reviewProjects } = await supabase
    .from("workbench_review_projects")
    .select("id")
    .eq("user_id", userId);

  const projectIds = (reviewProjects ?? []).map((row) => row.id as string);
  if (projectIds.length) {
    const { data: reviewRecords } = await supabase
      .from("workbench_review_records")
      .select("record_id, title, source_label, year, source_metadata")
      .in("review_project_id", projectIds);

    for (const row of reviewRecords ?? []) {
      const metadata = isRecord(row.source_metadata) ? row.source_metadata : null;
      upsertRecord(
        recordBucket,
        {
          record_id: row.record_id as string,
          record_title: row.title as string,
          record_source: row.source_label as string | null,
          record_year: row.year ? String(row.year) : null,
          record_metadata: metadata,
        },
        archiveById,
      );
    }
  }

  const countryMap = new Map<string, GeographicCountryCoverage>();
  const regionMap = new Map<string, number>();

  for (const entry of recordBucket.values()) {
    const ref: GeographyRecordRef = {
      recordId: entry.recordId,
      title: entry.title,
      source: entry.source,
      year: entry.year,
      region: entry.region,
    };

    for (const country of entry.countries) {
      const bucket = countryMap.get(country) ?? {
        country,
        iso3: countryToIso3(country),
        count: 0,
        records: [],
      };
      bucket.count += 1;
      if (bucket.records.length < 40) bucket.records.push(ref);
      countryMap.set(country, bucket);
    }

    for (const region of entry.regions) {
      regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    }
  }

  return {
    countries: [...countryMap.values()].sort((a, b) => b.count - a.count),
    regions: [...regionMap.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
  };
}
