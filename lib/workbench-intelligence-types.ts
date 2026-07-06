export type WorkbenchUserPreferences = {
  user_id: string;
  preferred_citation_style: string;
  preferred_board_view: string;
  preferred_note_mode: string;
  dismissed_suggestions: string[];
  pinned_collections: string[];
  updated_at: string;
};

export type IntelligenceItemType =
  | "record"
  | "reading_list_item"
  | "note"
  | "board_card"
  | "citation"
  | "task"
  | "canvas_block";

export type IntelligenceSource =
  | "bookmark"
  | "reading_list"
  | "project"
  | "note"
  | "board"
  | "canvas";

export type IntelligenceWorkflowStatus =
  | "unsorted"
  | "collecting"
  | "reviewing"
  | "cited"
  | "used"
  | "ready"
  | "needs_metadata"
  | "needs_cultural_care"
  | "pending_review";

export type IntelligenceFilter =
  | "all"
  | "unsorted"
  | "bookmarks"
  | "reading_lists"
  | "projects"
  | "cited"
  | "uncited"
  | "needs_metadata"
  | "needs_action"
  | "questions"
  | "images"
  | "tasks";

export type IntelligenceSummaryKey =
  | "saved_records"
  | "reading_lists"
  | "cited_records"
  | "uncited_records"
  | "unsorted_records"
  | "open_questions"
  | "images_needing_alt"
  | "needs_metadata"
  | "needs_cultural_care"
  | "ready_to_export";

export type SuggestionConfidence = "low" | "medium" | "high";

export type IntelligenceGeoPlaceKind = "continent" | "region" | "country" | "city" | "diaspora";

export type IntelligenceConfidence = "high" | "medium" | "low";

export type IntelligenceFacetFilters = {
  year?: string | null;
  type?: string | null;
  openAccess?: "open" | "closed" | "unknown" | null;
  theme?: string | null;
  creator?: string | null;
  institution?: string | null;
  continent?: string | null;
  region?: string | null;
  country?: string | null;
  city?: string | null;
  diaspora?: boolean | null;
  placeId?: string | null;
  sourceDatabase?: string | null;
  status?: IntelligenceWorkflowStatus | null;
};

export type IntelligenceWorldMapPoint = {
  placeId: string;
  kind: IntelligenceGeoPlaceKind;
  label: string;
  continent: string | null;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  count: number;
  intensity: number;
};

export type IntelligenceLocationCard = {
  placeId: string;
  kind: IntelligenceGeoPlaceKind;
  label: string;
  subtitle: string | null;
  recordCount: number;
  userRecordCount: number;
  topThemes: string[];
  openAccessPercent: number;
  strongestSources: string[];
  metadataGaps: string[];
  lastSynced: string | null;
};

export type IntelligencePlaceComparison = {
  id: string;
  label: string;
  recordCount: number;
  userRecordCount: number;
  openAccessPercent: number;
  topTheme: string | null;
  topSource: string | null;
};

export type IntelligenceCityPlace = {
  placeId: string;
  label: string;
  country: string | null;
  recordCount: number;
  userRecordCount: number;
};

export type IntelligenceSourceStatus = "active" | "degraded" | "offline" | "planned";

export type IntelligenceSourcePerformance = {
  id: string;
  name: string;
  status: IntelligenceSourceStatus;
  recordCount: number;
  userRecordCount: number;
  failureCount: number;
  lastSynced: string | null;
  description?: string;
};

export type IntelligenceResearchGap = {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  metric?: string;
  filterHint?: Partial<IntelligenceFacetFilters>;
};

export type IntelligenceDashboardKpis = {
  totalRecords: number;
  userSavedRecords: number;
  activeSources: number;
  countriesCovered: number;
  pendingReview: number;
  openAccessPercent: number;
  metadataCompletenessPercent: number;
  citedRecords?: number;
  activityEvents?: number;
  slrReadinessPercent?: number;
};

export type IntelligenceDistributionEntry = {
  label: string;
  count: number;
  percent: number;
};

export type IntelligenceOverviewMetrics = {
  totalSavedRecords: number;
  totalSearches: number;
  activeReviewProjects: number;
  readingListCount: number;
  notesWithCitations: number;
  totalNotes: number;
  totalCitations: number;
  openAccessPercent: number;
  externalSourcePercent: number;
  metadataOnlyPercent: number;
  missingMetadataWarnings: number;
  recordsInReadingLists: number;
  recordsLinkedToProjects: number;
};

export type SourceIntelligence = {
  mix: IntelligenceDistributionEntry[];
  openAccessVsMetadataOnly: { openAccess: number; metadataOnly: number; closed: number };
  mediaTypeMix: IntelligenceDistributionEntry[];
  dominanceWarning: string | null;
  underusedArchives: string[];
  trustIndicators: Array<{
    sourceId: string;
    label: string;
    level: "high" | "medium" | "low";
    note: string;
  }>;
};

