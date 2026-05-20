import type { ArchiveRecord } from "@/lib/records";
import {
  applyEngagementScores,
  buildActivityFeed,
  buildBehaviorInsights,
  buildLiteratureReviewCorpus,
  buildReadingPatterns,
  computeEngagementByRecordId,
} from "@/lib/workbench-intelligence-behavior";
import type {
  IntelligenceDashboardKpis,
  IntelligenceFacetOption,
  IntelligenceFacets,
  IntelligenceItem,
  IntelligenceLocationCard,
  IntelligencePlaceComparison,
  IntelligenceResearchGap,
  IntelligenceSourcePerformance,
  IntelligenceSourceStatus,
  IntelligenceCityPlace,
  IntelligenceWorldMapPoint,
} from "@/lib/workbench-intelligence-types";
import {
  buildGeographyIndex,
  matchesComparisonPreset,
  placeId,
  PLACE_COMPARISON_PRESETS,
  projectToMap,
  resolveRecordGeography,
  topLabels,
} from "@/lib/workbench-intelligence-geo";

const OPEN_ACCESS_RIGHTS = new Set([
  "Public Domain",
  "Creative Commons",
  "Open Access",
  "Metadata Only",
]);

const SOURCE_REGISTRY: Array<{
  id: string;
  name: string;
  matchers: RegExp[];
  externalKey?: keyof NonNullable<ArchiveRecord["externalIds"]>;
}> = [
  { id: "openalex", name: "OpenAlex", matchers: [/openalex/i], externalKey: "openAlex" },
  { id: "core", name: "CORE", matchers: [/\bcore\b/i, /core\.ac\.uk/i] },
  { id: "crossref", name: "Crossref", matchers: [/crossref/i], externalKey: "crossref" },
  { id: "semantic-scholar", name: "Semantic Scholar", matchers: [/semantic scholar/i] },
  { id: "wikidata", name: "Wikidata", matchers: [/wikidata/i] },
  { id: "aodl", name: "AODL", matchers: [/\baodl\b/i, /african.*digital.*library/i] },
  { id: "trove", name: "Trove", matchers: [/trove/i], externalKey: "trove" },
  { id: "smithsonian", name: "Smithsonian", matchers: [/smithsonian/i] },
  { id: "loc", name: "Library of Congress", matchers: [/library of congress/i, /\bloc\b/i], externalKey: "libraryOfCongress" },
  { id: "europeana", name: "Europeana", matchers: [/europeana/i], externalKey: "europeana" },
];

export function isOpenAccessRecord(record: ArchiveRecord): boolean {
  if (OPEN_ACCESS_RIGHTS.has(record.rightsStatus)) return true;
  if (record.licence?.startsWith("CC")) return true;
  return /open access|public domain|creative commons/i.test(record.rightsStatus);
}

export function matchSourceDatabase(record: ArchiveRecord): string {
  const text = `${record.sourceName} ${record.sourceUrl}`;
  for (const source of SOURCE_REGISTRY) {
    if (source.matchers.some((rx) => rx.test(text))) return source.id;
    if (source.externalKey && record.externalIds?.[source.externalKey]) return source.id;
  }
  if (record.doi) return "crossref";
  return "archive";
}

function facetFromMap(map: Map<string, number>, limit = 12): IntelligenceFacetOption[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, label: value, count }));
}

function collectPlaceIds(geo: ReturnType<typeof resolveRecordGeography>): string[] {
  const ids: string[] = [];
  for (const continent of geo.continents) ids.push(placeId("continent", continent));
  for (const region of geo.regions) ids.push(placeId("region", region));
  for (const country of geo.countries) ids.push(placeId("country", country));
  for (const city of geo.cities) ids.push(placeId("city", city));
  if (geo.diaspora) ids.push(placeId("diaspora", "African Diaspora"));
  return ids;
}

