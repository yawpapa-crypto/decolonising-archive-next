import type { ReviewProjectType, ReviewScreeningStatus } from "@/lib/workbench-intelligence-types";

export const REVIEW_TYPES: Array<{ value: ReviewProjectType; label: string }> = [
  { value: "systematic_review", label: "Systematic review" },
  { value: "scoping_review", label: "Scoping review" },
  { value: "rapid_review", label: "Rapid review" },
  { value: "evidence_map", label: "Evidence map" },
  { value: "mapping_review", label: "Mapping review" },
  { value: "narrative_review", label: "Narrative review" },
];

export const QUESTION_TYPES = [
  { value: "pico", label: "Intervention (PICO)" },
  { value: "pcc", label: "Concept (PCC)" },
  { value: "qualitative", label: "Qualitative" },
  { value: "mixed", label: "Mixed methods" },
  { value: "exploratory", label: "Exploratory" },
];

export const RESEARCH_AREAS = [
  { value: "decolonial_design", label: "Decolonial design" },
  { value: "cultural_memory", label: "Cultural memory" },
  { value: "indigenous_knowledge", label: "Indigenous knowledge" },
  { value: "archive_studies", label: "Archive studies" },
  { value: "visual_culture", label: "Visual culture" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other / mixed" },
];

export const REVIEW_PURPOSES = [
  { value: "thesis", label: "Thesis or dissertation" },
  { value: "publication", label: "Publication" },
  { value: "practice", label: "Practice review" },
  { value: "teaching", label: "Teaching resource" },
  { value: "policy", label: "Policy brief" },
];

export const IMPORT_SOURCES = [
  { value: "openalex", label: "OpenAlex" },
  { value: "scopus", label: "Scopus export" },
  { value: "pubmed", label: "PubMed" },
  { value: "trove", label: "Trove" },
  { value: "core", label: "CORE" },
  { value: "manual", label: "Manual / other" },
];

export const IMPORT_TARGETS = [
  { value: "title_abstract_screening", label: "Title and abstract screening" },
  { value: "full_text_review", label: "Full text review" },
  { value: "extraction", label: "Extraction" },
];

export function reviewTypeLabel(value: ReviewProjectType) {
  return REVIEW_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function statusLabel(value: ReviewScreeningStatus) {
  const labels: Record<ReviewScreeningStatus, string> = {
    imported: "Awaiting screening",
    title_abstract_screening: "Title and abstract",
    included: "Included",
    excluded: "Excluded",
    maybe: "Maybe",
    full_text_review: "Full text",
    final_included: "Included in review",
  };
  return labels[value] ?? value;
}

const REVIEW_DATE_FORMAT = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatReviewDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return REVIEW_DATE_FORMAT.format(date);
}

export function resultMessage(result: { ok: boolean; error?: string }, success: string) {
  return result.ok ? success : result.error ?? "Something went wrong.";
}

export function reviewStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return status.replace(/_/g, " ");
}