export type TemporalCoverage = {
  yearSpread: Array<{ year: string; count: number; cited: number }>;
  earliestYear: string | null;
  latestYear: string | null;
  decadeGaps: string[];
};

export type GeographicCoverage = {
  countries: IntelligenceFacetOption[];
  regions: IntelligenceFacetOption[];
  continents: IntelligenceFacetOption[];
  countriesCovered: number;
  locationCards: IntelligenceLocationCard[];
  mapPointCount: number;
};

export type CitationIntelligence = {
  citedSourcesCount: number;
  totalCitations: number;
  uncitedNotesCount: number;
  notesWithoutCitations: number;
  topAuthors: IntelligenceDistributionEntry[];
  styleIssues: number;
  missingDoiOrUrl: number;
  weakDiversityWarning: string | null;
  sourceAgeSpread: IntelligenceDistributionEntry[];
  coveragePrompts: string[];
};

export type IntelligenceRecommendation = {
  id: string;
  category: "source" | "metadata" | "citation" | "review" | "reading-list" | "search";
  title: string;
  detail: string;
  severity: "info" | "warning" | "action";
};

export type ReviewIntelligenceDetail = PrismaFlowCounts & {
  activeReviewProjects: number;
  maybeCount: number;
  unresolvedConflicts: number;
  extractionProgressPercent: number;
  reviewerWorkload: Array<{ label: string; count: number }>;
  databasesUsed: string[];
  projects: Array<{
    id: string;
    title: string;
    reviewType: ReviewProjectType;
    status: ReviewProject["status"];
    databasesSearched: string[];
  }>;
};

export type ReviewIntelligenceExtras = {
  unresolvedConflicts: number;
  extractionProgressPercent: number;
  reviewerWorkload: Array<{ label: string; count: number }>;
};

export type IntelligenceBehaviorInsight = {
  id: string;
  category: "reading" | "location" | "citation" | "gap" | "activity";
  title: string;
  detail: string;
  metric?: string;
  filterHint?: Partial<IntelligenceFacetFilters>;
};

export type IntelligenceActivityEntry = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  label: string;
  createdAt: string;
};

export type IntelligenceReadingPattern = {
  id: string;
  category: "theme" | "location" | "creator";
  label: string;
  recordCount: number;
  citedCount: number;
  detail: string;
};

export type IntelligenceLiteratureReview = {
  corpusSize: number;
  uniqueRecords: number;
  citedCount: number;
  uncitedCount: number;
  usedInWritingCount: number;
  inReadingLists: number;
  inProjects: number;
  slrReadinessPercent: number;
  themeClusters: Array<{ theme: string; total: number; cited: number; countries: string[] }>;
  yearSpread: Array<{ year: string; count: number; cited: number }>;
  geographySpread: Array<{ label: string; kind: string; count: number; cited: number }>;
  topCreators: Array<{ name: string; count: number; cited: number }>;
  sourceMix: Array<{ source: string; count: number }>;
  lastActivityAt: string | null;
};

export type IntelligenceFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type IntelligenceFacets = {
  years: IntelligenceFacetOption[];
  types: IntelligenceFacetOption[];
  themes: IntelligenceFacetOption[];
  creators: IntelligenceFacetOption[];
  institutions: IntelligenceFacetOption[];
  continents: IntelligenceFacetOption[];
  regions: IntelligenceFacetOption[];
  countries: IntelligenceFacetOption[];
  cities: IntelligenceFacetOption[];
  sourceDatabases: IntelligenceFacetOption[];
  statuses: IntelligenceFacetOption[];
};

export type IntelligenceRelation = {
  kind: string;
  label: string;
  href?: string;
};

export type IntelligenceItem = {
  id: string;
  title: string;
  subtitle?: string;
  type: IntelligenceItemType;
  source: IntelligenceSource;
  recordId?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  readingListId?: string | null;
  readingListTitle?: string | null;
  noteId?: string | null;
  noteTitle?: string | null;
  status: IntelligenceWorkflowStatus;
  cited: boolean;
  usedInWriting: boolean;
  creator?: string | null;
  date?: string | null;
  year?: string | null;
  sourceLabel?: string | null;
  region?: string | null;
  continent?: string | null;
  country?: string | null;
  city?: string | null;
  diaspora?: boolean;
  placeIds?: string[];
  institution?: string | null;
  theme?: string | null;
  recordType?: string | null;
  openAccess?: boolean | null;
  language?: string | null;
  mediaType?: string | null;
  citationCount?: number | null;
  sourceDatabaseId?: string | null;
  confidence?: IntelligenceConfidence | null;
  lastSynced?: string | null;
  engagementScore?: number;
  openHref?: string;
  collections: string[];
  relations: IntelligenceRelation[];
};

export type IntelligenceCollection = {
  id: string;
  title: string;
  description: string;
  itemIds: string[];
};

export type IntelligenceSuggestion = {
  id: string;
  type: string;
  title: string;
  body: string;
  reason: string;
  actionLabel: string;
  actionHref?: string;
  confidence: SuggestionConfidence;
  dismissible: boolean;
  filter?: IntelligenceFilter;
  summaryKey?: IntelligenceSummaryKey;
  collectionId?: string;
};

