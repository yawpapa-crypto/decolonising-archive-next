/**
 * Detect planning-grid / placeholder rows that must not be published.
 */

const PLACEHOLDER_PHRASES = [
  "research target",
  "developing record",
  "potential record",
  "maker to be identified",
  "institution to be identified",
  "locality to be established",
  "source lead",
  "structured research placeholder",
  "no object claim",
  "ared field-research programme",
  "ared digital preservation programme",
  "ared ghana-based research priority",
  "primary research plan",
  "research framework",
  "research_framework",
  "unverified_queue",
  "unknown / to be researched",
  "to be identified through local research",
  "to be documented",
  "to be established",
  "designed to prevent gaps",
  "this row does not assert",
  "no object claims are made",
  "field is established; this row is a system-level",
  "system-level record",
  "research lead only",
  "bank of ghana research target",
  "institutional research lead",
  "regional research target",
];

const PLACEHOLDER_RECORD_TYPES = new Set([
  "research field",
  "living visual system",
  "living and historical visual system",
  "research framework",
  "authority cluster",
  "architectural visual system",
  "research collection",
  "collection",
]);

const DISALLOWED_PUBLICATION_STATES = [
  "research target",
  "no object claim",
  "queued",
  "unverified_queue",
];

export type PlaceholderReason = {
  code: string;
  detail: string;
};

function haystack(row: Record<string, string>): string {
  return [
    row.publication_state,
    row.title,
    row.description,
    row.historical_significance,
    row.source_name,
    row.source_type,
    row.record_type,
    row.creator_or_authority,
    row.verification_notes,
    row.research_question,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isPlaceholderRow(row: Record<string, string>): PlaceholderReason | null {
  const text = haystack(row);
  const pubState = (row.publication_state ?? "").toLowerCase();

  for (const phrase of DISALLOWED_PUBLICATION_STATES) {
    if (pubState.includes(phrase)) {
      return { code: "publication_state", detail: `publication_state contains "${phrase}"` };
    }
  }

  for (const phrase of PLACEHOLDER_PHRASES) {
    if (text.includes(phrase)) {
      return { code: "templated_wording", detail: `contains "${phrase}"` };
    }
  }

  if (/research target \d/i.test(row.title ?? "")) {
    return { code: "numbered_research_target", detail: "numbered regional research target title" };
  }

  const recordType = (row.record_type ?? "").toLowerCase().trim();
  if (PLACEHOLDER_RECORD_TYPES.has(recordType)) {
    return { code: "record_type", detail: `record_type "${recordType}" is a planning row` };
  }

  if (/research target/i.test(row.title ?? "") && !row.date_start?.trim()) {
    return { code: "template_title", detail: "research target title without verified date" };
  }

  const creator = (row.creator_or_authority ?? "").toLowerCase();
  if (
    creator.includes("unknown / to be researched") ||
    creator === "to be identified" ||
    creator.includes("to be identified")
  ) {
    if (!row.source_url?.includes("metmuseum.org") && !row.source_url?.includes("britishmuseum.org")) {
      return { code: "unknown_creator", detail: "creator not identified" };
    }
  }

  if ((row.source_name ?? "").toLowerCase().includes("research target")) {
    return { code: "source_lead", detail: "source is a research lead not an authoritative record" };
  }

  if ((row.source_url ?? "").trim() === "https://ared.design/" && !row.record_id?.endsWith("00050")) {
    return { code: "ared_placeholder_source", detail: "ARED homepage used as sole source without object claim" };
  }

  return null;
}

/** Seed rows 00001–00050 that are field/system/framework records, not publishable objects. */
export function isSystemOrFieldRecord(row: Record<string, string>): boolean {
  const recordType = (row.record_type ?? "").toLowerCase();
  if (PLACEHOLDER_RECORD_TYPES.has(recordType)) return true;
  if (recordType.includes("visual system")) return true;
  if (recordType === "institution" && !(row.source_url ?? "").includes(".edu.gh")) return false;
  if (recordType === "collection" && !(row.source_url ?? "").includes("museum")) return true;
  if (recordType === "exhibition" && !(row.secondary_source_url ?? "").trim()) return true;
  return false;
}

export function isPublishableRecordType(recordType: string): boolean {
  const t = recordType.toLowerCase().trim();
  return !PLACEHOLDER_RECORD_TYPES.has(t) && !t.includes("visual system") && t !== "research framework";
}
