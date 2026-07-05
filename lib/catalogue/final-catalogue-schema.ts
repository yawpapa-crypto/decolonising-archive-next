/** Schema for the verified-only public catalogue CSV. */

export const FINAL_CATALOGUE_HEADERS = [
  "record_id",
  "title",
  "alternate_title",
  "record_type",
  "period_id",
  "period_label",
  "visual_system_id",
  "visual_system_label",
  "date_start",
  "date_end",
  "date_display",
  "date_certainty",
  "region",
  "locality",
  "community_or_culture",
  "creator_or_authority",
  "creator_role",
  "commissioner",
  "workshop_or_printer",
  "institution_or_collection",
  "collection_number",
  "object_or_record_type",
  "medium_or_format",
  "dimensions",
  "language",
  "description",
  "historical_significance",
  "cultural_interpretation",
  "provenance_or_custody_note",
  "acquisition_history",
  "source_name",
  "source_url",
  "secondary_source_name",
  "secondary_source_url",
  "additional_sources",
  "source_access_date",
  "evidence_excerpt_or_summary",
  "rights_status",
  "rights_holder",
  "image_rights_status",
  "rights_note",
  "community_authority_required",
  "community_authority_status",
  "verification_status",
  "verification_notes",
  "disputed_information",
  "related_record_ids",
  "tags",
  "build_id",
] as const;

export type VerificationStatus = "verified" | "partially_verified" | "unverified";

export function legacyRowToFinalRow(
  row: Record<string, string>,
  opts: {
    verificationStatus: VerificationStatus;
    verificationNotes: string;
    sourceAccessDate: string;
    evidenceSummary: string;
    secondarySourceName?: string;
  },
): Record<string, string> {
  const dateStart = row.date_start?.trim() ?? "";
  const dateEnd = row.date_end?.trim() ?? "";
  const dateDisplay =
    dateStart && dateEnd
      ? `${dateStart} – ${dateEnd}`
      : dateStart || dateEnd || "unknown";

  return {
    record_id: row.record_id,
    title: row.title,
    alternate_title: "",
    record_type: row.record_type,
    period_id: row.period_id,
    period_label: row.period_label,
    visual_system_id: row.visual_system_id,
    visual_system_label: row.visual_system_label,
    date_start: dateStart,
    date_end: dateEnd,
    date_display: dateDisplay,
    date_certainty: dateStart ? "approximate" : "unknown",
    region: row.region ?? "",
    locality: row.locality ?? "",
    community_or_culture: row.community_or_culture ?? "",
    creator_or_authority: row.creator_or_authority ?? "",
    creator_role: row.creator_role ?? "",
    commissioner: "",
    workshop_or_printer: "",
    institution_or_collection: row.institution_or_collection ?? "",
    collection_number: "",
    object_or_record_type: row.object_or_record_type ?? "",
    medium_or_format: row.medium_or_format ?? "",
    dimensions: "",
    language: row.language ?? "",
    description: row.description ?? "",
    historical_significance: row.historical_significance ?? "",
    cultural_interpretation: "",
    provenance_or_custody_note: row.provenance_or_custody_note ?? "",
    acquisition_history: "",
    source_name: row.source_name ?? "",
    source_url: row.source_url ?? "",
    secondary_source_name: opts.secondarySourceName ?? "",
    secondary_source_url: row.secondary_source_url ?? "",
    additional_sources: "",
    source_access_date: opts.sourceAccessDate,
    evidence_excerpt_or_summary: opts.evidenceSummary,
    rights_status: row.rights_status ?? "",
    rights_holder: "",
    image_rights_status: row.rights_status ?? "",
    rights_note: row.rights_note ?? "",
    community_authority_required: row.community_authority_required ?? "No",
    community_authority_status: row.community_authority_required === "Yes" ? "required" : "not_required",
    verification_status: opts.verificationStatus,
    verification_notes: opts.verificationNotes,
    disputed_information: "",
    related_record_ids: row.linked_record_ids ?? "",
    tags: row.tags ?? "",
    build_id: row.build_id ?? "2026-07-05-taxonomy-v1",
  };
}
