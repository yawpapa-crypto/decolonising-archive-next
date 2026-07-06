export const RECORD_TYPES = [
  "Architecture / Built Work",
  "Archival Document",
  "Artefact",
  "Book",
  "Book Chapter",
  "Exhibition Record",
  "Image",
  "Institutional Record",
  "Journal Article",
  "Manuscript",
  "Oral History",
  "Performance / Sonic Record",
  "Poster",
  "Reference Volume",
  "Teaching Resource",
  "Textile",
  "Website / Digital Resource",
  "Dataset / Metadata Record",
] as const;

export const KNOWLEDGE_AREAS = [
  "African Philosophy",
  "Architecture and Space",
  "Craft and Making",
  "Decolonial Theory",
  "Design History",
  "Education and Pedagogy",
  "Environmental Knowledge",
  "Epistemology",
  "Food Systems",
  "Gender and Feminist Thought",
  "Governance and Civic Life",
  "Indigenous Knowledge Systems",
  "Informal Economies",
  "Language and Writing Systems",
  "Material Culture",
  "Music and Performance",
  "Oral Tradition",
  "Political Thought",
  "Spiritual Practice",
  "Textile Knowledge",
  "Visual Culture",
] as const;

export const REGIONS = [
  "Africa-wide / Pan-African",
  "North Africa",
  "West Africa",
  "Central Africa",
  "East Africa",
  "Southern Africa",
  "Sahel",
  "African Diaspora",
  "Global / Comparative",
] as const;

export const COMMUNITY_GROUPS = [
  "Akan",
  "Asante",
  "Yoruba",
  "Igbo",
  "Hausa",
  "Oromo",
  "Zulu",
  "Xhosa",
  "Ewe",
  "Mande",
  "Tuareg / Amazigh",
  "Swahili Coast Communities",
  "Multiple / Pan-African",
  "Unknown / Needs Review",
] as const;

export const LANGUAGES = [
  "English",
  "French",
  "Arabic",
  "Portuguese",
  "Yoruba",
  "Hausa",
  "Swahili",
  "Akan / Twi",
  "Amharic",
  "Other African Language",
  "Multiple Languages",
  "Unknown",
] as const;

export const SCRIPTS = [
  "Latin",
  "Arabic",
  "Ajami",
  "Ge'ez",
  "Nsibidi",
  "Tifinagh",
  "N'Ko",
  "Vai",
  "Other",
  "Unknown",
] as const;

export const PERIODS = [
  "Precolonial",
  "Colonial",
  "Independence Era",
  "Postcolonial",
  "Contemporary",
  "Unknown / Undated",
] as const;

export const CURATED_COLLECTIONS = [
  "African Philosophy Working Library",
  "Decolonial Theory Canon",
  "African Material Culture",
  "Architecture Beyond Colonialism",
  "Manuscripts & Precolonial Texts",
  "West African Oral Traditions",
  "Liberation Movement Graphics",
] as const;

export const RIGHTS_STATUSES = [
  "Public Domain",
  "Creative Commons",
  "Open Access",
  "In Copyright",
  "Permission Granted",
  "Metadata Only",
  "Link Only",
  "Rights Unknown",
  "Restricted / Sensitive",
  "Review Required",
  "Check source",
] as const;

export const LICENCES = [
  "CC0",
  "CC BY",
  "CC BY 4.0",
  "CC BY-SA",
  "CC BY-NC",
  "CC BY-NC-SA",
  "CC BY-ND",
  "CC BY-NC-ND",
  "Public Domain Mark",
  "RightsStatements.org URI",
  "All Rights Reserved",
  "Check source",
  "Unknown",
  "Custom / Other",
] as const;

export const ACCESS_TYPES = [
  "Full Text Available",
  "Download Available",
  "Read Online",
  "Image Available",
  "Thumbnail Only",
  "External Link Only",
  "Metadata Only",
  "Restricted Access",
  "Requires Permission",
  "Community Review Required",
  "Check Source",
] as const;

export const REUSE_PERMISSIONS = [
  "Reuse Allowed with Attribution",
  "Non-Commercial Reuse Only",
  "Educational Use Only",
  "No Reuse Without Permission",
  "Check Original Source",
  "Unknown",
] as const;

