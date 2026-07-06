/**
 * Generates bulk research catalogue rows toward the 2,850-record target.
 */

import {
  COLLECTION_TARGETS,
  type HistoricalPeriodSlug,
  type IngestionRoute,
  type ObjectType,
  type PersonRole,
  type RegionalStrandSlug,
  type ResearchCatalogueRecord,
  type ResearchStatus,
  type RightsStatus,
  type VerificationLevel,
  type VisualSystemSlug,
} from "./ared-master-taxonomy";

type CollectionTemplate = {
  collectionField: string;
  concept: string;
  visualSystem: VisualSystemSlug;
  objectType: ObjectType;
  titleTemplates: string[];
  regions: RegionalStrandSlug[];
  periods: HistoricalPeriodSlug[];
  sources: string[];
  personRoles: (PersonRole | null)[];
  rightsStatus: RightsStatus;
  ingestionRoute: IngestionRoute;
  priority: "critical" | "high" | "medium" | "low";
};

const COLLECTION_TEMPLATES: CollectionTemplate[] = [
  {
    collectionField: "asafo-flags",
    concept: "asafo-flags",
    visualSystem: "memory-proverb-performance",
    objectType: "Asafo flag",
    titleTemplates: [
      "Asafo company flag — {town} No. {n}",
      "Frankaa — proverbial imagery, {town}",
      "Asafo flag with {canton} canton — {town}",
      "Processional Asafo flag — {town} company",
      "Asafo flag repair record — {town}",
    ],
    regions: ["akan-central"],
    periods: ["colonial-print-institutional", "post-independence-popular"],
    sources: ["fowler-rom", "asafo-companies", "local-artists-workshops"],
    personRoles: ["Asafo flag maker", "Commissioner", null],
    rightsStatus: "metadata_only",
    ingestionRoute: "metadata_record",
    priority: "high",
  },
  {
    collectionField: "adinkra-system",
    concept: "adinkra-system",
    visualSystem: "land-cosmology-authority",
    objectType: "Adinkra symbol record",
    titleTemplates: [
      "Adinkra symbol — {symbol} (multiple interpretations)",
      "Adinkra stamp — carved motif, Ntonso workshop",
      "Adinkra cloth — funerary use, {region}",
      "Adinkra cloth — prestige wearing context",
      "Adinkra corporate reuse — {symbol}",
    ],
    regions: ["akan-central"],
    periods: ["visual-systems-before-colonial", "coastal-contact-transcultural"],
    sources: ["metropolitan-museum", "british-museum", "local-artists-workshops"],
    personRoles: ["Maker / craftsperson", null],
    rightsStatus: "metadata_only",
    ingestionRoute: "metadata_record",
    priority: "high",
  },
  {
    collectionField: "goldweights",
    concept: "goldweights",
    visualSystem: "land-cosmology-authority",
    objectType: "Goldweight",
    titleTemplates: [
      "Akan goldweight — geometric form",
      "Akan goldweight — figurative proverbial scene",
      "Goldweight — stool form",
      "Goldweight — shield form",
      "Goldweight — animal motif with proverb",
    ],
    regions: ["akan-central"],
    periods: ["coastal-contact-transcultural", "colonial-print-institutional"],
    sources: ["british-museum", "ghana-museums-monuments"],
    personRoles: ["Goldweight caster", null],
    rightsStatus: "metadata_only",
    ingestionRoute: "metadata_record",
    priority: "high",
  },
  {
    collectionField: "cloth-pattern-social-identity",
    concept: "asante-kente",
    visualSystem: "cloth-pattern-social-identity",
    objectType: "Kente cloth",
    titleTemplates: [
      "Asante kente — named cloth {n}",
      "Ewe kente — named cloth, Volta Region",
      "Kente — weaving centre record",
      "Commemorative cloth — political event",
      "Wax print (GTP) — commemorative design",
    ],
    regions: ["akan-central", "ewe", "multi-regional"],
    periods: ["visual-systems-before-colonial", "post-independence-popular"],
    sources: ["ghana-museums-monuments", "metropolitan-museum"],
    personRoles: ["Weaver", null],
    rightsStatus: "metadata_only",
    ingestionRoute: "metadata_record",
    priority: "medium",
  },
  {
    collectionField: "newspapers-editorial-cartoons",
    concept: "newspapers-editorial-cartoons",
    visualSystem: "print-colonial-public-culture",
    objectType: "Newspaper / periodical",
    titleTemplates: [
      "Daily Graphic — masthead variant {n}",
      "Ghanaian Times — front page {year}",
      "Gold Coast newspaper — editorial cartoon",
      "Colonial gazette — typographic layout",
      "Regional periodical — masthead and illustration",
    ],
    regions: ["multi-regional"],
    periods: ["colonial-print-institutional", "anticolonial-independence", "democratic-digital-diasporic"],
    sources: ["graphic-communications-group", "ghana-library-authority", "national-archives-ghana"],
    personRoles: ["Printer", "Illustrator", null],
    rightsStatus: "permission_required",
    ingestionRoute: "metadata_record",
    priority: "high",
  },
  {
    collectionField: "independence-state-visual-identity",
    concept: "flags-emblems-currency-monuments",
    visualSystem: "independence-state-visual-identity",
    objectType: "Flag / emblem",
    titleTemplates: [
      "Independence commemorative stamp — {year}",
      "CPP campaign poster — {year}",
      "Bank of Ghana currency — design variant",
      "State emblem usage — institutional context",
      "Pan-African congress graphic material",
    ],
    regions: ["multi-regional"],
    periods: ["anticolonial-independence", "post-independence-popular"],
    sources: ["national-archives-ghana", "bank-of-ghana", "ghana-post", "family-archives"],
    personRoles: ["Designer", "Printer", null],
    rightsStatus: "metadata_only",
    ingestionRoute: "metadata_record",
    priority: "high",
  },
  {
    collectionField: "music-covers",
    concept: "music-covers",
    visualSystem: "popular-everyday-graphics",
    objectType: "Music album cover",
    titleTemplates: [
      "Highlife LP sleeve — {year}",
      "Gospel cassette cover",
      "Hiplife album artwork",
      "Concert poster — highlife event",
      "Record label identity — local Ghanaian label",
    ],
    regions: ["multi-regional", "ga-dangme"],
    periods: ["anticolonial-independence", "post-independence-popular", "democratic-digital-diasporic"],
    sources: ["local-artists-workshops", "family-archives", "markets-churches-printers"],
    personRoles: ["Designer", "Photographer", "Musician"],
    rightsStatus: "metadata_only",
    ingestionRoute: "field_research",
    priority: "medium",
  },
  {
    collectionField: "sign-painting",
    concept: "sign-painting",
    visualSystem: "popular-everyday-graphics",
    objectType: "Sign painting",
    titleTemplates: [
      "Barber shop sign — {city}",
      "Chop bar sign — hand-painted, {city}",
      "Mechanic workshop sign — {city}",
      "Pharmacy sign — public lettering",
      "Trotro inscription — vehicle lettering",
    ],
    regions: ["ga-dangme", "akan-central", "multi-regional"],
    periods: ["post-independence-popular", "democratic-digital-diasporic"],
    sources: ["markets-churches-printers", "local-artists-workshops"],
    personRoles: ["Sign writer", null],
    rightsStatus: "permission_required",
    ingestionRoute: "field_research",
    priority: "high",
  },
  {
    collectionField: "funerary-graphics",
    concept: "funerary-graphics",
    visualSystem: "memory-proverb-performance",
    objectType: "Funeral graphic",
    titleTemplates: [
      "Funeral poster — vinyl print, {city}",
      "Funeral banner — church or family commission",
      "Funeral programme — typographic layout",
      "Funeral cloth — commemorative design",
      "Digital funeral announcement — social media",
    ],
    regions: ["multi-regional", "ga-dangme", "akan-central"],
    periods: ["post-independence-popular", "democratic-digital-diasporic"],
    sources: ["markets-churches-printers", "local-artists-workshops"],
    personRoles: ["Sign writer", "Designer", null],
    rightsStatus: "permission_required",
    ingestionRoute: "field_research",
    priority: "medium",
  },
  {
    collectionField: "digital-diasporic-contemporary",
    concept: "social-media-flyers",
    visualSystem: "digital-diasporic-contemporary",
    objectType: "Digital graphic / social media",
    titleTemplates: [
      "Social media event flyer — {city}",
      "Brand identity — Ghanaian startup",
      "Political meme graphic — election cycle",
      "Broadcast motion graphic — Ghanaian TV",
      "Diasporic design — Ghanaian designer abroad",
    ],
    regions: ["multi-regional", "diaspora"],
    periods: ["democratic-digital-diasporic"],
    sources: ["local-artists-workshops"],
    personRoles: ["Designer", null],
    rightsStatus: "permission_required",
    ingestionRoute: "field_research",
    priority: "medium",
  },
  {
    collectionField: "oral-interpretation",
    concept: "oral-interpretation",
    visualSystem: "memory-proverb-performance",
    objectType: "Oral history record",
    titleTemplates: [
      "Oral history — Asafo flag interpretation",
      "Oral history — sign writer workshop, {city}",
      "Oral history — Adinkra maker, Ntonso",
      "Maker profile — weaver, kente tradition",
      "Maker profile — printer, Accra press district",
    ],
    regions: ["akan-central", "ga-dangme", "ewe", "northern-ghana"],
    periods: ["visual-systems-before-colonial", "democratic-digital-diasporic"],
    sources: ["local-artists-workshops", "asafo-companies"],
    personRoles: ["Maker / craftsperson", "Community authority", null],
    rightsStatus: "permission_required",
    ingestionRoute: "field_research",
    priority: "high",
  },
];