export function enrichIntelligenceItemFromRecord(
  item: IntelligenceItem,
  record: ArchiveRecord | undefined,
): IntelligenceItem {
  if (!record) return item;

  const geo = resolveRecordGeography(record);
  const year =
    record.datePublished?.slice(0, 4) ||
    record.dateCreated?.slice(0, 4) ||
    item.date?.slice(0, 4) ||
    null;

  return {
    ...item,
    creator: item.creator ?? record.creator ?? null,
    year,
    continent: geo.continents[0] ?? item.continent ?? null,
    region: geo.regions[0] ?? record.region?.[0] ?? item.region ?? null,
    country: geo.countries[0] ?? item.country ?? null,
    city: geo.cities[0] ?? item.city ?? null,
    diaspora: geo.diaspora,
    placeIds: collectPlaceIds(geo),
    institution: record.publisher ?? record.contributors?.[0] ?? item.institution ?? null,
    theme: record.knowledgeAreas?.[0] ?? item.theme ?? null,
    recordType: record.recordType?.[0] ?? item.recordType ?? null,
    language: record.language?.[0] ?? item.language ?? null,
    mediaType: record.recordType?.[0] ?? item.mediaType ?? null,
    openAccess: isOpenAccessRecord(record),
    sourceDatabaseId: matchSourceDatabase(record),
    confidence: record.confidenceLevel ?? item.confidence ?? "medium",
    lastSynced: record.dateAccessed ?? item.lastSynced ?? null,
    sourceLabel: item.sourceLabel ?? record.sourceName,
  };
}

export function buildWorldMap(
  userRecords: ArchiveRecord[],
  engagementByRecordId?: Map<string, number>,
): IntelligenceWorldMapPoint[] {
  const userRecordIds = new Set(userRecords.map((record) => record.id));
  const index = buildGeographyIndex(userRecords, userRecordIds);
  const weightedCounts = new Map<string, number>();

  for (const record of userRecords) {
    const weight = engagementByRecordId?.get(record.id) ?? 1;
    const geo = resolveRecordGeography(record);
    for (const continent of geo.continents) {
      const id = placeId("continent", continent);
      weightedCounts.set(id, (weightedCounts.get(id) ?? 0) + weight);
    }
    for (const country of geo.countries) {
      const id = placeId("country", country);
      weightedCounts.set(id, (weightedCounts.get(id) ?? 0) + weight);
    }
    if (geo.diaspora) {
      const id = placeId("diaspora", "African Diaspora");
      weightedCounts.set(id, (weightedCounts.get(id) ?? 0) + weight);
    }
  }

  const max = Math.max(1, ...[...weightedCounts.values()]);

  const points: IntelligenceWorldMapPoint[] = [];

  for (const place of index.values()) {
    if (place.kind !== "continent" && place.kind !== "country" && place.kind !== "diaspora") {
      continue;
    }
    const count = Math.round(weightedCounts.get(place.id) ?? place.userRecordCount);
    if (count <= 0) continue;
    const { x, y } = projectToMap(place.latitude, place.longitude);
    points.push({
      placeId: place.id,
      kind: place.kind,
      label: place.label,
      continent: place.continent,
      latitude: place.latitude,
      longitude: place.longitude,
      x,
      y,
      count,
      intensity: count ? Math.max(0.12, count / max) : 0.06,
    });
  }

  return points.sort((a, b) => b.count - a.count);
}

export function buildLocationCards(userRecords: ArchiveRecord[]): IntelligenceLocationCard[] {
  const userRecordIds = new Set(userRecords.map((record) => record.id));
  const index = buildGeographyIndex(userRecords, userRecordIds);

  function toCard(place: (typeof index extends Map<string, infer V> ? V : never)) {
    const gaps: string[] = [];
    if (place.missingCreator > 0) gaps.push(`${place.missingCreator} missing creator`);
    if (place.missingInstitution > 0) gaps.push(`${place.missingInstitution} weak institution`);
    if (place.userRecordCount && place.openAccess / place.userRecordCount < 0.4) {
      gaps.push("Low open access in your corpus");
    }

    return {
      placeId: place.id,
      kind: place.kind,
      label: place.label,
      subtitle: place.continent,
      recordCount: place.userRecordCount,
      userRecordCount: place.userRecordCount,
      topThemes: topLabels(place.themes, 3),
      openAccessPercent: place.userRecordCount
        ? Math.round((place.openAccess / place.userRecordCount) * 100)
        : 0,
      strongestSources: topLabels(place.sources, 3),
      metadataGaps: gaps.slice(0, 3),
      lastSynced: place.lastSynced,
    };
  }

  const continents = [...index.values()]
    .filter((p) => p.kind === "continent" && p.userRecordCount > 0)
    .sort((a, b) => b.userRecordCount - a.userRecordCount)
    .map(toCard);

  const countries = [...index.values()]
    .filter((p) => p.kind === "country" && p.userRecordCount > 0)
    .sort((a, b) => b.userRecordCount - a.userRecordCount)
    .slice(0, 12)
    .map(toCard);

  const diaspora = [...index.values()]
    .filter((p) => p.kind === "diaspora" && p.userRecordCount > 0)
    .map(toCard);

  return [...continents, ...countries, ...diaspora];
}

