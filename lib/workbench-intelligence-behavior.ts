import type { ArchiveRecord } from "@/lib/records";
import type {
  IntelligenceActivityEntry,
  IntelligenceBehaviorInsight,
  IntelligenceItem,
  IntelligenceLiteratureReview,
  IntelligenceReadingPattern,
  UserResearchProfile,
} from "@/lib/workbench-intelligence-types";

const EVENT_LABELS: Record<string, string> = {
  record_saved: "Saved a record",
  record_added_to_reading_list: "Added to reading list",
  record_added_to_project: "Linked to project",
  note_created: "Created a note",
  note_updated: "Updated a note",
  citation_inserted: "Inserted a citation",
  board_card_created: "Created a board card",
  board_card_sent_to_document: "Sent board card to document",
  canvas_block_created: "Added canvas block",
  task_created: "Created a task",
  export_created: "Exported research",
  search_saved: "Saved a search",
  source_handoff_clicked: "Opened a source handoff",
  record_viewed: "Viewed a record",
  screening_decision: "Updated screening decision",
};

const EVENT_WEIGHT: Record<string, number> = {
  record_saved: 1,
  record_added_to_reading_list: 2,
  record_added_to_project: 2,
  citation_inserted: 4,
  board_card_created: 2,
  board_card_sent_to_document: 3,
  canvas_block_created: 2,
  export_created: 3,
  note_created: 1,
  note_updated: 1,
  task_created: 1,
};

function uniqueRecordItems(items: IntelligenceItem[]): IntelligenceItem[] {
  const byRecord = new Map<string, IntelligenceItem>();
  for (const item of items) {
    if (!item.recordId) continue;
    const existing = byRecord.get(item.recordId);
    if (!existing || recordEngagement(item) > recordEngagement(existing)) {
      byRecord.set(item.recordId, item);
    }
  }
  return [...byRecord.values()];
}

function recordEngagement(item: IntelligenceItem): number {
  let score = 1;
  if (item.source === "reading_list") score += 2;
  if (item.projectId) score += 2;
  if (item.cited) score += 4;
  if (item.usedInWriting) score += 5;
  if (item.status === "ready" || item.status === "reviewing") score += 1;
  return score;
}

export function computeEngagementByRecordId(
  items: IntelligenceItem[],
  recentActivity: UserResearchProfile["recentActivity"],
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const item of items) {
    if (!item.recordId) continue;
    const score = recordEngagement(item);
    scores.set(item.recordId, Math.max(scores.get(item.recordId) ?? 0, score));
  }

  for (const event of recentActivity) {
    if (event.entityType !== "record" || !event.entityId) continue;
    const bump = EVENT_WEIGHT[event.eventType] ?? 0.5;
    scores.set(event.entityId, (scores.get(event.entityId) ?? 0) + bump * 0.25);
  }

  return scores;
}

export function applyEngagementScores(
  items: IntelligenceItem[],
  engagement: Map<string, number>,
): IntelligenceItem[] {
  return items.map((item) => {
    if (!item.recordId) return item;
    const score = engagement.get(item.recordId);
    if (score == null) return item;
    return { ...item, engagementScore: Math.round(score * 10) / 10 };
  });
}

export function buildActivityFeed(
  recentActivity: UserResearchProfile["recentActivity"],
  recordTitles: Map<string, string>,
): IntelligenceActivityEntry[] {
  return recentActivity.map((event, index) => {
    const base = EVENT_LABELS[event.eventType] ?? event.eventType.replace(/_/g, " ");
    let detail = base;
    if (event.entityType === "record" && event.entityId) {
      const title = recordTitles.get(event.entityId);
      if (title) detail = `${base}: ${title}`;
    }

    return {
      id: `${event.createdAt}-${index}`,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      label: detail,
      createdAt: event.createdAt,
    };
  });
}

