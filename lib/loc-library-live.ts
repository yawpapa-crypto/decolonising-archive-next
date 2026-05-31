import type { LibraryOfCongressRecord } from "@/lib/search/library-of-congress";

/** Map LoC JSON search rows to the live-record shape expected by `public/assets/js/app.js`. */
export function libraryOfCongressRecordToLibraryLive(
  record: LibraryOfCongressRecord,
): Record<string, unknown> {
  const creators = record.creators.length ? record.creators.join(", ") : "Library of Congress";
  const summary =
    record.description ||
    `${record.mediaTypes.slice(0, 3).join(", ") || record.type} from the Library of Congress.`;
  const images = record.imageUrl
    ? [{ src: record.imageUrl, alt: record.title, caption: record.mediaTypes[0] || "Library of Congress" }]
    : [];

  const hasMedia = Boolean(record.audioUrl || record.videoUrl || record.imageUrl);
  const rightsStatus = record.openAccess
    ? "Open Access"
    : record.accessRestricted
      ? "Check source"
      : "Metadata Only";

  return {
    id: record.id.startsWith("live-") ? record.id : `live-${record.id}`,
    title: record.title,
    creator: creators,
    summary: summary.slice(0, 420),
    abstract: record.description,
    description: [
      record.mediaTypes.length ? `Media: ${record.mediaTypes.join(", ")}.` : "",
      record.subjects.length ? `Subjects: ${record.subjects.slice(0, 6).join("; ")}.` : "",
      record.rights ? `Rights: ${record.rights}.` : "",
    ].filter(Boolean),
    period: record.year,
    type: record.type,
    cat: "Library of Congress media & archives",
    region: record.region || inferRegionFromSubjects(record),
    country: record.country,
    collection: record.decolonialSignal
      ? "Library of Congress · decolonial scope match"
      : "Library of Congress live discovery",
    institution: "Library of Congress",
    source: "Library of Congress",
    sourceName: "Library of Congress",
    sourceUrl: record.url,
    sourceActionLabel: "View at Library of Congress",
    rights: record.rights || "Check rights at Library of Congress source record.",
    rightsStatus,
    rights_statement: record.rights,
    accessType: hasMedia ? (record.videoUrl || record.audioUrl ? "External Link Only" : "Thumbnail Only") : "Metadata Only",
    access_restricted: record.accessRestricted,
    culturalSensitivity: record.culturalSensitivity || "Public",
    verificationStatus: "Source Checked",
    externalLinks: [
      record.videoUrl ? { label: "Video", url: record.videoUrl } : null,
      record.audioUrl ? { label: "Audio", url: record.audioUrl } : null,
    ].filter(Boolean),
    language: record.language,
    tags: uniqueValues([
      ...record.subjects.slice(0, 8),
      ...record.mediaTypes,
      record.decolonialSignal ? "Decolonial scope" : "",
    ]),
    themes: uniqueValues(record.subjects.slice(0, 6)),
    concepts: uniqueValues(record.subjects.slice(0, 6)),
    mediaTypes: record.mediaTypes,
    imageUrl: record.imageUrl,
    audioUrl: record.audioUrl,
    videoUrl: record.videoUrl,
    images,
    provenance: "Live metadata from Library of Congress JSON search API (www.loc.gov/search).",
    citation: `${creators}. ${record.title}${record.year ? ` (${record.year})` : ""}. Library of Congress.`,
    notes: [
      record.decolonialSignal
        ? "Decolonial mode: boosted for Africa, Indigenous, diaspora, oral history, or related scope."
        : "External Library of Congress record — confirm metadata and rights at source.",
    ],
    recordIdentifier: record.locItemId || record.id.replace(/^loc:/, ""),
    archiveIdentifier: record.locItemId || record.id,
    resultMode: "live",
    resultKind: record.resultKind,
    trustScore: 0.9,
    liveSourceHint: "library-of-congress",
    unifiedSourceKey: "library-of-congress",
    relevanceScore: record.relevanceScore,
    unifiedRelevanceScore: record.relevanceScore,
    openAccess: record.openAccess,
    decolonialSignal: record.decolonialSignal,
    raw: undefined,
  };
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    output.push(trimmed);
  }
  return output;
}

function inferRegionFromSubjects(record: LibraryOfCongressRecord): string {
  const text = [...record.subjects, record.country, record.title].join(" ").toLowerCase();
  if (/africa|african|ghana|nigeria|kenya|ethiopia|south africa|swahili|yoruba/.test(text)) return "Africa / Pan-African";
  if (/caribbean|jamaica|haiti|diaspora/.test(text)) return "Caribbean / Diaspora";
  if (/indigenous|native american|aboriginal|first nations|pacific|maori/.test(text)) return "Indigenous / Pacific";
  if (/latin america|mexico|brazil|peru|andean/.test(text)) return "Latin America";
  if (/south asia|india|bengal|punjab/.test(text)) return "South Asia";
  return "Global / Comparative";
}
