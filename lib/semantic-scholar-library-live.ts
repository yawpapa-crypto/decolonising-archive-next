import type { SemanticScholarPaperResult } from "@/lib/search/semantic-scholar";

const SCHOLARLY_CONCEPT_PATTERNS: Array<{ pattern: RegExp; labels: string[] }> = [
  {
    pattern: /critical consciousness|conscientization|conscientização|banking education/i,
    labels: ["Critical consciousness", "Liberation pedagogy"],
  },
  {
    pattern: /freire|pedagogy of the oppressed/i,
    labels: ["Paulo Freire", "Critical pedagogy"],
  },
  {
    pattern: /fanon|wretched of the earth|black skin/i,
    labels: ["Frantz Fanon", "Anti-colonial theory"],
  },
  {
    pattern: /black consciousness|steve biko|\bbiko\b/i,
    labels: ["Black consciousness", "Steve Biko"],
  },
  {
    pattern: /ubuntu|communal personhood/i,
    labels: ["Ubuntu ethics", "African philosophy"],
  },
  {
    pattern: /decolonial|decoloniz|epistemic injustice/i,
    labels: ["Decolonial theory"],
  },
  {
    pattern: /pan-african|nkrumah|padmore/i,
    labels: ["Pan-Africanism"],
  },
  {
    pattern: /oral history|testimony|memory work/i,
    labels: ["Oral history", "Community archiving"],
  },
];

function inferScholarlyConcepts(title: string, abstract: string): string[] {
  const text = `${title} ${abstract}`;
  const concepts: string[] = [];
  for (const entry of SCHOLARLY_CONCEPT_PATTERNS) {
    if (entry.pattern.test(text)) concepts.push(...entry.labels);
  }
  return [...new Set(concepts)];
}

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
  const concepts = inferScholarlyConcepts(paper.title, abstract);
  const externalLinks: Array<{ label: string; url: string }> = [
    { label: "Semantic Scholar", url: paper.url },
  ];
  if (doi) externalLinks.push({ label: "DOI", url: `https://doi.org/${doi}` });

  const summary = abstract
    ? abstract.length > 420
      ? `${abstract.slice(0, 417).trim()}…`
      : abstract
    : `${creators}${year ? ` (${year})` : ""}. ${venue || "Scholarly paper"} — open the original source for the full text.`;

  return {
    id: `live-semantic-scholar-${paperId || index}`,
    title: paper.title,
    creator: creators,
    summary,
    abstract,
    description: abstract
      ? []
      : [
          venue ? `Venue: ${venue}.` : "",
          year ? `Year: ${year}.` : "",
          paper.citationCount != null ? `Citations: ${paper.citationCount}.` : "",
        ].filter(Boolean),
    type: "Research paper",
    cat: "Research & scholarly metadata",
    region: "Africa / Global",
    country: "",
    community: "",
    period: year,
    concepts,
    themes: ["Research", paper.isOpenAccess ? "Open Access" : "Scholarly metadata", ...concepts].slice(0, 8),
    tags: ["Semantic Scholar", venue, doi, ...concepts].filter(Boolean).slice(0, 10),
    rights: "External source rights apply",
    rightsStatus: paper.isOpenAccess ? "Open Access" : "Metadata Only",
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
    sourceActionLabel: paper.openAccessUrl ? "Open full text" : "Open on Semantic Scholar",
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
