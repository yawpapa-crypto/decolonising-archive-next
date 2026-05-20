import type { ScholarlySearchResult } from "@/lib/scholarly-search";

/** Map scholarly index row to the live-record shape expected by `public/assets/js/app.js`. */
export function scholarlyResultToLibraryLive(
  item: ScholarlySearchResult,
  index = 0,
): Record<string, unknown> {
  const abstract = item.abstract || "";
  const journal = item.journal || "";
  const publisher = item.publisher || "";
  const year = item.year || "";
  const doi = item.doi || "";
  const openAlexId = item.id.replace(/^openalex-/, "");
  const sourceUrl = item.url || (doi ? `https://doi.org/${doi}` : "");
  const externalLinks: Array<{ label: string; url: string }> = [];
  if (openAlexId) {
    externalLinks.push({
      label: "OpenAlex",
      url: openAlexId.startsWith("http") ? openAlexId : `https://openalex.org/${openAlexId}`,
    });
  }
  if (doi) externalLinks.push({ label: "DOI", url: `https://doi.org/${doi}` });

  return {
    id: `live-openalex-${openAlexId || index}`,
    title: item.title,
    creator: item.creator,
    summary: abstract
      ? abstract.slice(0, 420)
      : `${journal || publisher || "OpenAlex"} surfaced via OpenAlex external metadata.`,
    abstract,
    description: [
      journal ? `Journal: ${journal}.` : "",
      publisher ? `Publisher: ${publisher}.` : "",
      year ? `Year: ${year}.` : "",
      item.openAccess ? "Open access record." : "",
    ].filter(Boolean),
    type: "Research paper",
    cat: "Research & scholarly metadata",
    region: "Africa / Global",
    country: "",
    community: "",
    period: year ? String(year) : "",
    concepts: [],
    themes: ["Research", item.openAccess ? "Open Access" : "Scholarly metadata"],
    tags: [item.source, journal, publisher].filter(Boolean).slice(0, 8),
    rights: "External source rights apply",
    rightsStatus: item.openAccess ? "Open Access" : "Check source",
    licence: item.openAccess ? "Check source" : "",
    accessType: item.openAccess ? "Full Text Available" : "Metadata Only",
    reusePermission: "Check Original Source",
    culturalSensitivity: "Public",
    communityReviewStatus: "Not Required",
    verificationStatus: "Source Checked",
    provenance: "External scholarly metadata pulled from OpenAlex.",
    source: "OpenAlex",
    collection: "OpenAlex external discovery",
    institution: journal || publisher || "OpenAlex",
    language: [],
    sourceUrl,
    pdf_url: "",
    full_text_url: sourceUrl,
    html_url: sourceUrl,
    sourceActionLabel: "Open source record",
    externalLinks,
    sourcePathways: ["OpenAlex API", "External source adapter"],
    notes: ["External-source research metadata from OpenAlex."],
    archiveIdentifier: openAlexId ? `OA-${openAlexId}` : "",
    recordIdentifier: openAlexId,
    citation: item.citationLine,
    resultMode: "live",
    trustScore: 0.86,
    liveSourceHint: "openalex",
    open_access: item.openAccess,
    is_oa: item.openAccess,
  };
}
