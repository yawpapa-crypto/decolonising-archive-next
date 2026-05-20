import type { ArchiveRecord } from "@/lib/records";
import { matchSourceDatabase, isOpenAccessRecord } from "@/lib/workbench-intelligence-enrich";
import type {
  CitationIntelligence,
  GeographicCoverage,
  IntelligenceDistributionEntry,
  IntelligenceOverviewMetrics,
  IntelligenceRecommendation,
  IntelligenceSnapshot,
  ReviewIntelligenceDetail,
  SourceIntelligence,
  TemporalCoverage,
} from "@/lib/workbench-intelligence-types";

const EXTERNAL_SOURCE_IDS = new Set([
  "openalex",
  "core",
  "crossref",
  "semantic-scholar",
  "wikidata",
  "trove",
  "smithsonian",
  "aodl",
  "europeana",
  "loc",
]);

const ARCHIVE_SOURCE_IDS = new Set(["aodl", "smithsonian", "trove", "archive", "loc", "europeana"]);

const SOURCE_LABELS: Record<string, string> = {
  archive: "Internal archive",
  openalex: "OpenAlex",
  core: "CORE",
  crossref: "Crossref",
  "semantic-scholar": "Semantic Scholar",
  wikidata: "Wikidata",
  trove: "Trove",
  smithsonian: "Smithsonian",
  aodl: "AODL",
  europeana: "Europeana",
  loc: "Library of Congress",
};

function toPercent(count: number, total: number): number {
  return total ? Math.round((count / total) * 100) : 0;
}

function buildDistribution(
  counts: Map<string, number>,
  limit = 10,
): IntelligenceDistributionEntry[] {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      percent: toPercent(count, total),
    }));
}

function recordItems(snapshot: IntelligenceSnapshot) {
  return snapshot.items.filter((item) => item.recordId);
}

function userRecordsFromSnapshot(
  snapshot: IntelligenceSnapshot,
  archiveRecords: ArchiveRecord[],
): ArchiveRecord[] {
  const ids = new Set(
    snapshot.items.filter((item) => item.recordId).map((item) => item.recordId as string),
  );
  return archiveRecords.filter((record) => ids.has(record.id));
}

export function getWorkbenchIntelligenceOverview(
  snapshot: IntelligenceSnapshot,
): IntelligenceOverviewMetrics {
  const notesWithAtLeastOneCitation = new Set(
    snapshot.items.filter((item) => item.type === "citation" && item.noteId).map((item) => item.noteId),
  ).size;

  const externalRecords = recordItems(snapshot).filter(
    (item) => item.sourceDatabaseId && EXTERNAL_SOURCE_IDS.has(item.sourceDatabaseId),
  ).length;
  const recordCount = recordItems(snapshot).length;

  return {
    totalSavedRecords: snapshot.profile.totalSavedRecords,
    totalSearches: snapshot.savedSearchInsights.length,
    activeReviewProjects: snapshot.reviewKpis.activeReviewProjects,
    readingListCount: snapshot.profile.totalReadingLists,
    notesWithCitations: notesWithAtLeastOneCitation,
    totalNotes: snapshot.profile.totalNotes,
    totalCitations: snapshot.profile.totalCitations,
    openAccessPercent: snapshot.dashboard.openAccessPercent,
    externalSourcePercent: toPercent(externalRecords, recordCount),
    metadataOnlyPercent: snapshot.dashboard.metadataCompletenessPercent,
    missingMetadataWarnings: snapshot.summary.needs_metadata,
    recordsInReadingLists: snapshot.profile.recordsInReadingLists,
    recordsLinkedToProjects: snapshot.profile.recordsLinkedToProjects,
  };
}

