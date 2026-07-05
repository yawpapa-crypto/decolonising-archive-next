import type { ExtractedCatalogueRecord } from "./types";
import { assignRecordId, buildAredInterpretation, buildSourceFacts } from "./record-builder";
import { inferPeriod, inferVisualSystem, isGhanaRelevant } from "./ghana-relevance";

const USER_AGENT = "ARED-Catalogue-Extractor/1.0 (research; mailto:archive@ared.design)";
const ACCESS_DATE = new Date().toISOString().slice(0, 10);

type ClevelandArtwork = {
  id: number;
  accession_number: string;
  title: string;
  creation_date?: string;
  creation_date_earliest?: number;
  creation_date_latest?: number;
  culture?: string[];
  technique?: string;
  type?: string;
  measurements?: string;
  url?: string;
  share_license_status?: string;
  tombstone?: string;
  department?: string;
};

export async function fetchClevelandGhanaRecords(): Promise<ExtractedCatalogueRecord[]> {
  const records: ExtractedCatalogueRecord[] = [];
  const seen = new Set<string>();
  let skip = 0;
  const limit = 100;

  while (true) {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=Ghana&limit=${limit}&skip=${skip}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) break;
    const data = (await res.json()) as { data: ClevelandArtwork[]; info: { total: number } };
    if (!data.data?.length) break;

    for (const art of data.data) {
      if (seen.has(art.accession_number)) continue;
      const culture = (art.culture ?? []).join("; ");
      if (
        !isGhanaRelevant({
          title: art.title,
          culture,
          country: culture.includes("Ghana") ? "Ghana" : "",
          classification: art.type,
          medium: art.technique,
        })
      ) {
        continue;
      }
      seen.add(art.accession_number);
      const dateStart = art.creation_date_earliest ? String(art.creation_date_earliest) : "";
      const dateEnd = art.creation_date_latest ? String(art.creation_date_latest) : "";
      const period = inferPeriod(dateStart, dateEnd);
      const vs = inferVisualSystem(`${art.type} ${culture} ${art.title}`);
      const idx = records.length + 1;

      const sourceFacts = buildSourceFacts([
        `The Cleveland Museum of Art records accession ${art.accession_number} as "${art.title}".`,
        art.creation_date ? `Date: ${art.creation_date}.` : "",
        culture ? `Culture: ${culture}.` : "",
        art.technique ? `Technique/material: ${art.technique}.` : "",
        art.measurements ? `Measurements: ${art.measurements}.` : "",
        art.tombstone ? `Tombstone: ${art.tombstone}.` : "",
      ]);

      records.push({
        record_id: assignRecordId("CLE", idx),
        title: art.title,
        alternate_title: "",
        record_type: "museum object",
        period_id: period.id,
        period_label: period.label,
        visual_system_id: vs.id,
        visual_system_label: vs.label,
        date_display: art.creation_date || dateStart || "unknown",
        date_start: dateStart,
        date_end: dateEnd,
        date_certainty: art.creation_date ? "museum dated" : "unknown",
        region: "Ghana",
        locality: "",
        community_or_culture: culture,
        creator_or_authority: culture.includes("unknown") ? "Unrecorded artist" : culture,
        creator_role: "maker",
        creator_certainty: "institutional attribution",
        commissioner: "",
        workshop_or_printer: "",
        institution_or_collection: "Cleveland Museum of Art",
        collection_number: art.accession_number,
        object_type: art.type || "artwork",
        medium: art.technique || "",
        technique: art.technique || "",
        dimensions: art.measurements || "",
        language: "",
        source_facts: sourceFacts,
        ared_interpretation: buildAredInterpretation(art.type || "", culture),
        historical_significance: "",
        cultural_interpretation: "",
        provenance: art.tombstone || "",
        acquisition_history: art.tombstone || "",
        primary_source_name: "Cleveland Museum of Art Open Access",
        primary_source_url: art.url || `https://www.clevelandart.org/art/${art.id}`,
        secondary_sources: "",
        bibliography: "",
        evidence_summary: `Cleveland accession ${art.accession_number} accessed ${ACCESS_DATE}.`,
        access_date: ACCESS_DATE,
        rights_status: art.share_license_status === "CC0" ? "CC0" : "linked_record",
        image_rights_status: art.share_license_status || "check museum terms",
        community_authority_status: "assess where culturally governed",
        verification_status: "verified",
        uncertainties: "",
        related_record_ids: "",
        tags: `Cleveland; ${art.type || "object"}; Ghana`,
        build_id: "2026-07-05-taxonomy-v1",
        dedup_key: `cle:${art.accession_number}`,
        source_institution: "Cleveland Museum of Art",
      });
    }

    skip += limit;
    if (skip >= data.info.total) break;
  }

  return records;
}