export const CULTURAL_SENSITIVITIES = [
  "Public",
  "Context Required",
  "Sensitive",
  "Community Review Needed",
  "Restricted",
  "Do Not Display Media",
  "Takedown / Review Requested",
] as const;

export const COMMUNITY_REVIEW_STATUSES = [
  "Not Required",
  "Not Reviewed",
  "Review Requested",
  "Community Reviewed",
  "Restricted by Community",
  "Do Not Publish",
] as const;

export const VERIFICATION_STATUSES = [
  "Verified",
  "Source Checked",
  "Rights Checked",
  "External Source",
  "Metadata Reviewed",
  "AI-Assisted, Needs Review",
  "Community Submitted",
  "Unverified",
  "Provisional",
  "Needs Correction",
  "Duplicate Suspected",
  "Takedown Requested",
] as const;

export const SOURCE_TYPES = [
  "Museum / Gallery",
  "Library Catalogue",
  "Archive",
  "Journal Database",
  "University Repository",
  "Book Publisher",
  "Community Submission",
  "Government Source",
  "NGO / Cultural Organisation",
  "Researcher Submitted",
  "Web Resource",
  "AI-Assisted Discovery",
] as const;

export const ADMIN_FILTERS = [
  "Rights unclear",
  "Copyright risk",
  "Cultural review required",
  "AI-assisted record",
  "Missing source URL",
  "Missing citation",
  "Missing rights holder",
  "Missing date accessed",
  "Duplicate theme",
  "Needs metadata cleanup",
  "Takedown requested",
  "Missing cultural sensitivity status",
  "Missing verification status",
] as const;

export type ArchiveRecord = {
  id: string;
  title: string;
  alternativeTitles?: string[];
  description: string;
  creator?: string;
  contributors?: string[];
  publisher?: string;
  recordType: string[];
  knowledgeAreas: string[];
  curatedCollections?: string[];
  region: string[];
  country?: string[];
  place?: string[];
  communityOrCulturalGroup?: string[];
  language: string[];
  script?: string[];
  dateCreated?: string;
  datePublished?: string;
  dateDigitised?: string;
  dateAccessed: string;
  period?: string[];
  sourceName: string;
  sourceUrl: string;
  citation: string;
  identifier?: string;
  doi?: string;
  isbn?: string;
  externalIds?: {
    openAlex?: string;
    crossref?: string;
    worldcat?: string;
    libraryOfCongress?: string;
    trove?: string;
    europeana?: string;
  };
  rightsStatus: string;
  licence?: string;
  rightsStatementUri?: string;
  rightsHolder?: string;
  accessType: string;
  reusePermission?: string;
  recommendedAttribution?: string;
  copyrightNote?: string;
  permissionEvidence?: string;
  culturalSensitivity: string;
  traditionalOwnersOrKnowledgeHolders?: string;
  culturalProtocolNote?: string;
  colonialLanguageWarning?: boolean;
  reparativeDescriptionNote?: string;
  localContextsLabel?: string;
  localContextsNotice?: string;
  communityReviewStatus?: string;
  verificationStatus: string;
  sourceType?: string;
  sourceChecked?: boolean;
  rightsChecked?: boolean;
  metadataReviewed?: boolean;
  aiAssisted?: boolean;
  confidenceLevel?: "high" | "medium" | "low";
  adminNotes?: string;
  published?: boolean;
  status?: "Draft" | "Provisional" | "Needs Review" | "Published";
  summary?: string;
  tags?: string[];
  notes?: string[];
  type?: string;
  source?: string;
  institution?: string;
  collection?: string;
  sourceActionLabel?: string;
  archiveIdentifier?: string;
  recordIdentifier?: string;
  abstract?: string;
  keywords?: string[];
  createdAt: string;
  updatedAt: string;
};

type LegacyRecord = Record<string, unknown>;