export function getSourceDistribution(
  snapshot: IntelligenceSnapshot,
  archiveRecords: ArchiveRecord[] = [],
): SourceIntelligence {
  const records = userRecordsFromSnapshot(snapshot, archiveRecords);
  const mixCounts = new Map<string, number>();
  const mediaCounts = new Map<string, number>();
  let openAccess = 0;
  let metadataOnly = 0;
  let closed = 0;

  if (records.length) {
    for (const record of records) {
      const sourceId = matchSourceDatabase(record);
      mixCounts.set(sourceId, (mixCounts.get(sourceId) ?? 0) + 1);

      const media = record.recordType?.[0] ?? "unknown";
      mediaCounts.set(media, (mediaCounts.get(media) ?? 0) + 1);

      if (record.rightsStatus === "Metadata Only") metadataOnly += 1;
      else if (isOpenAccessRecord(record)) openAccess += 1;
      else closed += 1;
    }
  } else {
    for (const item of recordItems(snapshot)) {
      const sourceId = item.sourceDatabaseId ?? "archive";
      mixCounts.set(sourceId, (mixCounts.get(sourceId) ?? 0) + 1);
      if (item.mediaType) mediaCounts.set(item.mediaType, (mediaCounts.get(item.mediaType) ?? 0) + 1);
      if (item.openAccess === true) openAccess += 1;
      else if (item.openAccess === false) closed += 1;
      else metadataOnly += 1;
    }
  }

  const mix = buildDistribution(
    new Map(
      [...mixCounts.entries()].map(([id, count]) => [SOURCE_LABELS[id] ?? id, count]),
    ),
    12,
  );

  const total = records.length || recordItems(snapshot).length;
  const top = mix[0];
  const dominanceWarning =
    top && top.percent >= 65 ?
      `Your corpus relies heavily on ${top.label} (${top.percent}%). Consider diversifying archival and regional sources.`
    : null;

  const usedArchiveIds = new Set([...mixCounts.keys()].filter((id) => ARCHIVE_SOURCE_IDS.has(id)));
  const underusedArchives = ["AODL", "Smithsonian", "Trove"]
    .filter((label) => {
      const id = label.toLowerCase() === "aodl" ? "aodl" : label.toLowerCase();
      return !usedArchiveIds.has(id === "smithsonian" ? "smithsonian" : id);
    })
    .slice(0, 3);

  const trustIndicators = mix.slice(0, 6).map((entry) => {
    const id = Object.entries(SOURCE_LABELS).find(([, label]) => label === entry.label)?.[0] ?? "external";
    const level =
      id === "archive" || id === "aodl" || id === "smithsonian" || id === "trove" ?
        "high"
      : id === "openalex" || id === "crossref" ?
        "medium"
      : "medium";
    return {
      sourceId: id,
      label: entry.label,
      level: level as "high" | "medium" | "low",
      note:
        id === "archive" ?
          "Curated internal record with provenance review."
        : id === "openalex" ?
          "Scholarly metadata aggregator — verify primary sources."
        : "External handoff — confirm rights and context before citation.",
    };
  });

  return {
    mix,
    openAccessVsMetadataOnly: {
      openAccess: toPercent(openAccess, total),
      metadataOnly: toPercent(metadataOnly, total),
      closed: toPercent(closed, total),
    },
    mediaTypeMix: buildDistribution(mediaCounts, 8),
    dominanceWarning,
    underusedArchives,
    trustIndicators,
  };
}

export function getRecordTypeDistribution(snapshot: IntelligenceSnapshot): IntelligenceDistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of recordItems(snapshot)) {
    if (!item.recordType) continue;
    counts.set(item.recordType, (counts.get(item.recordType) ?? 0) + 1);
  }
  return buildDistribution(counts);
}

export function getTemporalCoverage(snapshot: IntelligenceSnapshot): TemporalCoverage {
  const yearSpread = snapshot.literatureReview.yearSpread.slice(0, 12);
  const years = yearSpread.map((y) => Number.parseInt(y.year, 10)).filter(Number.isFinite);
  return {
    yearSpread,
    earliestYear: years.length ? String(Math.min(...years)) : null,
    latestYear: years.length ? String(Math.max(...years)) : null,
    decadeGaps: findDecadeGaps(years),
  };
}

