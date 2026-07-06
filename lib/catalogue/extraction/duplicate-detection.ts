import type { ExtractedCatalogueRecord } from "./types";

export function mergeDuplicates(records: ExtractedCatalogueRecord[]): {
  merged: ExtractedCatalogueRecord[];
  duplicates: { kept: string; dropped: string; reason: string }[];
} {
  const byKey = new Map<string, ExtractedCatalogueRecord>();
  const duplicates: { kept: string; dropped: string; reason: string }[] = [];

  for (const r of records) {
    const key = r.dedup_key || `${r.institution_or_collection}:${r.collection_number}`;
    const existing = byKey.get(key);
    if (existing) {
      duplicates.push({
        kept: existing.record_id,
        dropped: r.record_id,
        reason: `duplicate ${key}`,
      });
      if (r.secondary_sources && !existing.secondary_sources.includes(r.primary_source_url)) {
        existing.secondary_sources = [existing.secondary_sources, r.primary_source_url]
          .filter(Boolean)
          .join(" | ");
      }
      continue;
    }
    byKey.set(key, r);
  }

  return { merged: [...byKey.values()], duplicates };
}

export function renumberRecords(records: ExtractedCatalogueRecord[]): ExtractedCatalogueRecord[] {
  return records.map((r, i) => ({
    ...r,
    record_id: `ARED-GH-${String(i + 1).padStart(5, "0")}`,
  }));
}
