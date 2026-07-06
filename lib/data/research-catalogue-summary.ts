/**
 * Summary stats for the research catalogue UI.
 * Full rows live in data/catalogue/research-catalogue.csv — regenerate via
 * `npx tsx scripts/export-ared-catalogue.ts`
 */

import {
  COLLECTION_TARGETS,
  TOTAL_CATALOGUE_TARGET,
  HISTORICAL_PERIODS,
  VISUAL_SYSTEM_SPINE,
} from "./ared-master-taxonomy";
import { GHANA_COLLECTION_ITEMS } from "./ghana-collection";

export const CATALOGUE_BUILD_STAMP = "2026-07-05-taxonomy-v1";

export type ResearchFieldProgress = {
  slug: string;
  label: string;
  target: number;
  published: number;
};

export function getResearchFieldProgress(): ResearchFieldProgress[] {
  return COLLECTION_TARGETS.map((target) => ({
    slug: target.slug,
    label: target.field,
    target: target.initialTarget,
    published: 0, // populated when archive items carry collection_field metadata
  }));
}

export const RESEARCH_CATALOGUE_SUMMARY = {
  buildStamp: CATALOGUE_BUILD_STAMP,
  publishedItems: GHANA_COLLECTION_ITEMS.length,
  researchTarget: TOTAL_CATALOGUE_TARGET,
  historicalPeriodCount: HISTORICAL_PERIODS.length,
  visualSystemCount: VISUAL_SYSTEM_SPINE.length,
  fields: getResearchFieldProgress(),
  csvPath: "data/catalogue/research-catalogue.csv",
  taxonomyPath: "data/catalogue/master-taxonomy.csv",
} as const;
