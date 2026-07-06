/** Curated historical catalogue entry — documented practice, person, institution or work */

export type HistoricalEntry = {
  title: string;
  alternate_title?: string;
  record_type: string;
  period_id: string;
  period_label: string;
  visual_system_id: string;
  visual_system_label: string;
  date_display: string;
  date_start: string;
  date_end: string;
  date_certainty?: string;
  region?: string;
  locality?: string;
  community_or_culture?: string;
  creator_or_authority?: string;
  creator_role?: string;
  institution_or_collection?: string;
  object_type?: string;
  medium?: string;
  source_facts: string;
  ared_interpretation: string;
  historical_significance?: string;
  primary_source_name: string;
  primary_source_url: string;
  secondary_sources?: string;
  bibliography?: string;
  verification_status: "partially_verified" | "source_located";
  uncertainties?: string;
  tags: string;
};