export function buildReadingPatterns(items: IntelligenceItem[]): IntelligenceReadingPattern[] {
  const corpus = uniqueRecordItems(items.filter((item) => item.recordId));
  const patterns: IntelligenceReadingPattern[] = [];

  const themeMap = new Map<string, { total: number; cited: number }>();
  const regionMap = new Map<string, { total: number; cited: number; country: string | null }>();

  for (const item of corpus) {
    if (item.theme) {
      const bucket = themeMap.get(item.theme) ?? { total: 0, cited: 0 };
      bucket.total += 1;
      if (item.cited) bucket.cited += 1;
      themeMap.set(item.theme, bucket);
    }

    const regionKey = item.country ?? item.region ?? item.continent;
    if (regionKey) {
      const bucket = regionMap.get(regionKey) ?? { total: 0, cited: 0, country: item.country ?? null };
      bucket.total += 1;
      if (item.cited) bucket.cited += 1;
      regionMap.set(regionKey, bucket);
    }
  }

  for (const [theme, stats] of [...themeMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6)) {
    patterns.push({
      id: `theme-${theme}`,
      category: "theme",
      label: theme,
      recordCount: stats.total,
      citedCount: stats.cited,
      detail: `${stats.cited} of ${stats.total} records cited in this theme`,
    });
  }

  for (const [region, stats] of [...regionMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6)) {
    patterns.push({
      id: `region-${region}`,
      category: "location",
      label: region,
      recordCount: stats.total,
      citedCount: stats.cited,
      detail: stats.country ? `Country focus: ${stats.country}` : "Regional reading cluster",
    });
  }

  return patterns;
}

export function buildLiteratureReviewCorpus(
  items: IntelligenceItem[],
  userRecords: ArchiveRecord[],
): IntelligenceLiteratureReview {
  const corpus = uniqueRecordItems(items.filter((item) => item.recordId));
  const recordById = new Map(userRecords.map((record) => [record.id, record]));

  const citedCount = corpus.filter((item) => item.cited).length;
  const usedInWritingCount = corpus.filter((item) => item.usedInWriting).length;
  const inReadingLists = corpus.filter((item) => item.source === "reading_list" || item.readingListId).length;
  const inProjects = corpus.filter((item) => item.projectId).length;
  const uncitedCount = corpus.filter((item) => !item.cited).length;

  const themeClusters = new Map<string, { total: number; cited: number; countries: Set<string> }>();
  const yearSpread = new Map<string, { count: number; cited: number }>();
  const geographySpread = new Map<string, { kind: string; count: number; cited: number }>();
  const topCreators = new Map<string, { count: number; cited: number }>();
  const sourceMix = new Map<string, number>();

  for (const item of corpus) {
    const record = item.recordId ? recordById.get(item.recordId) : undefined;
    const theme = item.theme ?? record?.knowledgeAreas?.[0];
    if (theme) {
      const bucket = themeClusters.get(theme) ?? { total: 0, cited: 0, countries: new Set<string>() };
      bucket.total += 1;
      if (item.cited) bucket.cited += 1;
      if (item.country) bucket.countries.add(item.country);
      themeClusters.set(theme, bucket);
    }

    const year = item.year ?? record?.datePublished?.slice(0, 4);
    if (year) {
      const bucket = yearSpread.get(year) ?? { count: 0, cited: 0 };
      bucket.count += 1;
      if (item.cited) bucket.cited += 1;
      yearSpread.set(year, bucket);
    }

    const geoLabel = item.city ?? item.country ?? item.region ?? item.continent;
    const geoKind = item.city ? "city" : item.country ? "country" : item.region ? "region" : "continent";
    if (geoLabel) {
      const bucket = geographySpread.get(geoLabel) ?? { kind: geoKind, count: 0, cited: 0 };
      bucket.count += 1;
      if (item.cited) bucket.cited += 1;
      geographySpread.set(geoLabel, bucket);
    }

    const creator = item.creator ?? record?.creator;
    if (creator) {
      const bucket = topCreators.get(creator) ?? { count: 0, cited: 0 };
      bucket.count += 1;
      if (item.cited) bucket.cited += 1;
      topCreators.set(creator, bucket);
    }

    const source = item.sourceLabel ?? record?.sourceName ?? item.source;
    if (source) sourceMix.set(source, (sourceMix.get(source) ?? 0) + 1);
  }

  const synthesised = corpus.filter(
    (item) => item.cited || item.usedInWriting || item.status === "used" || item.status === "cited",
  ).length;
  const slrReadinessPercent = corpus.length
    ? Math.round((synthesised / corpus.length) * 100)
    : 0;

  return {
    corpusSize: items.filter((item) => item.recordId).length,
    uniqueRecords: corpus.length,
    citedCount,
    uncitedCount,
    usedInWritingCount,
    inReadingLists,
    inProjects,
    slrReadinessPercent,
    themeClusters: [...themeClusters.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([theme, stats]) => ({
        theme,
        total: stats.total,
        cited: stats.cited,
        countries: [...stats.countries].slice(0, 4),
      })),
    yearSpread: [...yearSpread.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(-12)
      .map(([year, stats]) => ({ year, count: stats.count, cited: stats.cited })),
    geographySpread: [...geographySpread.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([label, stats]) => ({
        label,
        kind: stats.kind,
        count: stats.count,
        cited: stats.cited,
      })),
    topCreators: [...topCreators.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, stats]) => ({ name, count: stats.count, cited: stats.cited })),
    sourceMix: [...sourceMix.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count })),
    lastActivityAt: null,
  };
}

