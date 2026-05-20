import type { SemanticScholarPaperResult } from "@/lib/search/semantic-scholar";

/** Map Semantic Scholar paper row to the live-record shape expected by `public/assets/js/app.js`. */
export function semanticScholarPaperToLibraryLive(
  paper: SemanticScholarPaperResult,
  index = 0,
): Record<string, unknown> {
  const paperId = paper.id.replace(/^semantic-scholar:/i, "");
  const abstract = paper.description || "";
  const creators = paper.authors.length ? paper.authors.join(", ") : "Unknown author";
  const year = paper.year != null ? String(paper.year) : "";
  const venue = paper.venue || paper.subtitle || "";
  const doi = paper.doi || "";
  const sourceUrl = paper.openAccessUrl || paper.url;
  const externalLinks: Array<{ label: string; url: string }> = [
    { label: "Semantic Scholar", url: paper.url },
  ];
  if (doi) externalLinks.push({ label: "DOI", url: `https://doi.org/${doi}` });

  return {
    id: `live-semantic-scholar-${paperId || index}`,
    title: paper.title,
    creator: creators,
    summary: abstract
      ? abstract.slice(0, 420)
      : `${venue || "Semantic Scholar"} surfaced via Semantic Scholar metadata.`,
    abstract,
    description: [
      venue ? `Venue: ${venue}.` : "",
      year ? `Year: ${year}.` : "",
      paper.citationCount != null ? `Citations: ${paper.citationCount}.` : "",
      paper.isOpenAccess ? "Open access record." : "",
    ].filter(Boolean),
    type: "Research paper",
    cat: "Research & scholarly metadata",
    region: "Africa / Global",
    country: "",
    community: "",
    period: year,
    concepts: [],
    themes: ["Research", paper.isOpenAccess ? "Open Access" : "Scholarly metadata"],
    tags: ["Semantic Scholar", venue, doi].filter(Boolean).slice(0, 8),
    rights: "External source rights apply",
    rightsStatus: paper.isOpenAccess ? "Open Access" : "Check source",
    licence: paper.isOpenAccess ? "Check source" : "",
    accessType: paper.isOpenAccess ? "Full Text Available" : "Metadata Only",
    reusePermission: "Check Original Source",
    culturalSensitivity: "Public",
    communityReviewStatus: "Not Required",
    verificationStatus: "Source Checked",
    provenance: "External scholarly metadata pulled from Semantic Scholar.",
    source: "Semantic Scholar",
    sourceName: "Semantic Scholar",
    collection: "Semantic Scholar external discovery",
    institution: venue || "Semantic Scholar",
    language: [],
    sourceUrl,
    pdf_url: paper.openAccessUrl || "",
    full_text_url: sourceUrl,
    html_url: paper.url,
    sourceActionLabel: "Open on Semantic Scholar",
    externalLinks,
    sourcePathways: ["Semantic Scholar API", "External source adapter"],
    notes: ["External-source research metadata from Semantic Scholar."],
    archiveIdentifier: paperId ? `S2-${paperId}` : "",
    recordIdentifier: paperId,
    doi,
    citation: [
      creators,
      year ? `(${year})` : "",
      paper.title,
      venue,
      "Semantic Scholar",
    ]
      .filter(Boolean)
      .join(". ")
      .replace(/\.\s*\./g, ".") + ".",
    resultMode: "live",
    trustScore: 0.88,
    liveSourceHint: "semantic-scholar",
    open_access: paper.isOpenAccess,
    is_oa: paper.isOpenAccess,
    unifiedRelevanceScore: paper.relevanceScore,
  };
}
