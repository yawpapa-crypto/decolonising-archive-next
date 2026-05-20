import type { ArchiveRecord } from "@/lib/records";
import type {
  IntelligenceItem,
  PrismaFlowCounts,
  ReviewIntelligenceKpis,
  ReviewProject,
  ReviewScreeningRecord,
  ReviewScreeningStatus,
} from "@/lib/workbench-intelligence-types";

type ReviewProjectRow = {
  id: string;
  title: string;
  review_type: string;
  research_question: string | null;
  inclusion_criteria: string | null;
  exclusion_criteria: string | null;
  search_strings: unknown;
  databases_searched: unknown;
  date_range_start: string | null;
  date_range_end: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ScreeningRow = {
  id: string;
  review_project_id: string;
  record_id: string;
  screening_status: ReviewScreeningStatus;
  exclusion_reason: ReviewScreeningRecord["exclusionReason"];
  notes: string | null;
  updated_at: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

const REVIEW_TYPES = new Set([
  "systematic_review",
  "scoping_review",
  "mapping_review",
  "narrative_review",
]);

export function mapReviewProjectRow(row: ReviewProjectRow): ReviewProject {
  const reviewType = REVIEW_TYPES.has(row.review_type) ?
    (row.review_type as ReviewProject["reviewType"])
  : "systematic_review";

  return {
    id: row.id,
    title: row.title,
    reviewType,
    researchQuestion: row.research_question,
    inclusionCriteria: row.inclusion_criteria,
    exclusionCriteria: row.exclusion_criteria,
    searchStrings: asStringArray(row.search_strings),
    databasesSearched: asStringArray(row.databases_searched),
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    notes: row.notes,
    status: row.status as ReviewProject["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildPrismaCounts(screenings: ScreeningRow[]): PrismaFlowCounts {
  const identified = screenings.length;
  const duplicatesRemoved = screenings.filter((s) => s.exclusion_reason === "duplicate").length;
  const excluded = screenings.filter((s) => s.screening_status === "excluded").length;
  const screened = screenings.filter((s) =>
    ["included", "excluded", "full_text_review", "final_included"].includes(s.screening_status),
  ).length;
  const fullTextAssessed = screenings.filter((s) =>
    ["full_text_review", "final_included"].includes(s.screening_status),
  ).length;
  const finalIncluded = screenings.filter((s) => s.screening_status === "final_included").length;
  const awaitingScreening = screenings.filter((s) =>
    ["imported", "title_abstract_screening"].includes(s.screening_status),
  ).length;

  return {
    recordsIdentified: identified,
    duplicatesRemoved,
    recordsScreened: screened,
    recordsExcluded: excluded,
    fullTextAssessed,
    finalIncluded,
    awaitingScreening,
  };
}

export function buildReviewScreeningRecords(input: {
  screenings: ScreeningRow[];
  items: IntelligenceItem[];
  archiveRecords: ArchiveRecord[];
}): ReviewScreeningRecord[] {
  const itemByRecord = new Map(
    input.items.filter((item) => item.recordId).map((item) => [item.recordId as string, item]),
  );
  const recordById = new Map(input.archiveRecords.map((record) => [record.id, record]));

  return input.screenings.map((screening) => {
    const item = itemByRecord.get(screening.record_id);
    const record = recordById.get(screening.record_id);
    const method = (record?.recordType?.[0] as string | undefined) ?? null;

    return {
      id: screening.id,
      projectId: screening.review_project_id,
      recordId: screening.record_id,
      title: item?.title ?? record?.title ?? screening.record_id,
      creator: item?.creator ?? record?.creator ?? null,
      year: item?.year ?? record?.datePublished?.slice(0, 4) ?? null,
      source: item?.sourceLabel ?? record?.sourceName ?? null,
      doiOrUrl: record?.doi ?? record?.sourceUrl ?? null,
      country: item?.country ?? null,
      region: item?.region ?? null,
      theme: item?.theme ?? record?.knowledgeAreas?.[0] ?? null,
      method,
      openAccess: item?.openAccess ?? null,
      screeningStatus: screening.screening_status,
      exclusionReason: screening.exclusion_reason,
      notes: screening.notes,
      updatedAt: screening.updated_at,
    };
  });
}

export function buildReviewIntelligenceKpis(input: {
  reviewProjects: ReviewProject[];
  prismaCounts: PrismaFlowCounts;
  literatureReview: { themeClusters: Array<{ theme: string; total: number }>; geographySpread: Array<{ label: string; count: number; cited: number }> };
  missingMetadata: number;
}): ReviewIntelligenceKpis {
  const activeReviewProjects = input.reviewProjects.filter((p) => p.status === "active").length;
  const strongestTheme = input.literatureReview.themeClusters[0]?.theme ?? null;
  const weakestGeography =
    [...input.literatureReview.geographySpread]
      .filter((place) => place.count > 0 && place.cited === 0)
      .sort((a, b) => a.count - b.count)[0]?.label ??
    input.literatureReview.geographySpread.at(-1)?.label ??
    null;

  return {
    activeReviewProjects,
    awaitingScreening: input.prismaCounts.awaitingScreening,
    finalIncludedRecords: input.prismaCounts.finalIncluded,
    strongestTheme,
    weakestGeography,
    missingMetadata: input.missingMetadata,
  };
}

export const REVIEW_TYPE_LABELS: Record<ReviewProject["reviewType"], string> = {
  systematic_review: "Systematic review",
  scoping_review: "Scoping review",
  mapping_review: "Mapping review",
  narrative_review: "Narrative review",
};

export const SCREENING_STATUS_LABELS: Record<ReviewScreeningStatus, string> = {
  imported: "Imported",
  title_abstract_screening: "Title/abstract screening",
  included: "Included",
  excluded: "Excluded",
  full_text_review: "Full-text review",
  final_included: "Final dataset",
};

export const EXCLUSION_REASON_LABELS: Record<
  NonNullable<ReviewScreeningRecord["exclusionReason"]>,
  string
> = {
  wrong_topic: "Wrong topic",
  wrong_geography: "Wrong geography",
  wrong_method: "Wrong method",
  duplicate: "Duplicate",
  no_full_text: "No full text",
  outside_date_range: "Outside date range",
  other: "Other",
};