export function buildCityPlaces(userRecords: ArchiveRecord[]): IntelligenceCityPlace[] {
  const userRecordIds = new Set(userRecords.map((record) => record.id));
  const index = buildGeographyIndex(userRecords, userRecordIds);

  return [...index.values()]
    .filter((p) => p.kind === "city" && p.userRecordCount > 0)
    .sort((a, b) => b.userRecordCount - a.userRecordCount)
    .map((place) => {
      const countryLabel =
        place.parentId?.startsWith("country:") ?
          index.get(place.parentId)?.label ?? null
        : null;
      return {
        placeId: place.id,
        label: place.label,
        country: countryLabel,
        recordCount: place.userRecordCount,
        userRecordCount: place.userRecordCount,
      };
    });
}

export function buildPlaceComparisons(userRecords: ArchiveRecord[]): IntelligencePlaceComparison[] {
  const buckets = new Map<
    string,
    {
      recordCount: number;
      userRecordCount: number;
      openAccess: number;
      themes: Map<string, number>;
      sources: Map<string, number>;
    }
  >();

  for (const preset of PLACE_COMPARISON_PRESETS) {
    buckets.set(preset.id, {
      recordCount: 0,
      userRecordCount: 0,
      openAccess: 0,
      themes: new Map(),
      sources: new Map(),
    });
  }

  for (const record of userRecords) {
    const geo = resolveRecordGeography(record);
    for (const preset of PLACE_COMPARISON_PRESETS) {
      if (!matchesComparisonPreset(preset.id, geo, record)) continue;
      const bucket = buckets.get(preset.id)!;
      bucket.recordCount += 1;
      bucket.userRecordCount += 1;
      if (isOpenAccessRecord(record)) bucket.openAccess += 1;
      for (const theme of record.knowledgeAreas ?? []) {
        bucket.themes.set(theme, (bucket.themes.get(theme) ?? 0) + 1);
      }
      bucket.sources.set(record.sourceName, (bucket.sources.get(record.sourceName) ?? 0) + 1);
    }
  }

  return PLACE_COMPARISON_PRESETS.map((preset) => {
    const stats = buckets.get(preset.id)!;
    return {
      id: preset.id,
      label: preset.label,
      recordCount: stats.recordCount,
      userRecordCount: stats.userRecordCount,
      openAccessPercent: stats.recordCount
        ? Math.round((stats.openAccess / stats.recordCount) * 100)
        : 0,
      topTheme: topLabels(stats.themes, 1)[0] ?? null,
      topSource: topLabels(stats.sources, 1)[0] ?? null,
    };
  });
}

export function buildSourcePerformance(userRecords: ArchiveRecord[]): IntelligenceSourcePerformance[] {
  const counts = new Map<string, { archive: number; user: number; failures: number; lastSynced: string | null }>();

  for (const source of SOURCE_REGISTRY) {
    counts.set(source.id, { archive: 0, user: 0, failures: 0, lastSynced: null });
  }

  for (const record of userRecords) {
    const id = matchSourceDatabase(record);
    const bucket = counts.get(id) ?? { archive: 0, user: 0, failures: 0, lastSynced: null };
    bucket.archive += 1;
    bucket.user += 1;
    if (!record.metadataReviewed || record.verificationStatus === "Needs Review") {
      bucket.failures += 1;
    }
    if (record.dateAccessed && (!bucket.lastSynced || record.dateAccessed > bucket.lastSynced)) {
      bucket.lastSynced = record.dateAccessed;
    }
    counts.set(id, bucket);
  }

  return SOURCE_REGISTRY.map((source) => {
    const stats = counts.get(source.id) ?? { archive: 0, user: 0, failures: 0, lastSynced: null };
    let status: IntelligenceSourceStatus = "active";
    if (stats.user === 0) status = "planned";
    else if (stats.failures / stats.user > 0.35) status = "degraded";

    return {
      id: source.id,
      name: source.name,
      status,
      recordCount: stats.user,
      userRecordCount: stats.user,
      failureCount: stats.failures,
      lastSynced: stats.lastSynced,
    };
  }).filter((source) => source.recordCount > 0 || source.status === "planned");
}

