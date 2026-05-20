import type {
  IntelligenceCollection,
  IntelligenceFacetFilters,
  IntelligenceFilter,
  IntelligenceItem,
  IntelligenceLiteratureReview,
} from "@/lib/workbench-intelligence-types";
import { placeId } from "@/lib/workbench-intelligence-geo";

export function filterIntelligenceItems(
  items: IntelligenceItem[],
  options: {
    filter: IntelligenceFilter;
    search: string;
    collectionId?: string | null;
    facets?: IntelligenceFacetFilters;
  },
): IntelligenceItem[] {
  const q = options.search.trim().toLowerCase();
  const facets = options.facets ?? {};

  return items.filter((item) => {
    if (options.collectionId && !item.collections.includes(options.collectionId)) {
      return false;
    }

    if (options.filter !== "all") {
      switch (options.filter) {
        case "unsorted":
          if (!item.collections.includes("unsorted_records")) return false;
          break;
        case "bookmarks":
          if (item.source !== "bookmark") return false;
          break;
        case "reading_lists":
          if (item.source !== "reading_list" && !item.collections.includes("reading_list_records")) {
            return false;
          }
          break;
        case "projects":
          if (!item.projectId && !item.collections.includes("project_records")) return false;
          break;
        case "cited":
          if (!item.cited) return false;
          break;
        case "uncited":
          if (item.cited || !item.recordId) return false;
          break;
        case "needs_metadata":
          if (!item.collections.includes("missing_metadata")) return false;
          break;
        case "questions":
          if (!item.collections.includes("open_questions")) return false;
          break;
        case "images":
          if (!item.collections.includes("image_records")) return false;
          break;
        case "tasks":
          if (item.type !== "task") return false;
          break;
        case "needs_action":
          if (
            !item.collections.some((collection) =>
              [
                "unsorted_records",
                "uncited_records",
                "needs_citation",
                "missing_metadata",
                "images_missing_alt",
                "board_not_sent_to_document",
                "open_questions",
                "needs_cultural_care",
              ].includes(collection),
            )
          ) {
            return false;
          }
          break;
        default:
          break;
      }
    }

    if (facets.year && item.year !== facets.year) return false;

    if (facets.type && item.recordType !== facets.type && item.type !== facets.type) {
      return false;
    }

    if (facets.openAccess === "open" && item.openAccess !== true) return false;
    if (facets.openAccess === "closed" && item.openAccess !== false) return false;
    if (facets.openAccess === "unknown" && item.openAccess != null) return false;

    if (facets.theme && item.theme !== facets.theme) return false;

    if (facets.creator && item.creator !== facets.creator) return false;

    if (facets.institution && item.institution !== facets.institution) return false;

    if (facets.sourceDatabase && item.sourceLabel !== facets.sourceDatabase) return false;

    if (facets.status && item.status !== facets.status) return false;

    if (facets.continent && item.continent !== facets.continent) return false;

    if (facets.region && item.region !== facets.region) return false;

    if (facets.country && item.country !== facets.country) return false;

    if (facets.city && item.city !== facets.city) return false;

    if (facets.diaspora === true && !item.diaspora) return false;
    if (facets.diaspora === false && item.diaspora) return false;

    if (facets.placeId && !item.placeIds?.includes(facets.placeId)) {
      const derivedIds: string[] = [];
      if (item.continent) derivedIds.push(placeId("continent", item.continent));
      if (item.region) derivedIds.push(placeId("region", item.region));
      if (item.country) derivedIds.push(placeId("country", item.country));
      if (item.city) derivedIds.push(placeId("city", item.city));
      if (item.diaspora) derivedIds.push(placeId("diaspora", "African Diaspora"));
      if (!derivedIds.includes(facets.placeId)) return false;
    }

    if (!q) return true;
    const haystack = [
      item.title,
      item.subtitle,
      item.creator,
      item.date,
      item.year,
      item.sourceLabel,
      item.projectTitle,
      item.readingListTitle,
      item.noteTitle,
      item.type,
      item.source,
      item.status,
      item.continent,
      item.region,
      item.country,
      item.city,
      item.institution,
      item.theme,
      item.recordType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function reviewScreeningToCsv(records: import("@/lib/workbench-intelligence-types").ReviewScreeningRecord[]) {
  const header = [
    "Title",
    "Authors",
    "Year",
    "Source",
    "DOI/URL",
    "Country",
    "Region",
    "Theme",
    "Method",
    "Open Access",
    "Status",
    "Exclusion Reason",
    "Notes",
    "Record ID",
  ];
  const rows = records.map((row) =>
    [
      row.title,
      row.creator ?? "",
      row.year ?? "",
      row.source ?? "",
      row.doiOrUrl ?? "",
      row.country ?? "",
      row.region ?? "",
      row.theme ?? "",
      row.method ?? "",
      row.openAccess == null ? "" : row.openAccess ? "yes" : "no",
      row.screeningStatus,
      row.exclusionReason ?? "",
      row.notes ?? "",
      row.recordId,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function intelligenceItemsToCsv(items: IntelligenceItem[]) {
  const header = [
    "Title",
    "Source",
    "Continent",
    "Region",
    "Country",
    "City",
    "Institution",
    "Theme",
    "Status",
    "Confidence",
    "Open Access",
    "Engagement",
    "Last synced",
    "Type",
    "Cited",
    "Project",
    "Record ID",
  ];
  const rows = items.map((item) =>
    [
      item.title,
      item.sourceLabel ?? item.source,
      item.continent ?? "",
      item.region ?? "",
      item.country ?? "",
      item.city ?? "",
      item.institution ?? "",
      item.theme ?? "",
      item.status,
      item.confidence ?? "",
      item.openAccess == null ? "" : item.openAccess ? "yes" : "no",
      item.engagementScore ?? "",
      item.lastSynced ?? "",
      item.type,
      item.cited ? "yes" : "no",
      item.projectTitle ?? "",
      item.recordId ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function literatureReviewToCsv(
  review: IntelligenceLiteratureReview,
  items: IntelligenceItem[],
) {
  const summary = [
    "Metric,Value",
    `Unique records,${review.uniqueRecords}`,
    `Cited,${review.citedCount}`,
    `Uncited,${review.uncitedCount}`,
    `Used in writing,${review.usedInWritingCount}`,
    `In reading lists,${review.inReadingLists}`,
    `In projects,${review.inProjects}`,
    `SLR readiness %,${review.slrReadinessPercent}`,
    "",
    "Theme,Total,Cited,Countries",
    ...review.themeClusters.map(
      (row) =>
        `"${row.theme.replace(/"/g, '""')}",${row.total},${row.cited},"${row.countries.join("; ")}"`,
    ),
    "",
    "Year,Count,Cited",
    ...review.yearSpread.map((row) => `${row.year},${row.count},${row.cited}`),
    "",
    "Geography,Kind,Count,Cited",
    ...review.geographySpread.map(
      (row) => `"${row.label.replace(/"/g, '""')}",${row.kind},${row.count},${row.cited}`,
    ),
    "",
    intelligenceItemsToCsv(items.filter((item) => item.recordId)),
  ];
  return summary.join("\n");
}

export function literatureReviewToJson(
  review: IntelligenceLiteratureReview,
  items: IntelligenceItem[],
) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: review,
      records: items
        .filter((item) => item.recordId)
        .map((item) => ({
          recordId: item.recordId,
          title: item.title,
          creator: item.creator,
          year: item.year,
          theme: item.theme,
          country: item.country,
          region: item.region,
          status: item.status,
          cited: item.cited,
          usedInWriting: item.usedInWriting,
          engagementScore: item.engagementScore,
          source: item.sourceLabel ?? item.source,
        })),
    },
    null,
    2,
  );
}

export function intelligenceItemsToMarkdown(
  items: IntelligenceItem[],
  collections: IntelligenceCollection[],
) {
  const lines = ["# Research Intelligence summary", ""];
  for (const collection of collections) {
    if (!collection.itemIds.length) continue;
    lines.push(`## ${collection.title}`, "", collection.description, "");
    for (const id of collection.itemIds.slice(0, 25)) {
      const item = items.find((entry) => entry.id === id);
      if (!item) continue;
      lines.push(`- **${item.title}** (${item.type}, ${item.status})`);
    }
    if (collection.itemIds.length > 25) {
      lines.push(`- …and ${collection.itemIds.length - 25} more`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export const EMPTY_FACETS: IntelligenceFacetFilters = {
  year: null,
  type: null,
  openAccess: null,
  theme: null,
  creator: null,
  institution: null,
  continent: null,
  region: null,
  country: null,
  city: null,
  diaspora: null,
  placeId: null,
  sourceDatabase: null,
  status: null,
};
