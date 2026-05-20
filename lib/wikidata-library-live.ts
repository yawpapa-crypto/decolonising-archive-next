import type { WikidataEntityResult } from "@/lib/search/wikidata";

/** Map Wikidata entity row to the live-record shape expected by `public/assets/js/app.js`. */
export function wikidataEntityToLibraryLive(
  entity: WikidataEntityResult,
  index = 0,
): Record<string, unknown> {
  const qid = entity.id.replace(/^wikidata:/i, "");
  const description = entity.description || entity.subtitle || "";
  const summary = description
    ? description.slice(0, 420)
    : "Knowledge graph entity from Wikidata.";

  return {
    id: `live-wikidata-${qid || index}`,
    title: entity.title,
    creator: description || "Wikidata",
    summary,
    abstract: description,
    description: [description, "Wikidata knowledge graph entity"].filter(Boolean),
    type: "Entity",
    cat: "Knowledge graph",
    region: "Global / Comparative",
    country: "",
    community: "",
    period: "",
    concepts: [],
    themes: ["Knowledge graph", "Entity discovery"],
    tags: ["Wikidata", qid].filter(Boolean),
    rights: "External source rights apply",
    rightsStatus: "Check source",
    licence: "",
    accessType: "External Link Only",
    reusePermission: "Check Original Source",
    culturalSensitivity: "Public",
    communityReviewStatus: "Not Required",
    verificationStatus: "Source Checked",
    provenance: "Entity metadata from Wikidata wbsearchentities.",
    source: "Wikidata",
    sourceName: "Wikidata",
    collection: "Wikidata entity discovery",
    institution: "Wikidata",
    language: [],
    sourceUrl: entity.url,
    sourceActionLabel: "Open on Wikidata",
    externalLinks: [{ label: "Wikidata", url: entity.url }],
    sourcePathways: ["Wikidata API", "Knowledge graph"],
    notes: ["External knowledge graph entity. Not an archive-held record."],
    archiveIdentifier: qid ? `WD-${qid}` : "",
    recordIdentifier: qid,
    citation: `${entity.title}. Wikidata (${qid}).`,
    resultMode: "live",
    trustScore: 0.84,
    liveSourceHint: "wikidata",
    unifiedRelevanceScore: entity.relevanceScore,
  };
}
