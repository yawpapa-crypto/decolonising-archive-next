import type { ExtractedCatalogueRecord } from "./types";
import type { MetObject } from "./types";
import { isGhanaRelevant, inferPeriod, inferVisualSystem } from "./ghana-relevance";
import { assignRecordId, buildAredInterpretation, buildSourceFacts } from "./record-builder";

const ACCESS_DATE = new Date().toISOString().slice(0, 10);

export function metObjectToRecord(obj: MetObject, index: number): ExtractedCatalogueRecord | null {
  if (
    !isGhanaRelevant({
      title: obj.title,
      culture: obj.culture,
      country: obj.country,
      region: obj.region,
      locale: obj.locale,
      period: obj.period,
      classification: obj.classification,
      objectName: obj.objectName,
    })
  ) {
    return null;
  }

  const dateStart = obj.objectBeginDate ? String(obj.objectBeginDate) : "";
  const dateEnd = obj.objectEndDate ? String(obj.objectEndDate) : "";
  const dateDisplay = obj.objectDate || (dateStart && dateEnd ? `${dateStart}–${dateEnd}` : dateStart || "unknown");
  const dateCertainty = obj.objectDate?.includes("–") || obj.objectDate?.includes("-") ? "broad museum dating" : dateStart ? "museum dated" : "unknown";

  const creator = obj.artistDisplayName || "Unrecorded artist";
  const creatorCertainty = obj.artistDisplayName ? "institutional attribution" : "unrecorded";

  const objectType = obj.classification || obj.objectName || obj.title;
  const vs = inferVisualSystem(`${objectType} ${obj.culture} ${obj.title}`);
  const period = inferPeriod(dateStart, dateEnd);

  const collectionNumber = `Met ${obj.objectID}`;
  const sourceFacts = buildSourceFacts([
    `The Metropolitan Museum of Art records object ${obj.objectID} as "${obj.title}".`,
    obj.culture ? `Culture: ${obj.culture}.` : "",
    obj.country ? `Geographic attribution: ${obj.country}.` : "",
    obj.region ? `Region: ${obj.region}.` : "",
    obj.locale ? `Locality: ${obj.locale}.` : "",
    obj.objectDate ? `Date: ${obj.objectDate}.` : "",
    obj.medium ? `Medium: ${obj.medium}.` : "",
    obj.dimensions ? `Dimensions: ${obj.dimensions}.` : "",
    obj.creditLine ? `Credit line: ${obj.creditLine}.` : "",
    obj.artistDisplayName ? `Artist/maker field: ${obj.artistDisplayName}.` : "Maker unnamed in museum record.",
  ]);

  const uncertainties: string[] = [];
  if (!obj.artistDisplayName) uncertainties.push("maker unnamed in source");
  if (!dateStart) uncertainties.push("date not precisely dated in source");
  if (obj.country && !/ghana|gold coast/i.test(obj.country))
    uncertainties.push(`museum places production in ${obj.country}`);

  return {
    record_id: assignRecordId("MET", index),
    title: obj.title,
    alternate_title: "",
    record_type: "museum object",
    period_id: period.id,
    period_label: period.label,
    visual_system_id: vs.id,
    visual_system_label: vs.label,
    date_display: dateDisplay,
    date_start: dateStart,
    date_end: dateEnd,
    date_certainty: dateCertainty,
    region: obj.country || obj.region || "West Africa",
    locality: obj.locale || obj.region || "",
    community_or_culture: obj.culture || "",
    creator_or_authority: creator,
    creator_role: obj.artistDisplayName ? "artist/maker" : "unrecorded maker",
    creator_certainty: creatorCertainty,
    commissioner: "",
    workshop_or_printer: "",
    institution_or_collection: "Metropolitan Museum of Art",
    collection_number: collectionNumber,
    object_type: objectType,
    medium: obj.medium || "",
    technique: "",
    dimensions: obj.dimensions || "",
    language: "",
    source_facts: sourceFacts,
    ared_interpretation: buildAredInterpretation(objectType, obj.culture || ""),
    historical_significance: "",
    cultural_interpretation: "",
    provenance: obj.creditLine || "",
    acquisition_history: obj.creditLine || "",
    primary_source_name: "Metropolitan Museum of Art Collection Online",
    primary_source_url: obj.objectURL,
    secondary_sources: "",
    bibliography: "",
    evidence_summary: `Museum object record ${obj.objectID} accessed ${ACCESS_DATE}.`,
    access_date: ACCESS_DATE,
    rights_status: obj.isPublicDomain ? "public domain (Met Open Access)" : "linked_record",
    image_rights_status: obj.isPublicDomain ? "Met Open Access where applicable" : "check Met terms",
    community_authority_status: /asafo|adinkra|kente|goldweight|gold weight/i.test(objectType)
      ? "assess where culturally governed"
      : "not_required",
    verification_status: "verified",
    uncertainties: uncertainties.join("; "),
    related_record_ids: "",
    tags: `Met; ${obj.classification || "object"}; ${obj.culture || "Ghana-related"}`.replace(/; ;/g, ";"),
    build_id: "2026-07-05-taxonomy-v1",
    dedup_key: `met:${obj.objectID}`,
    source_institution: "Metropolitan Museum of Art",
  };
}
