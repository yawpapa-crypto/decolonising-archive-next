import type { IntelligenceItem } from "@/lib/workbench-intelligence-types";

export type PipelineStage = {
  id: string;
  label: string;
  count: number;
  color: string;
  description: string;
};

type SlrStage = "identification" | "screening" | "eligibility" | "included" | "synthesis";

const STAGE_ORDER: SlrStage[] = [
  "identification",
  "screening",
  "eligibility",
  "included",
  "synthesis",
];

function slrStageForItem(item: IntelligenceItem): SlrStage {
  if (item.usedInWriting || item.status === "used") return "synthesis";
  if (item.cited || item.status === "cited") return "included";
  if (
    item.projectId ||
    item.status === "ready" ||
    item.status === "reviewing" ||
    item.collections.includes("project_records")
  ) {
    return "eligibility";
  }
  if (
    item.source === "reading_list" ||
    item.readingListId ||
    item.collections.includes("reading_list_records")
  ) {
    return "screening";
  }
  return "identification";
}

export function derivePipelineStages(items: IntelligenceItem[]): PipelineStage[] {
  const byRecord = new Map<string, SlrStage>();

  for (const item of items) {
    if (!item.recordId) continue;
    const stage = slrStageForItem(item);
    const existing = byRecord.get(item.recordId);
    if (!existing || STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(existing)) {
      byRecord.set(item.recordId, stage);
    }
  }

  const counts: Record<SlrStage, number> = {
    identification: 0,
    screening: 0,
    eligibility: 0,
    included: 0,
    synthesis: 0,
  };

  for (const stage of byRecord.values()) {
    counts[stage] += 1;
  }

  return [
    {
      id: "identification",
      label: "Identification",
      count: counts.identification,
      color: "#94a3b8",
      description: "Saved to your workbench",
    },
    {
      id: "screening",
      label: "Screening",
      count: counts.screening,
      color: "#3b82f6",
      description: "Organised in reading lists",
    },
    {
      id: "eligibility",
      label: "Eligibility",
      count: counts.eligibility,
      color: "#f59e0b",
      description: "Linked to projects and under review",
    },
    {
      id: "included",
      label: "Included",
      count: counts.included,
      color: "#10b981",
      description: "Cited in notes",
    },
    {
      id: "synthesis",
      label: "Synthesis",
      count: counts.synthesis,
      color: "#0f3d2e",
      description: "Used in writing or export",
    },
  ];
}