export type UserResearchProfile = {
  totalSavedRecords: number;
  totalReadingLists: number;
  totalNotes: number;
  totalCitations: number;
  totalBoardCards: number;
  totalCanvasBlocks: number;
  totalTasks: number;
  unsortedSavedRecords: number;
  recordsInReadingLists: number;
  recordsLinkedToProjects: number;
  recordsCitedInNotes: number;
  recordsNotYetCited: number;
  imageCardsMissingAlt: number;
  openQuestionCards: number;
  boardCardsNotSentToDocument: number;
  frequentCitationStyle: string | null;
  frequentSourceTypes: string[];
  activeProjects: Array<{ id: string; title: string; recordCount: number; taskCount: number }>;
  recentActivity: Array<{
    eventType: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
};

export type ReviewProjectType =
  | "systematic_review"
  | "scoping_review"
  | "rapid_review"
  | "evidence_map"
  | "mapping_review"
  | "narrative_review";

export type ReviewScreeningStatus =
  | "imported"
  | "title_abstract_screening"
  | "included"
  | "excluded"
  | "maybe"
  | "full_text_review"
  | "final_included";

export type ReviewExclusionReason =
  | "wrong_topic"
  | "wrong_geography"
  | "wrong_method"
  | "duplicate"
  | "no_full_text"
  | "outside_date_range"
  | "other";

export type ReviewProject = {
  id: string;
  title: string;
  reviewType: ReviewProjectType;
  researchQuestion: string | null;
  inclusionCriteria: string | null;
  exclusionCriteria: string | null;
  searchStrings: string[];
  databasesSearched: string[];
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  notes: string | null;
  status: "active" | "paused" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ReviewScreeningRecord = {
  id: string;
  projectId: string;
  recordId: string;
  title: string;
  creator: string | null;
  year: string | null;
  source: string | null;
  doiOrUrl: string | null;
  country: string | null;
  region: string | null;
  theme: string | null;
  method: string | null;
  openAccess: boolean | null;
  screeningStatus: ReviewScreeningStatus;
  exclusionReason: ReviewExclusionReason | null;
  notes: string | null;
  updatedAt: string;
};

export type PrismaFlowCounts = {
  recordsIdentified: number;
  duplicatesRemoved: number;
  recordsScreened: number;
  recordsExcluded: number;
  fullTextAssessed: number;
  finalIncluded: number;
  awaitingScreening: number;
};

export type ReviewIntelligenceKpis = {
  activeReviewProjects: number;
  awaitingScreening: number;
  finalIncludedRecords: number;
  strongestTheme: string | null;
  weakestGeography: string | null;
  missingMetadata: number;
};

export type SavedSearchInsight = {
  id: string;
  label: string;
  query: string;
  createdAt: string;
};

export type IntelligenceDashboardPayload = {
  overview: IntelligenceOverviewMetrics;
  sourceDistribution: SourceIntelligence;
  typeDistribution: IntelligenceDistributionEntry[];
  timeline: TemporalCoverage;
  geography: GeographicCoverage;
  reviews: ReviewIntelligenceDetail;
  citations: CitationIntelligence;
  warnings: IntelligenceResearchGap[];
  records: IntelligenceItem[];
};

export type IntelligenceSnapshot = {
  items: IntelligenceItem[];
  collections: IntelligenceCollection[];
  summary: Record<IntelligenceSummaryKey, number>;
  suggestions: IntelligenceSuggestion[];
  profile: UserResearchProfile;
  preferences: WorkbenchUserPreferences | null;
  recordRelations: Array<{
    recordId: string;
    title: string;
    relations: IntelligenceRelation[];
  }>;
  dashboard: IntelligenceDashboardKpis;
  worldMap: IntelligenceWorldMapPoint[];
  locations: IntelligenceLocationCard[];
  comparisons: IntelligencePlaceComparison[];
  cityPlaces: IntelligenceCityPlace[];
  sources: IntelligenceSourcePerformance[];
  gaps: IntelligenceResearchGap[];
  facets: IntelligenceFacets;
  literatureReview: IntelligenceLiteratureReview;
  behaviorInsights: IntelligenceBehaviorInsight[];
  activityFeed: IntelligenceActivityEntry[];
  readingPatterns: IntelligenceReadingPattern[];
  reviewProjects: ReviewProject[];
  reviewScreenings: ReviewScreeningRecord[];
  prismaCounts: PrismaFlowCounts;
  reviewKpis: ReviewIntelligenceKpis;
  savedSearchInsights: SavedSearchInsight[];
  overviewMetrics: IntelligenceOverviewMetrics;
  sourceIntelligence: SourceIntelligence;
  citationIntelligence: CitationIntelligence;
  recommendations: IntelligenceRecommendation[];
  reviewDetail: ReviewIntelligenceExtras;
  errors: string[];
};