export function buildDashboardKpis(
  userRecords: ArchiveRecord[],
  items: IntelligenceItem[],
  extras?: { activityEvents?: number; slrReadinessPercent?: number },
): IntelligenceDashboardKpis {
  const countries = new Set<string>();
  let openAccess = 0;
  let completeMeta = 0;

  for (const record of userRecords) {
    const geo = resolveRecordGeography(record);
    for (const country of geo.countries) countries.add(country);
    if (isOpenAccessRecord(record)) openAccess += 1;
    const hasCreator = Boolean(record.creator?.trim());
    const hasInstitution = Boolean(record.publisher?.trim() || record.contributors?.length);
    const hasTheme = Boolean(record.knowledgeAreas?.length);
    if (hasCreator && hasInstitution && hasTheme) completeMeta += 1;
  }

  const pendingReview = items.filter(
    (item) =>
      item.status === "needs_metadata" ||
      item.status === "needs_cultural_care" ||
      item.status === "pending_review" ||
      item.collections.includes("missing_metadata"),
  ).length;

  const uniqueRecordIds = new Set(
    items.filter((item) => item.recordId).map((item) => item.recordId as string),
  );
  const citedRecords = items.filter((item) => item.cited && item.recordId).length;
  const total = uniqueRecordIds.size;
  const activeSourceIds = new Set(userRecords.map((r) => matchSourceDatabase(r)));

  return {
    totalRecords: total,
    userSavedRecords: items.filter((item) => item.type === "record").length,
    activeSources: activeSourceIds.size,
    countriesCovered: countries.size,
    pendingReview,
    openAccessPercent: userRecords.length ? Math.round((openAccess / userRecords.length) * 100) : 0,
    metadataCompletenessPercent: userRecords.length
      ? Math.round((completeMeta / userRecords.length) * 100)
      : 0,
    citedRecords,
    activityEvents: extras?.activityEvents ?? 0,
    slrReadinessPercent: extras?.slrReadinessPercent ?? 0,
  };
}

export function buildResearchGaps(
  userRecords: ArchiveRecord[],
  locations: IntelligenceLocationCard[],
  items: IntelligenceItem[],
): IntelligenceResearchGap[] {
  const gaps: IntelligenceResearchGap[] = [];

  const underPlaces = locations.filter(
    (loc) =>
      (loc.kind === "country" || loc.kind === "region") &&
      loc.userRecordCount > 0 &&
      loc.userRecordCount < 3,
  );
  if (underPlaces.length) {
    gaps.push({
      id: "underrepresented-places",
      title: "Thin coverage in your corpus",
      detail: `${underPlaces.map((r) => r.label).join(", ")} have fewer than 3 saved records in your research.`,
      severity: "high",
      metric: `${underPlaces.length} places`,
    });
  }

  const missingCreator = userRecords.filter((r) => !r.creator?.trim()).length;
  if (missingCreator) {
    gaps.push({
      id: "missing-creator",
      title: "Missing creator metadata",
      detail: `${missingCreator} records in your corpus lack a named creator or author.`,
      severity: missingCreator > 20 ? "high" : "medium",
      metric: String(missingCreator),
      filterHint: { status: "needs_metadata" },
    });
  }

  const uncited = items.filter((item) => item.recordId && !item.cited).length;
  if (uncited) {
    gaps.push({
      id: "uncited-corpus",
      title: "Uncited saved records",
      detail: `${uncited} saved records are not yet cited in your notes or writing.`,
      severity: uncited > 10 ? "high" : "medium",
      metric: String(uncited),
      filterHint: { status: "unsorted" },
    });
  }

  const lowOaPlaces = locations.filter((l) => l.userRecordCount >= 3 && l.openAccessPercent < 35);
  if (lowOaPlaces.length) {
    gaps.push({
      id: "low-open-access",
      title: "Low open-access in your reading",
      detail: `${lowOaPlaces.map((z) => z.label).join(", ")} fall below 35% open access in your corpus.`,
      severity: "medium",
      filterHint: { openAccess: "closed" },
    });
  }

  const weakInstitution = userRecords.filter(
    (r) => !r.publisher?.trim() && !r.contributors?.length,
  ).length;
  if (weakInstitution) {
    gaps.push({
      id: "weak-institution",
      title: "Weak institutional metadata",
      detail: `${weakInstitution} records in your corpus have no publisher or contributing institution.`,
      severity: "medium",
      metric: String(weakInstitution),
    });
  }

  return gaps.slice(0, 6);
}