const TOWNS = ["Anomabo", "Saltpond", "Mankessim", "Elmina", "Winneba", "Dunkwa", "Abandze"];
const CITIES = ["Accra", "Kumasi", "Cape Coast", "Takoradi", "Tamale", "Ho", "Tema"];
const SYMBOLS = ["Sankofa", "Gye Nyame", "Dwennimmen", "Akoma", "Funtunfunefu", "Epa", "Nsoromma"];
const CANTONS = ["British Union Jack", "Ghana national", "Company-specific"];

function fillTemplate(template: string, index: number): string {
  return template
    .replace("{n}", String((index % 99) + 1))
    .replace("{town}", TOWNS[index % TOWNS.length])
    .replace("{city}", CITIES[index % CITIES.length])
    .replace("{region}", "Central Region")
    .replace("{symbol}", SYMBOLS[index % SYMBOLS.length])
    .replace("{canton}", CANTONS[index % CANTONS.length])
    .replace("{year}", String(1950 + (index % 74)));
}

let recordCounter = 100;

function nextRecordId(prefix: string): string {
  recordCounter += 1;
  return `rc-${prefix}-${String(recordCounter).padStart(4, "0")}`;
}

export function generateBulkResearchRecords(
  existingIds: Set<string> = new Set(),
): ResearchCatalogueRecord[] {
  const records: ResearchCatalogueRecord[] = [];

  for (const target of COLLECTION_TARGETS) {
    const template =
      COLLECTION_TEMPLATES.find((t) => t.collectionField === target.slug) ??
      COLLECTION_TEMPLATES.find((t) => t.collectionField === target.visualSystem);

    if (!template) continue;

    const prefix = target.slug.slice(0, 4);
    const count = target.initialTarget;

    for (let i = 0; i < count; i++) {
      const recordId = nextRecordId(prefix);
      if (existingIds.has(recordId)) continue;

      const title = fillTemplate(template.titleTemplates[i % template.titleTemplates.length], i);
      const researchStatus: ResearchStatus =
        i < count * 0.05 ? "literature_review" : i < count * 0.1 ? "museum_metadata" : "not_started";
      const verification: VerificationLevel =
        researchStatus === "museum_metadata" ? "provisional" : "unverified";

      records.push({
        record_id: recordId,
        archive_item_id: null,
        title,
        historical_periods: [template.periods[i % template.periods.length]],
        region: template.regions[i % template.regions.length],
        locality: template.regions[i % template.regions.length] === "multi-regional" ? null : CITIES[i % CITIES.length],
        visual_system: template.visualSystem,
        visual_system_concept: template.concept,
        object_type: template.objectType,
        person: null,
        person_role: template.personRoles[i % template.personRoles.length],
        date_display: null,
        source_institution: template.sources[i % template.sources.length],
        source_reference: `Research queue ${i + 1}/${count} — ${target.field}`,
        rights_status: template.rightsStatus,
        ingestion_route: template.ingestionRoute,
        research_status: researchStatus,
        verification_level: verification,
        researcher: null,
        research_notes: `Bulk research row for ${target.field}. Replace with specific object once identified.`,
        community_notes:
          template.ingestionRoute === "field_research"
            ? "Community consent required before publication."
            : null,
        colonial_acquisition_note:
          template.sources.includes("british-museum") || template.sources.includes("metropolitan-museum")
            ? "Record colonial acquisition history when source confirmed."
            : null,
        collection_field: target.slug,
        priority: i < 10 ? "critical" : template.priority,
      });
    }
  }

  return records;
}

export function mergeResearchCatalogue(
  seedRecords: ResearchCatalogueRecord[],
): ResearchCatalogueRecord[] {
  const seedIds = new Set(seedRecords.map((r) => r.record_id));
  const bulk = generateBulkResearchRecords(seedIds);
  return [...seedRecords, ...bulk];
}

export function getResearchCatalogueStats(records: ResearchCatalogueRecord[]) {
  const byField: Record<string, number> = {};
  for (const r of records) {
    const key = r.collection_field ?? "unassigned";
    byField[key] = (byField[key] ?? 0) + 1;
  }
  return { total: records.length, byField };
}
