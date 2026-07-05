/**
 * Bridge between legacy Ghana collection categories and the ARED master taxonomy.
 * Infers historical periods, visual systems and regions from item metadata.
 */

import type { ArchiveItemCategory, GhanaArchiveItem } from "./ghana-collection";
import {
  HISTORICAL_PERIODS,
  HISTORICAL_PERIOD_LABELS,
  VISUAL_SYSTEM_LABELS,
  REGIONAL_STRAND_LABELS,
  type HistoricalPeriodSlug,
  type RegionalStrandSlug,
  type VisualSystemSlug,
} from "./ared-master-taxonomy";

export type EnrichedGhanaItem = GhanaArchiveItem & {
  historical_periods: HistoricalPeriodSlug[];
  visual_system: VisualSystemSlug;
  visual_system_concept: string;
  region: RegionalStrandSlug;
};

/** Legacy category → visual system spine */
export const CATEGORY_TAXONOMY_MAP: Record<
  ArchiveItemCategory,
  { visual_system: VisualSystemSlug; visual_system_concept: string }
> = {
  "early-print": {
    visual_system: "print-colonial-public-culture",
    visual_system_concept: "mission-printing",
  },
  independence: {
    visual_system: "independence-state-visual-identity",
    visual_system_concept: "flags-emblems-currency-monuments",
  },
  newspapers: {
    visual_system: "print-colonial-public-culture",
    visual_system_concept: "newspapers-editorial-cartoons",
  },
  political: {
    visual_system: "independence-state-visual-identity",
    visual_system_concept: "cpp-pan-african-graphics",
  },
  "cinema-posters": {
    visual_system: "popular-everyday-graphics",
    visual_system_concept: "cinema-posters",
  },
  "street-signage": {
    visual_system: "popular-everyday-graphics",
    visual_system_concept: "sign-painting",
  },
  music: {
    visual_system: "popular-everyday-graphics",
    visual_system_concept: "music-covers",
  },
  religious: {
    visual_system: "popular-everyday-graphics",
    visual_system_concept: "church-mosque-funeral-graphics",
  },
  textile: {
    visual_system: "cloth-pattern-social-identity",
    visual_system_concept: "adinkra-cloth",
  },
  institutional: {
    visual_system: "digital-diasporic-contemporary",
    visual_system_concept: "branding-advertising",
  },
  digital: {
    visual_system: "digital-diasporic-contemporary",
    visual_system_concept: "social-media-flyers",
  },
};

/** Tag-based refinement for textile and other ambiguous categories */
const TAG_CONCEPT_OVERRIDES: { tags: string[]; concept: string; system?: VisualSystemSlug }[] = [
  { tags: ["asafo", "frankaa", "fante flag"], concept: "asafo-flags", system: "memory-proverb-performance" },
  { tags: ["adinkra"], concept: "adinkra-system", system: "land-cosmology-authority" },
  { tags: ["goldweight", "gold weight", "brass weight"], concept: "goldweights", system: "land-cosmology-authority" },
  { tags: ["kente", "Asante kente"], concept: "asante-kente" },
  { tags: ["Ewe kente", "ewe weave"], concept: "ewe-kente" },
  { tags: ["smock", "fugu"], concept: "smocks-woven-systems" },
  { tags: ["wax print", "GTP", "commemorative cloth"], concept: "commemorative-political-cloth" },
  { tags: ["funeral"], concept: "funerary-graphics", system: "memory-proverb-performance" },
  { tags: ["map", "postcard", "photograph"], concept: "colonial-maps-photography", system: "print-colonial-public-culture" },
  { tags: ["stamp", "banknote", "currency", "coat of arms", "flag"], concept: "flags-emblems-currency-monuments", system: "independence-state-visual-identity" },
  { tags: ["Okoh"], concept: "theodosia-okoh", system: "independence-state-visual-identity" },
  { tags: ["Kotei", "coat of arms"], concept: "amon-kotei", system: "independence-state-visual-identity" },
  { tags: ["Antubam"], concept: "kofi-antubam", system: "independence-state-visual-identity" },
];

