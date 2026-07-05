/** ARED Ghana Graphic Design History — public research catalogue types */

export const CATALOGUE_BUILD_ID = "2026-07-05-taxonomy-v1";

export const EVIDENCE_STATUSES = [
  "unverified",
  "research_lead",
  "source_located",
  "source_checked",
  "partially_verified",
  "verified",
  "disputed",
  "community_review_required",
  "rights_review_required",
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export type SourceAuthorityLevel = "tier_1" | "tier_2" | "tier_3" | "tier_4";

export type CatalogueRecord = {
  id: string;
  buildId: string;
  /** Original CSV status field — not evidence status */
  importStatus: string;
  publicationState: string;
  title: string;
  recordType: string;
  periodId: string | null;
  periodLabel: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  visualSystemId: string | null;
  visualSystemLabel: string | null;
  region: string | null;
  locality: string | null;
  communityOrCulture: string | null;
  creatorOrAuthority: string | null;
  creatorRole: string | null;
  institutionOrCollection: string | null;
  objectOrRecordType: string | null;
  mediumOrFormat: string | null;
  language: string | null;
  description: string;
  historicalSignificance: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  secondarySourceUrl: string | null;
  sourceType: string | null;
  rightsStatus: string | null;
  rightsNote: string | null;
  researchPriority: string | null;
  researchQuestion: string | null;
  provenanceOrCustodyNote: string | null;
  communityAuthorityRequired: boolean;
  linkedRecordIds: string[];
  tags: string[];
  /** Structured research fields for developing records */
  currentResearchArea: string | null;
  whatRemainsToBeEstablished: string | null;
  /** Visibility separate from verification */
  publicVisibility: boolean;
  evidenceStatus: EvidenceStatus;
  /** Full original CSV row */
  rawCsvRow: Record<string, string>;
  importedAt: string;
};

export type CatalogueVerification = {
  id: string;
  catalogueRecordId: string;
  evidenceStatus: EvidenceStatus;
  checkedBy: string | null;
  checkedAt: string | null;
  primarySourceUrl: string | null;
  secondarySourceUrl: string | null;
  sourceType: string | null;
  sourceAuthorityLevel: SourceAuthorityLevel | null;
  sourceSupportsTitle: boolean | null;
  sourceSupportsCreator: boolean | null;
  sourceSupportsDate: boolean | null;
  sourceSupportsLocation: boolean | null;
  sourceSupportsDescription: boolean | null;
  sourceSupportsHistoricalSignificance: boolean | null;
  rightsChecked: boolean;
  provenanceChecked: boolean;
  communityAuthorityChecked: boolean;
  conflictingEvidence: string | null;
  verificationNotes: string | null;
  unresolvedQuestions: string | null;
  verificationDecision: string | null;
};

export type CatalogueEvidence = {
  id: string;
  catalogueRecordId: string;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourceInstitution: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  publicationDate: string | null;
  accessDate: string | null;
  quotedEvidence: string | null;
  paraphrasedEvidence: string | null;
  claimSupported: string | null;
  reliabilityLevel: SourceAuthorityLevel | null;
  archivedUrl: string | null;
  notes: string | null;
};

export type CatalogueTaxonomyRow = {
  taxonomyType: string;
  code: string;
  label: string;
  definition: string | null;
  buildId: string;
};

export type SourceRegistryRow = {
  sourceName: string;
  sourceUrl: string;
  sourceType: string | null;
  recordsUsingSource: number;
  buildId: string;
};

export type CatalogueVerificationTask = {
  id: string;
  catalogueRecordId: string;
  taskType: string;
  description: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

export type CatalogueStats = {
  buildId: string;
  totalRecords: number;
  verifiedCount: number;
  partiallyVerifiedCount: number;
  disputedCount: number;
  communityReviewCount: number;
  rightsReviewCount: number;
  historicalPeriodCount: number;
  visualSystemCount: number;
  byPeriod: Record<string, number>;
  byVisualSystem: Record<string, number>;
  byRegion: Record<string, number>;
  byEvidenceStatus: Record<string, number>;
};

export type CatalogueFilterParams = {
  q?: string;
  evidenceStatus?: EvidenceStatus | EvidenceStatus[];
  periodId?: string;
  visualSystemId?: string;
  region?: string;
  locality?: string;
  recordType?: string;
  creator?: string;
  institution?: string;
  rightsStatus?: string;
  communityReview?: boolean;
  provenanceKnown?: boolean;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "title" | "maker" | "region" | "evidence" | "date_asc";
};
