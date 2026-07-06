export type NarrativeRecord = {
  id?: string;
  title?: string;
  abstract?: string;
  summary?: string;
  description?: string | string[];
  resultMode?: string;
};

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function descriptionText(record: NarrativeRecord): string {
  if (Array.isArray(record.description)) return record.description.join(" ");
  return cleanText(record.description);
}

export function isBoilerplateNarrative(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^venue:\s*/i.test(trimmed) && trimmed.length < 220) return true;
  if (/^year:\s*/i.test(trimmed) && trimmed.length < 120) return true;
  if (/^citations:\s*\d+$/i.test(trimmed)) return true;
  return false;
}

/** 0–1 score for how useful a record's preview text is in search results. */
export function getRecordNarrativeQuality(record: NarrativeRecord): number {
  const abstract = cleanText(record.abstract);
  const summary = cleanText(record.summary);
  const description = cleanText(descriptionText(record));

  if (abstract.length >= 140) return 1;
  if (abstract.length >= 60) return 0.85;
  if (abstract.length >= 24) return 0.65;
  if (summary.length >= 80 && !isBoilerplateNarrative(summary)) return 0.55;
  if (description.length >= 100 && !isBoilerplateNarrative(description)) return 0.45;
  if (summary.length >= 40 && !isBoilerplateNarrative(summary)) return 0.35;
  return 0.12;
}

export function getRecordNarrativeRankingBoost(record: NarrativeRecord): number {
  const quality = getRecordNarrativeQuality(record);
  const isLive =
    String(record.resultMode || "").toLowerCase() === "live" ||
    String(record.id || "").startsWith("live-");

  let boost = Math.round(quality * 14);
  if (quality < 0.25 && isLive) boost -= 8;
  if (quality >= 0.85) boost += 4;
  return boost;
}