const CITY_REGION_MAP: Record<string, RegionalStrandSlug> = {
  Accra: "ga-dangme",
  Tema: "ga-dangme",
  Kumasi: "akan-central",
  "Cape Coast": "akan-central",
  Takoradi: "nzema-ahanta-western-coast",
  Tamale: "northern-ghana",
  Bolgatanga: "kassena",
  Ho: "ewe",
};

export function dateToYear(item: GhanaArchiveItem): number {
  if (item.date) {
    const y = parseInt(item.date.slice(0, 4));
    if (!isNaN(y)) return y;
  }
  const m = item.date_display.match(/\d{4}/);
  return m ? parseInt(m[0]) : 2000;
}

/** Assign all historical periods whose indicative range includes the item year */
export function inferHistoricalPeriods(item: GhanaArchiveItem): HistoricalPeriodSlug[] {
  const year = dateToYear(item);
  const periods: HistoricalPeriodSlug[] = [];

  for (const period of HISTORICAL_PERIODS) {
    const afterStart = period.startYear === undefined || year >= period.startYear;
    const beforeEnd = period.endYear === undefined || year <= period.endYear;
    if (afterStart && beforeEnd) {
      periods.push(period.slug);
    }
  }

  // Undated pre-colonial material (textile, regalia tags)
  if (periods.length === 0 || (year < 1900 && item.category === "textile")) {
    if (!periods.includes("visual-systems-before-colonial")) {
      periods.unshift("visual-systems-before-colonial");
    }
  }

  return periods.length > 0 ? periods : ["democratic-digital-diasporic"];
}

export function inferVisualSystemConcept(
  item: GhanaArchiveItem,
): { visual_system: VisualSystemSlug; visual_system_concept: string } {
  const tagBlob = [...item.tags, item.title, item.description]
    .join(" ")
    .toLowerCase();

  for (const override of TAG_CONCEPT_OVERRIDES) {
    if (override.tags.some((t) => tagBlob.includes(t.toLowerCase()))) {
      const base = CATEGORY_TAXONOMY_MAP[item.category];
      return {
        visual_system: override.system ?? base.visual_system,
        visual_system_concept: override.concept,
      };
    }
  }

  return CATEGORY_TAXONOMY_MAP[item.category];
}

export function inferRegion(item: GhanaArchiveItem): RegionalStrandSlug {
  if (item.city && CITY_REGION_MAP[item.city]) {
    return CITY_REGION_MAP[item.city];
  }

  const tagBlob = item.tags.join(" ").toLowerCase();
  if (tagBlob.includes("ewe")) return "ewe";
  if (tagBlob.includes("asafo") || tagBlob.includes("fante")) return "akan-central";
  if (tagBlob.includes("northern") || tagBlob.includes("sirigu")) return "northern-ghana";
  if (tagBlob.includes("ga ") || tagBlob.includes("homowo")) return "ga-dangme";

  if (
    item.category === "independence" ||
    item.category === "political" ||
    item.category === "newspapers" ||
    item.category === "institutional"
  ) {
    return "multi-regional";
  }

  return "akan-central";
}

export function enrichGhanaItem(item: GhanaArchiveItem): EnrichedGhanaItem {
  const { visual_system, visual_system_concept } = inferVisualSystemConcept(item);
  return {
    ...item,
    historical_periods: inferHistoricalPeriods(item),
    visual_system,
    visual_system_concept,
    region: inferRegion(item),
  };
}

export function enrichAllGhanaItems(items: GhanaArchiveItem[]): EnrichedGhanaItem[] {
  return items.map(enrichGhanaItem);
}

export function itemMatchesPeriod(
  item: EnrichedGhanaItem,
  period: HistoricalPeriodSlug,
): boolean {
  return item.historical_periods.includes(period);
}

export function itemMatchesVisualSystem(
  item: EnrichedGhanaItem,
  system: VisualSystemSlug,
): boolean {
  return item.visual_system === system;
}

export function formatPeriodLabels(periods: HistoricalPeriodSlug[]): string {
  return periods.map((p) => HISTORICAL_PERIOD_LABELS[p]).join(" · ");
}

export { HISTORICAL_PERIODS, HISTORICAL_PERIOD_LABELS, VISUAL_SYSTEM_LABELS, REGIONAL_STRAND_LABELS };