function findDecadeGaps(years: number[]): string[] {
  if (years.length < 2) return [];
  const decades = new Set(years.map((y) => Math.floor(y / 10) * 10));
  const min = Math.min(...decades);
  const max = Math.max(...decades);
  const gaps: string[] = [];
  for (let d = min; d <= max; d += 10) {
    if (!decades.has(d)) gaps.push(`${d}s`);
  }
  return gaps.slice(0, 4);
}

export function getGeographicCoverage(snapshot: IntelligenceSnapshot): GeographicCoverage {
  return {
    countries: snapshot.facets.countries,
    regions: snapshot.facets.regions,
    continents: snapshot.facets.continents,
    countriesCovered: snapshot.dashboard.countriesCovered,
    locationCards: snapshot.locations.slice(0, 12),
    mapPointCount: snapshot.worldMap.length,
  };
}

export function getReviewIntelligence(snapshot: IntelligenceSnapshot): ReviewIntelligenceDetail {
  const screenings = snapshot.reviewScreenings;
  const maybeCount = screenings.filter((row) => row.screeningStatus === "maybe").length;
  const databasesUsed = [
    ...new Set(snapshot.reviewProjects.flatMap((project) => project.databasesSearched)),
  ];

  return {
    ...snapshot.prismaCounts,
    activeReviewProjects: snapshot.reviewKpis.activeReviewProjects,
    maybeCount,
    unresolvedConflicts: snapshot.reviewDetail?.unresolvedConflicts ?? 0,
    extractionProgressPercent: snapshot.reviewDetail?.extractionProgressPercent ?? 0,
    reviewerWorkload: snapshot.reviewDetail?.reviewerWorkload ?? [],
    databasesUsed,
    projects: snapshot.reviewProjects.map((project) => ({
      id: project.id,
      title: project.title,
      reviewType: project.reviewType,
      status: project.status,
      databasesSearched: project.databasesSearched,
    })),
  };
}

export function getCitationIntelligence(snapshot: IntelligenceSnapshot): CitationIntelligence {
  const citations = snapshot.items.filter((item) => item.type === "citation");
  const citedRecordIds = new Set(
    citations.filter((item) => item.recordId).map((item) => item.recordId as string),
  );

  const noteIdsWithCitations = new Set(
    citations.filter((item) => item.noteId).map((item) => item.noteId as string),
  );
  const uncitedNotesCount = Math.max(0, snapshot.profile.totalNotes - noteIdsWithCitations.size);

  const authorCounts = new Map<string, number>();
  let missingDoiOrUrl = 0;
  let styleIssues = 0;
  const styleSet = new Set<string>();

  for (const citation of citations) {
    if (citation.creator) {
      authorCounts.set(citation.creator, (authorCounts.get(citation.creator) ?? 0) + 1);
    }
    if (!citation.openHref && !citation.sourceLabel) missingDoiOrUrl += 1;
    const style = citation.subtitle?.trim();
    if (style) styleSet.add(style);
  }

  if (styleSet.size > 2) styleIssues = styleSet.size - 1;

  const uniqueSources = new Set(
    citations.map((item) => item.sourceLabel ?? item.source).filter(Boolean),
  );
  const weakDiversityWarning =
    citations.length >= 5 && uniqueSources.size <= 2 ?
      "Citation sources cluster around very few databases — broaden primary and archival sources."
    : null;

  const ageSpread = snapshot.literatureReview.yearSpread.slice(0, 8).map((entry) => ({
    label: entry.year,
    count: entry.cited,
    percent: entry.count ? Math.round((entry.cited / entry.count) * 100) : 0,
  }));

  const coveragePrompts: string[] = [];
  if (snapshot.dashboard.countriesCovered < 3 && snapshot.profile.totalSavedRecords >= 5) {
    coveragePrompts.push("Your cited corpus spans fewer than three countries — consider Global South and Indigenous archives.");
  }
  if (uncitedNotesCount > 0) {
    coveragePrompts.push(`${uncitedNotesCount} note${uncitedNotesCount === 1 ? "" : "s"} have no citations yet.`);
  }
  if (snapshot.summary.uncited_records >= 5) {
    coveragePrompts.push("Several saved records are not yet cited in writing.");
  }

  return {
    citedSourcesCount: citedRecordIds.size,
    totalCitations: citations.length,
    uncitedNotesCount,
    notesWithoutCitations: uncitedNotesCount,
    topAuthors: buildDistribution(authorCounts, 8),
    styleIssues,
    missingDoiOrUrl,
    weakDiversityWarning,
    sourceAgeSpread: ageSpread,
    coveragePrompts,
  };
}

