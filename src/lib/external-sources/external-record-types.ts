export type ExternalResultMode = "external_record" | "external_handoff";

/** High-level grouping for filters / UI (future). */
export type ExternalSourceCategoryGroup =
  | "local_archive"
  | "external_records"
  | "open_access_books"
  | "open_textbooks_oer"
  | "public_domain_texts"
  | "australian_open_collections"
  | "african_open_collections"
  | "global_open_collections"
  | "institutional_presses"
  | "source_handoffs";

export type ExternalArchiveRecord = {
  id: string;
  externalId: string;
  sourceId: string;
  sourceLabel: string;
  sourceType: string;
  /** UI grouping for discovery filters (future). */
  sourceCategoryGroup?: ExternalSourceCategoryGroup;
  title: string;
  creator?: string;
  contributors?: string[];
  description?: string;
  publisher?: string;
  publicationDate?: string;
  sourceUrl: string;
  downloadUrl?: string;
  licence?: string;
  licenceUri?: string;
  rightsLabel: string;
  licenceLabel?: string;
  accessLabel: string;
  reviewLabel: string;
  caution?: string;
  isbn?: string[];
  doi?: string;
  subjects?: string[];
  language?: string[];
  region?: string;
  country?: string;
  metadataLicence?: string;
  metadataJson?: unknown;
  resultMode: ExternalResultMode;
  /** Optional record-type label for cards (e.g. Open access book). */
  recordTypeLabel?: string;
};

export type ExternalSourceStatus = {
  id: string;
  label: string;
  state: "ok" | "empty" | "fail" | "skipped" | "unavailable";
  count?: number;
  message?: string;
};

export type ExternalSearchPayload = {
  ok: boolean;
  /** Client-ready shapes (subset of archive card fields + pack markers). */
  results: unknown[];
  sourceStatuses: ExternalSourceStatus[];
  notices?: {
    externalRights: string;
    doabMetadata: string;
  };
  error?: string;
};
