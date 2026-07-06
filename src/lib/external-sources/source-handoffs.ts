import type { ExternalArchiveRecord, ExternalSourceCategoryGroup } from "./external-record-types";
import { OPEN_ACCESS_SOURCES, type OpenAccessSource } from "./open-access-sources";
import { normalizeRights } from "./rights-normaliser";

function applySearchTemplate(template: string, encodedQuery: string): string {
  return template.split("{{query}}").join(encodedQuery);
}

function categoryForSource(source: OpenAccessSource): ExternalSourceCategoryGroup {
  if (source.sourceType === "open_access_books") return "open_access_books";
  if (source.sourceType === "open_textbook" || source.sourceType === "oer") return "open_textbooks_oer";
  if (source.sourceType === "public_domain") return "public_domain_texts";
  if (source.sourceType === "australian_open_collection") return "australian_open_collections";
  if (source.sourceType === "institutional_press") return "institutional_presses";
  if (source.integrationMode === "search_handoff" || source.sourceType === "source_handoff") {
    return "source_handoffs";
  }
  return "external_records";
}

function groupRank(source: OpenAccessSource): number {
  const g = categoryForSource(source);
  const order: ExternalSourceCategoryGroup[] = [
    "open_access_books",
    "open_textbooks_oer",
    "public_domain_texts",
    "australian_open_collections",
    "institutional_presses",
    "source_handoffs",
    "external_records",
  ];
  const idx = order.indexOf(g);
  return idx === -1 ? 99 : idx;
}

/**
 * Build handoff discovery records for every enabled registry source that is not served by live REST here.
 * DOAB live search is excluded to avoid duplicate pathways when DOAB is enabled.
 */
export function buildExternalSourceHandoffs(query: string): ExternalArchiveRecord[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const encoded = encodeURIComponent(trimmed);

  const candidates = OPEN_ACCESS_SOURCES.filter((s) => {
    if (!s.enabled || !s.searchUrlTemplate) return false;
    if (s.id === "doab") return false;
    return true;
  });

  const sorted = [...candidates].sort((a, b) => {
    const ga = groupRank(a);
    const gb = groupRank(b);
    if (ga !== gb) return ga - gb;
    return a.label.localeCompare(b.label);
  });

  return sorted.map((source) => {
    const sourceUrl = applySearchTemplate(source.searchUrlTemplate!, encoded);
    const gutenberg = source.id === "project_gutenberg";
    const nr = gutenberg ? normalizeRights("", "", "project_gutenberg", {}) : null;

    return {
      id: `handoff-${source.id}-${encoded.slice(0, 48)}`,
      externalId: `handoff:${source.id}`,
      sourceId: source.id,
      sourceLabel: source.label,
      sourceType: source.sourceType,
      sourceCategoryGroup: categoryForSource(source),
      title: `Search ${source.label} for “${trimmed}”`,
      description: source.description,
      sourceUrl,
      rightsLabel: gutenberg ? nr!.rightsLabel : "Check source",
      accessLabel: gutenberg ? nr!.accessLabel : "External source",
      reviewLabel: gutenberg ? nr!.reviewLabel : "Source handoff",
      caution: gutenberg ? nr!.caution : source.rightsCaution,
      region: source.region,
      country: source.country,
      metadataLicence: source.metadataLicence,
      resultMode: "external_handoff",
      recordTypeLabel: "Source handoff",
    };
  });
}