export function buildFacets(items: IntelligenceItem[]): IntelligenceFacets {
  const years = new Map<string, number>();
  const types = new Map<string, number>();
  const themes = new Map<string, number>();
  const creators = new Map<string, number>();
  const institutions = new Map<string, number>();
  const continents = new Map<string, number>();
  const regions = new Map<string, number>();
  const countries = new Map<string, number>();
  const cities = new Map<string, number>();
  const sourceDatabases = new Map<string, number>();
  const statuses = new Map<string, number>();

  for (const item of items) {
    if (item.year) years.set(item.year, (years.get(item.year) ?? 0) + 1);
    if (item.recordType) types.set(item.recordType, (types.get(item.recordType) ?? 0) + 1);
    if (item.theme) themes.set(item.theme, (themes.get(item.theme) ?? 0) + 1);
    if (item.creator) creators.set(item.creator, (creators.get(item.creator) ?? 0) + 1);
    if (item.institution) institutions.set(item.institution, (institutions.get(item.institution) ?? 0) + 1);
    if (item.continent) continents.set(item.continent, (continents.get(item.continent) ?? 0) + 1);
    if (item.region) regions.set(item.region, (regions.get(item.region) ?? 0) + 1);
    if (item.country) countries.set(item.country, (countries.get(item.country) ?? 0) + 1);
    if (item.city) cities.set(item.city, (cities.get(item.city) ?? 0) + 1);
    if (item.sourceLabel) {
      sourceDatabases.set(item.sourceLabel, (sourceDatabases.get(item.sourceLabel) ?? 0) + 1);
    }
    statuses.set(item.status, (statuses.get(item.status) ?? 0) + 1);
  }

  return {
    years: facetFromMap(years, 10),
    types: facetFromMap(types, 10),
    themes: facetFromMap(themes, 10),
    creators: facetFromMap(creators, 8),
    institutions: facetFromMap(institutions, 8),
    continents: facetFromMap(continents, 8),
    regions: facetFromMap(regions, 10),
    countries: facetFromMap(countries, 12),
    cities: facetFromMap(cities, 12),
    sourceDatabases: facetFromMap(sourceDatabases, 10),
    statuses: facetFromMap(statuses, 8),
  };
}

export function buildIntelligenceDashboard(input: {
  archiveRecords: ArchiveRecord[];
  items: IntelligenceItem[];
  profile: import("@/lib/workbench-intelligence-types").UserResearchProfile;
  savedSearches?: import("@/lib/workbench-intelligence-types").SavedSearchInsight[];
}) {
  const userRecordIds = new Set(
    input.items.filter((item) => item.recordId).map((item) => item.recordId as string),
  );

  const userRecords = input.archiveRecords.filter((record) => userRecordIds.has(record.id));
  const engagement = computeEngagementByRecordId(input.items, input.profile.recentActivity);

  const enrichedItems = applyEngagementScores(
    input.items.map((item) => {
      if (!item.recordId) return item;
      const record = input.archiveRecords.find((r) => r.id === item.recordId);
      return enrichIntelligenceItemFromRecord(item, record);
    }),
    engagement,
  );

  const literatureReview = buildLiteratureReviewCorpus(enrichedItems, userRecords);
  literatureReview.lastActivityAt = input.profile.recentActivity[0]?.createdAt ?? null;

  const recordTitles = new Map(
    userRecords.map((record) => [record.id, record.title ?? record.id]),
  );

  const behaviorInsights = buildBehaviorInsights({
    items: enrichedItems,
    profile: input.profile,
    literatureReview,
    recentActivity: input.profile.recentActivity,
  });

  const activityFeed = buildActivityFeed(input.profile.recentActivity, recordTitles);
  const readingPatterns = buildReadingPatterns(enrichedItems);
  const locations = buildLocationCards(userRecords);
  const dashboard = buildDashboardKpis(userRecords, enrichedItems, {
    activityEvents: input.profile.recentActivity.length,
    slrReadinessPercent: literatureReview.slrReadinessPercent,
  });

  return {
    items: enrichedItems,
    dashboard,
    worldMap: buildWorldMap(userRecords, engagement),
    locations,
    comparisons: buildPlaceComparisons(userRecords),
    cityPlaces: buildCityPlaces(userRecords),
    sources: buildSourcePerformance(userRecords),
    gaps: buildResearchGaps(userRecords, locations, enrichedItems),
    facets: buildFacets(enrichedItems.filter((item) => item.recordId)),
    literatureReview,
    behaviorInsights,
    activityFeed,
    readingPatterns,
    savedSearchInsights: input.savedSearches ?? [],
  };
}