const valueMaps = new Map<string, string>([
  ["african philosophy", "African Philosophy"],
  ["political thought", "Political Thought"],
  ["music & performance", "Music and Performance"],
  ["music and performance", "Music and Performance"],
  ["oral traditions", "Oral Tradition"],
  ["oral tradition", "Oral Tradition"],
  ["indigenous epistemologies", "Indigenous Knowledge Systems"],
  ["indigenous knowledge systems", "Indigenous Knowledge Systems"],
  ["language & script", "Language and Writing Systems"],
  ["language and writing systems", "Language and Writing Systems"],
  ["design & making", "Craft and Making"],
  ["material culture", "Material Culture"],
  ["visual culture", "Visual Culture"],
  ["decolonial theory", "Decolonial Theory"],
  ["history & theory", "Decolonial Theory"],
  ["philosophy & theory", "African Philosophy"],
  ["architecture", "Architecture / Built Work"],
  ["architecture / built work", "Architecture / Built Work"],
  ["books & texts", "Book"],
  ["oral histories", "Oral History"],
  ["twi", "Akan / Twi"],
  ["akan/twi", "Akan / Twi"],
  ["ge'ez", "Ge'ez"],
  ["geez", "Ge'ez"],
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const single = text(value);
  if (!single) return [];
  return single
    .split(/\s*(?:,|;|\s\/\s)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugifyMetadataTerm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function canonical(value: string): string {
  return valueMaps.get(value.trim().toLowerCase()) || value.trim();
}

function uniqueCanonical(items: unknown, allowed?: readonly string[]): string[] {
  const allowedSet = allowed ? new Set(allowed) : null;
  const seen = new Set<string>();
  const next: string[] = [];
  values(items).forEach((item) => {
    const normal = canonical(item);
    if (allowedSet && !allowedSet.has(normal)) return;
    const key = slugifyMetadataTerm(normal);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(normal);
  });
  return next;
}

function normalizeRegion(items: unknown): string[] {
  const raw = values(items);
  const expanded: string[] = [];
  raw.forEach((item) => {
    const lower = item.toLowerCase();
    if (lower.includes("west")) expanded.push("West Africa");
    if (lower.includes("north")) expanded.push("North Africa");
    if (lower.includes("east")) expanded.push("East Africa");
    if (lower.includes("southern") || lower.includes("south africa")) expanded.push("Southern Africa");
    if (lower.includes("central")) expanded.push("Central Africa");
    if (lower.includes("sahel")) expanded.push("Sahel");
    if (lower.includes("diaspora")) expanded.push("African Diaspora");
    if (lower.includes("global") || lower.includes("comparative")) expanded.push("Global / Comparative");
    if (lower.includes("pan-africa") || lower.includes("pan africa") || lower.includes("africa / global") || lower.includes("africa-wide")) expanded.push("Africa-wide / Pan-African");
  });
  return uniqueCanonical(expanded.length ? expanded : raw, REGIONS);
}

function normalizeRecordType(record: LegacyRecord): string[] {
  const raw = uniqueCanonical(record.recordType ?? record.type, RECORD_TYPES);
  if (raw.length) return raw;
  const candidate = canonical(text(record.cat));
  return RECORD_TYPES.includes(candidate as (typeof RECORD_TYPES)[number]) ? [candidate] : ["Dataset / Metadata Record"];
}

function normalizeKnowledgeAreas(record: LegacyRecord): string[] {
  const legacyTypeAreas = uniqueCanonical(record.type, KNOWLEDGE_AREAS);
  return uniqueCanonical(
    [
      ...values(record.knowledgeAreas),
      ...values(record.themes),
      ...values(record.concepts),
      ...values(record.tags),
      ...values(record.cat),
      ...legacyTypeAreas,
    ],
    KNOWLEDGE_AREAS,
  );
}

function normalizeLanguageAndScript(record: LegacyRecord) {
  const rawLanguage = values(record.language);
  const scripts = [...values(record.script)];
  const languages: string[] = [];
  rawLanguage.forEach((item) => {
    if (item.toLowerCase() === "ajami") scripts.push("Ajami");
    else languages.push(item);
  });
  return {
    language: uniqueCanonical(languages.length ? languages : ["Unknown"], LANGUAGES),
    script: uniqueCanonical(scripts, SCRIPTS),
  };
}

export function normalizeArchiveRecord(input: unknown): ArchiveRecord {
  const record = (input && typeof input === "object" ? input : {}) as LegacyRecord;
  const now = new Date().toISOString();
  const descriptionParts = values(record.description);
  const summary = text(record.summary) || text(record.abstract);
  const { language, script } = normalizeLanguageAndScript(record);
  const rightsStatus = canonical(text(record.rightsStatus) || text(record.rights) || "Rights Unknown");
  const accessType = canonical(text(record.accessType) || (text(record.sourceUrl) ? "External Link Only" : "Metadata Only"));
  const culturalSensitivity = canonical(text(record.culturalSensitivity) || "Public");
  const verificationStatus = canonical(text(record.verificationStatus) || (record.aiAssisted ? "AI-Assisted, Needs Review" : "Provisional"));
  const sourceName = text(record.sourceName) || text(record.source) || text(record.institution);
  const sourceUrl = text(record.sourceUrl);
  const citation =
    text(record.citation) ||
    [text(record.creator), text(record.title), sourceName, sourceUrl].filter(Boolean).join(". ");

  const normalized: ArchiveRecord = {
    id: text(record.id) || `record-${Date.now()}`,
    title: text(record.title) || "Untitled record",
    alternativeTitles: uniqueCanonical(record.alternativeTitles ?? record.alternateTitle),
    description: descriptionParts.join("\n\n") || summary || text(record.title) || "Description pending metadata review.",
    creator: text(record.creator),
    contributors: uniqueCanonical(record.contributors),
    publisher: text(record.publisher),
    recordType: normalizeRecordType(record),
    knowledgeAreas: normalizeKnowledgeAreas(record),
    curatedCollections: uniqueCanonical(record.curatedCollections ?? record.collection, CURATED_COLLECTIONS),
    region: normalizeRegion(record.region),
    country: uniqueCanonical(record.country ?? record.countries),
    place: uniqueCanonical(record.place),
    communityOrCulturalGroup: uniqueCanonical(record.communityOrCulturalGroup ?? record.community),
    language,
    script,
    dateCreated: text(record.dateCreated),
    datePublished: text(record.datePublished),
    dateDigitised: text(record.dateDigitised),
    dateAccessed: text(record.dateAccessed),
    period: uniqueCanonical(record.period, PERIODS),
    sourceName,
    sourceUrl,
    citation,
    identifier: text(record.identifier) || text(record.recordIdentifier),
    doi: text(record.doi),
    isbn: text(record.isbn),
    rightsStatus: RIGHTS_STATUSES.includes(rightsStatus as (typeof RIGHTS_STATUSES)[number]) ? rightsStatus : "Rights Unknown",
    licence: text(record.licence),
    rightsStatementUri: text(record.rightsStatementUri),
    rightsHolder: text(record.rightsHolder),
    accessType: ACCESS_TYPES.includes(accessType as (typeof ACCESS_TYPES)[number]) ? accessType : "Metadata Only",
    reusePermission: text(record.reusePermission) || "Check Original Source",
    recommendedAttribution: text(record.recommendedAttribution),
    copyrightNote: text(record.copyrightNote),
    permissionEvidence: text(record.permissionEvidence),
    culturalSensitivity: CULTURAL_SENSITIVITIES.includes(culturalSensitivity as (typeof CULTURAL_SENSITIVITIES)[number])
      ? culturalSensitivity
      : "Public",
    traditionalOwnersOrKnowledgeHolders: text(record.traditionalOwnersOrKnowledgeHolders),
    culturalProtocolNote: text(record.culturalProtocolNote),
    colonialLanguageWarning: Boolean(record.colonialLanguageWarning),
    reparativeDescriptionNote: text(record.reparativeDescriptionNote),
    localContextsLabel: text(record.localContextsLabel),
    localContextsNotice: text(record.localContextsNotice),
    communityReviewStatus: text(record.communityReviewStatus) || "Not Required",
    verificationStatus: VERIFICATION_STATUSES.includes(verificationStatus as (typeof VERIFICATION_STATUSES)[number])
      ? verificationStatus
      : "Provisional",
    sourceType: text(record.sourceType),
    sourceChecked: Boolean(record.sourceChecked),
    rightsChecked: Boolean(record.rightsChecked),
    metadataReviewed: Boolean(record.metadataReviewed),
    aiAssisted: Boolean(record.aiAssisted),
    confidenceLevel: record.confidenceLevel === "high" || record.confidenceLevel === "medium" || record.confidenceLevel === "low"
      ? record.confidenceLevel
      : undefined,
    adminNotes: text(record.adminNotes),
    published: Boolean(record.published),
    status: (text(record.status) as ArchiveRecord["status"]) || (record.published ? "Published" : "Draft"),
    summary,
    tags: uniqueCanonical(record.tags),
    notes: values(record.notes),
    type: normalizeRecordType(record)[0],
    source: sourceName,
    institution: text(record.institution),
    collection: uniqueCanonical(record.curatedCollections ?? record.collection, CURATED_COLLECTIONS)[0],
    sourceActionLabel: text(record.sourceActionLabel),
    archiveIdentifier: text(record.archiveIdentifier),
    recordIdentifier: text(record.recordIdentifier) || text(record.identifier),
    abstract: text(record.abstract),
    keywords: uniqueCanonical(record.keywords),
    createdAt: text(record.createdAt) || now,
    updatedAt: now,
  };

  if (!normalized.dateAccessed) normalized.dateAccessed = "";
  if (!normalized.region.length && !normalized.country?.length) normalized.region = [];
  if (!normalized.knowledgeAreas.length) normalized.knowledgeAreas = ["Decolonial Theory"];
  normalized.published = canPublishRecord(normalized).ok && normalized.status === "Published";
  if (!normalized.published && normalized.status === "Published") normalized.status = "Needs Review";
  return normalized;
}

export function canPublishRecord(record: ArchiveRecord): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const requireText = (label: string, value: unknown) => {
    if (!text(value)) missing.push(label);
  };
  const requireList = (label: string, value: unknown) => {
    if (!values(value).length) missing.push(label);
  };

  requireText("Title", record.title);
  requireList("Record Type", record.recordType);
  requireText("Description", record.description);
  requireText("Source Name", record.sourceName);
  requireText("Source URL", record.sourceUrl);
  requireText("Citation", record.citation);
  if (!record.region.length && !record.country?.length) missing.push("Region or Country");
  requireList("Knowledge Area", record.knowledgeAreas);
  requireList("Language", record.language);
  requireText("Rights Status", record.rightsStatus);
  requireText("Access Type", record.accessType);
  requireText("Verification Status", record.verificationStatus);
  requireText("Date Accessed", record.dateAccessed);

  const communityKnowledge =
    record.culturalSensitivity !== "Public" ||
    Boolean(record.traditionalOwnersOrKnowledgeHolders) ||
    Boolean(record.localContextsLabel) ||
    Boolean(record.localContextsNotice);
  if (communityKnowledge) {
    requireText("Cultural Sensitivity", record.culturalSensitivity);
    requireList("Community / Cultural Group", record.communityOrCulturalGroup);
    requireText("Cultural Protocol Note", record.culturalProtocolNote);
    requireText("Community Review Status", record.communityReviewStatus);
  }

  return { ok: missing.length === 0, missing };
}

export function getAdminMetadataIssues(record: ArchiveRecord): string[] {
  const issues: string[] = [];
  if (!record.rightsStatus) issues.push("Missing rights status");
  if (!record.sourceUrl) issues.push("Missing source URL");
  if (!record.citation) issues.push("Missing citation");
  if (record.rightsStatus === "Rights Unknown") issues.push("Rights unknown");
  if (record.rightsStatus === "In Copyright" || record.rightsStatus === "Restricted / Sensitive") issues.push("Copyright risk");
  if (record.culturalSensitivity === "Community Review Needed") issues.push("Cultural review needed");
  if (record.aiAssisted || record.verificationStatus === "AI-Assisted, Needs Review") issues.push("AI-assisted record");
  if (record.verificationStatus === "Provisional") issues.push("Provisional");
  if (!record.language.length) issues.push("Missing language");
  if (!record.dateAccessed) issues.push("Missing date accessed");
  if (!record.rightsHolder) issues.push("Missing rights holder");
  if (!record.culturalSensitivity) issues.push("Missing cultural sensitivity status");
  if (!record.verificationStatus) issues.push("Missing verification status");
  if (record.verificationStatus === "Takedown Requested" || record.culturalSensitivity === "Takedown / Review Requested") {
    issues.push("Takedown requested");
  }
  return issues;
}
