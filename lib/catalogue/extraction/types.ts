/** Object-level catalogue record extracted from museum / archive APIs */

export type ExtractedCatalogueRecord = {
  record_id: string;
  title: string;
  alternate_title: string;
  record_type: string;
  period_id: string;
  period_label: string;
  visual_system_id: string;
  visual_system_label: string;
  date_display: string;
  date_start: string;
  date_end: string;
  date_certainty: string;
  region: string;
  locality: string;
  community_or_culture: string;
  creator_or_authority: string;
  creator_role: string;
  creator_certainty: string;
  commissioner: string;
  workshop_or_printer: string;
  institution_or_collection: string;
  collection_number: string;
  object_type: string;
  medium: string;
  technique: string;
  dimensions: string;
  language: string;
  source_facts: string;
  ared_interpretation: string;
  historical_significance: string;
  cultural_interpretation: string;
  provenance: string;
  acquisition_history: string;
  primary_source_name: string;
  primary_source_url: string;
  secondary_sources: string;
  bibliography: string;
  evidence_summary: string;
  access_date: string;
  rights_status: string;
  image_rights_status: string;
  community_authority_status: string;
  verification_status: "verified" | "partially_verified";
  uncertainties: string;
  related_record_ids: string;
  tags: string;
  build_id: string;
  /** Dedup key: institution + collection number */
  dedup_key: string;
  source_institution: string;
};

export type ExtractionLogEntry = {
  institution: string;
  search_terms: string;
  pages_examined: number;
  records_extracted: number;
  records_rejected: number;
  duplicates_merged: number;
  inaccessible: number;
  notes: string;
  timestamp: string;
};

export type MetObject = {
  objectID: number;
  title: string;
  culture: string;
  period: string;
  dynasty: string;
  artistDisplayName: string;
  objectDate: string;
  objectBeginDate: number;
  objectEndDate: number;
  medium: string;
  dimensions: string;
  creditLine: string;
  country: string;
  region: string;
  locale: string;
  classification: string;
  objectURL: string;
  objectName: string;
  repository: string;
  isPublicDomain: boolean;
};