export function getResearchWarnings(snapshot: IntelligenceSnapshot): IntelligenceRecommendation[] {
  const recommendations: IntelligenceRecommendation[] = [];
  const sourceIntel = getSourceDistribution(snapshot);
  const citationIntel = getCitationIntelligence(snapshot);

  if (sourceIntel.dominanceWarning) {
    recommendations.push({
      id: "source-dominance",
      category: "source",
      title: "Source concentration",
      detail: sourceIntel.dominanceWarning,
      severity: "warning",
    });
  }

  for (const archive of sourceIntel.underusedArchives) {
    recommendations.push({
      id: `underused-${archive.toLowerCase()}`,
      category: "source",
      title: `Consider ${archive}`,
      detail: `Your corpus has little or no material from ${archive}. For archival and Global South coverage, try handoffs to ${archive}.`,
      severity: "info",
    });
  }

  if (snapshot.summary.needs_metadata > 0) {
    recommendations.push({
      id: "missing-metadata",
      category: "metadata",
      title: "Records missing metadata",
      detail: `${snapshot.summary.needs_metadata} saved records lack author, year, or source fields.`,
      severity: "warning",
    });
  }

  for (const prompt of citationIntel.coveragePrompts) {
    recommendations.push({
      id: `citation-${recommendations.length}`,
      category: "citation",
      title: "Citation coverage",
      detail: prompt,
      severity: "action",
    });
  }

  if (snapshot.savedSearchInsights.length === 0 && snapshot.profile.totalSavedRecords >= 3) {
    recommendations.push({
      id: "no-saved-searches",
      category: "search",
      title: "No saved search strategy",
      detail: "Save repeatable searches from Advanced Search to document your retrieval strategy for reviews.",
      severity: "info",
    });
  }

  if (snapshot.reviewDetail?.unresolvedConflicts) {
    recommendations.push({
      id: "review-conflicts",
      category: "review",
      title: "Unresolved screening conflicts",
      detail: `${snapshot.reviewDetail.unresolvedConflicts} screening conflict${snapshot.reviewDetail.unresolvedConflicts === 1 ? "" : "s"} need resolution.`,
      severity: "action",
    });
  }

  for (const gap of snapshot.gaps.slice(0, 3)) {
    recommendations.push({
      id: `gap-${gap.id}`,
      category: "metadata",
      title: gap.title,
      detail: gap.detail,
      severity: gap.severity === "high" ? "warning" : "info",
    });
  }

  return recommendations.slice(0, 10);
}

export function buildIntelligenceMetricsBundle(
  snapshot: IntelligenceSnapshot,
  archiveRecords: ArchiveRecord[] = [],
) {
  return {
    overview: getWorkbenchIntelligenceOverview(snapshot),
    sourceDistribution: getSourceDistribution(snapshot, archiveRecords),
    recordTypeDistribution: getRecordTypeDistribution(snapshot),
    temporalCoverage: getTemporalCoverage(snapshot),
    geographicCoverage: getGeographicCoverage(snapshot),
    reviewIntelligence: getReviewIntelligence(snapshot),
    citationIntelligence: getCitationIntelligence(snapshot),
    recommendations: getResearchWarnings(snapshot),
  };
}
