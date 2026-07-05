import type { ExtractedCatalogueRecord } from "./types";
import { inferPeriod, inferVisualSystem } from "./ghana-relevance";
import { CATALOGUE_BUILD_ID } from "../types";

export function buildSourceFacts(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

export function buildAredInterpretation(objectType: string, culture: string): string {
  const t = objectType.toLowerCase();
  if (/gold\s*weight|goldweight/.test(t)) {
    return `ARED research note: Akan goldweights form part of a wider visual language connecting measurement, trade, proverb and authority. This interpretation is ARED analysis supported by the cited museum record and scholarship on Akan material culture — not a direct quotation from the source institution.`;
  }
  if (/textile|cloth|kente|adinkra|wrapper/.test(t)) {
    return `ARED research note: Woven and stamped textiles in Ghana operate as systems of pattern, identity and social communication. This interpretation is ARED analysis based on the object record and textile scholarship — not a direct museum quotation.`;
  }
  if (/asafo|flag/.test(t)) {
    return `ARED research note: Fante Asafo flags communicate proverb, company identity and public memory through cloth, appliqué and performance. Community authority may govern interpretation beyond museum metadata. This is ARED analysis, not a direct quotation from the source.`;
  }
  if (/poster|sign|cinema|music|record|magazine|newspaper|print|cartoon|photograph|advertisement|calendar/.test(t)) {
    return `ARED research note: Popular graphics, photography and advertising in Ghana form part of the country's visual communication history. This interpretation is ARED analysis based on the object record — not a direct museum quotation.`;
  }
  return `ARED research note: This record forms part of Ghana's history of graphic design and visual communication. The interpretation below is ARED analysis supported by the cited source — not presented as direct institutional quotation.`;
}

export function assignRecordId(prefix: string, index: number): string {
  return `ARED-GH-${prefix}-${String(index).padStart(5, "0")}`;
}

export function finalizeRecord(
  partial: Omit<ExtractedCatalogueRecord, "build_id"> & { build_id?: string },
): ExtractedCatalogueRecord {
  return { ...partial, build_id: partial.build_id ?? CATALOGUE_BUILD_ID };
}

export function periodFromDates(dateStart: string, dateEnd: string) {
  return inferPeriod(dateStart, dateEnd);
}

export function visualSystemFromText(text: string) {
  return inferVisualSystem(text);
}
