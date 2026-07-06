import type { ArchiveRecord } from "@/lib/records";
import { buildIntelligenceMetricsBundle } from "@/lib/workbench-intelligence-metrics";
import type {
  IntelligenceDashboardPayload,
  IntelligenceDistributionEntry,
  IntelligenceSnapshot,
} from "@/lib/workbench-intelligence-types";

function facetsToDistribution(
  options: Array<{ label: string; count: number }>,
  total: number,
): IntelligenceDistributionEntry[] {
  return options.map((entry) => ({
    label: entry.label,
    count: entry.count,
    percent: total ? Math.round((entry.count / total) * 100) : 0,
  }));
}

export function buildIntelligenceDashboardPayload(
  snapshot: IntelligenceSnapshot,
  archiveRecords: ArchiveRecord[] = [],
): IntelligenceDashboardPayload {
  const metrics = buildIntelligenceMetricsBundle(snapshot, archiveRecords);
  const recordTotal = snapshot.items.filter((item) => item.recordId).length;

  return {
    overview: metrics.overview,
    sourceDistribution: metrics.sourceDistribution,
    typeDistribution: facetsToDistribution(snapshot.facets.types, recordTotal),
    timeline: metrics.temporalCoverage,
    geography: metrics.geographicCoverage,
    reviews: metrics.reviewIntelligence,
    citations: metrics.citationIntelligence,
    warnings: snapshot.gaps,
    records: snapshot.items,
  };
}