export function buildBehaviorInsights(input: {
  items: IntelligenceItem[];
  profile: UserResearchProfile;
  literatureReview: IntelligenceLiteratureReview;
  recentActivity: UserResearchProfile["recentActivity"];
}): IntelligenceBehaviorInsight[] {
  const insights: IntelligenceBehaviorInsight[] = [];
  const corpus = uniqueRecordItems(input.items.filter((item) => item.recordId));

  if (input.literatureReview.themeClusters[0]) {
    const top = input.literatureReview.themeClusters[0];
    insights.push({
      id: "top-theme",
      category: "reading",
      title: `Strongest theme: ${top.theme}`,
      detail: `${top.total} records in your corpus touch this theme; ${top.cited} are already cited.`,
      metric: String(top.total),
      filterHint: { theme: top.theme },
    });
  }

  if (input.literatureReview.geographySpread[0]) {
    const top = input.literatureReview.geographySpread[0];
    insights.push({
      id: "top-location",
      category: "location",
      title: `Most-read location: ${top.label}`,
      detail: `${top.count} saved records map to ${top.label}; ${top.cited} cited in notes.`,
      metric: String(top.count),
      filterHint: top.kind === "country" ? { country: top.label } : { region: top.label },
    });
  }

  if (input.profile.recordsNotYetCited > 0) {
    insights.push({
      id: "uncited-gap",
      category: "gap",
      title: "Uncited saved records",
      detail: `${input.profile.recordsNotYetCited} records are saved but not yet cited in your notes.`,
      metric: String(input.profile.recordsNotYetCited),
      filterHint: { status: "unsorted" },
    });
  }

  const citationEvents = input.recentActivity.filter((e) => e.eventType === "citation_inserted").length;
  if (citationEvents > 0) {
    insights.push({
      id: "recent-citations",
      category: "citation",
      title: "Recent citation activity",
      detail: `${citationEvents} citation events in your recent workbench activity.`,
      metric: String(citationEvents),
      filterHint: { status: "cited" },
    });
  }

  const avgEngagement =
    corpus.reduce((sum, item) => sum + (item.engagementScore ?? recordEngagement(item)), 0) /
    Math.max(1, corpus.length);

  if (corpus.length >= 3) {
    insights.push({
      id: "corpus-depth",
      category: "activity",
      title: "Corpus engagement depth",
      detail: `Average engagement score ${avgEngagement.toFixed(1)} across ${corpus.length} unique records (saved → listed → cited).`,
      metric: avgEngagement.toFixed(1),
    });
  }

  if (input.literatureReview.slrReadinessPercent < 50 && corpus.length >= 5) {
    insights.push({
      id: "slr-readiness",
      category: "gap",
      title: "SLR synthesis gap",
      detail: `${100 - input.literatureReview.slrReadinessPercent}% of your corpus is not yet cited or used in writing.`,
      metric: `${input.literatureReview.slrReadinessPercent}% ready`,
    });
  }

  return insights.slice(0, 8);
}
