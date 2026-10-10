import { cache } from "react";
import {
  COMMUNITY_GROUPS,
  KNOWLEDGE_AREAS,
  LANGUAGES,
  RECORD_TYPES,
  REGIONS,
  type ArchiveRecord,
} from "@/lib/archive-metadata";
import { getPublicArchiveRecords } from "@/lib/kgo/records";
import { slugifyEntity } from "@/lib/kgo/site";

export type ProgrammaticFilters = {
  knowledge?: string[];
  country?: string[];
  region?: string[];
  language?: string[];
  community?: string[];
  recordType?: string[];
  tags?: string[];
};

export type ProgrammaticHub = {
  slug: string;
  title: string;
  description: string;
  filters: ProgrammaticFilters;
  recordIds: string[];
};

export type ProgrammaticHubSummary = Omit<ProgrammaticHub, "recordIds">;

type ProgrammaticHubDefinition = ProgrammaticHubSummary & {
  matchRecord?: (record: ArchiveRecord) => boolean;
};

/** Seed countries for programmatic SEO even before catalogue coverage is dense. */
export const PROGRAMMATIC_COUNTRIES = [
  "Ghana",
  "Nigeria",
  "Kenya",
  "South Africa",
  "Egypt",
  "Ethiopia",
  "Senegal",
  "Mali",
  "Morocco",
  "Tunisia",
  "Algeria",
  "Uganda",
  "Tanzania",
  "Zimbabwe",
  "Botswana",
  "Namibia",
  "Mozambique",
  "Cameroon",
  "Cote dIvoire",
  "Benin",
  "Togo",
  "Burkina Faso",
  "Rwanda",
  "Sudan",
  "Somalia",
  "Libya",
  "Democratic Republic of the Congo",
  "Australia",
  "Canada",
  "Mexico",
  "Peru",
  "Brazil",
  "United States",
  "United Kingdom",
  "France",
  "India",
  "Jamaica",
  "Trinidad and Tobago",
  "Haiti",
  "Chile",
  "Colombia",
  "Argentina",
  "New Zealand",
  "Indonesia",
  "Philippines",
  "China",
  "Japan",
  "Germany",
  "Spain",
  "Portugal",
  "Italy",
  "Netherlands",
  "Belgium",
  "Sweden",
] as const;

const THEME_BRIDGES: Array<{ label: string; matchers: string[] }> = [
  { label: "Climate", matchers: ["climate", "environment", "ecology", "environmental"] },
  { label: "Architecture", matchers: ["architecture", "built", "space"] },
  { label: "Agriculture", matchers: ["agriculture", "food", "farming"] },
  { label: "Astronomy", matchers: ["astronomy", "sky", "star", "cosmos"] },
  { label: "Healing", matchers: ["healing", "medicine", "health", "spiritual"] },
  { label: "Mathematics", matchers: ["mathematics", "math", "geometry", "number"] },
  { label: "Navigation", matchers: ["navigation", "wayfinding", "maritime", "ocean"] },
  { label: "Ecology", matchers: ["ecology", "environment", "species", "land"] },
  { label: "Food", matchers: ["food", "cuisine", "agriculture"] },
  { label: "Ceremony", matchers: ["ceremony", "ritual", "spiritual", "practice"] },
  { label: "Music", matchers: ["music", "performance", "sonic", "sound"] },
  { label: "Graphic Design", matchers: ["graphic", "design", "visual", "poster", "typography"] },
  { label: "Law", matchers: ["law", "rights", "governance", "justice"] },
  { label: "Education", matchers: ["education", "pedagogy", "teaching", "school"] },
  { label: "Gender", matchers: ["gender", "feminist", "women", "masculinity"] },
  { label: "Technology", matchers: ["technology", "digital", "media", "innovation"] },
];

function includesAny(haystack: string[], needles: string[]): boolean {
  const lowered = haystack.map((value) => value.toLowerCase());
  return needles.some((needle) => lowered.some((value) => value.includes(needle)));
}

function recordMatches(record: ArchiveRecord, filters: ProgrammaticFilters): boolean {
  const checks: Array<[string[] | undefined, string[] | undefined]> = [
    [filters.knowledge, record.knowledgeAreas],
    [filters.country, record.country],
    [filters.region, record.region],
    [filters.language, record.language],
    [filters.community, record.communityOrCulturalGroup],
    [filters.recordType, record.recordType || (record.type ? [record.type] : [])],
    [filters.tags, [...(record.tags || []), ...(record.keywords || [])]],
  ];

  return checks.every(([required, actual]) => {
    if (!required?.length) return true;
    const actualValues = (actual || []).map((value) => value.toLowerCase());
    return required.some((value) => {
      const needle = value.toLowerCase();
      return actualValues.some((hay) => hay === needle || hay.includes(needle));
    });
  });
}

function uniquePlaces(records: ArchiveRecord[], key: "country" | "region"): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  records.forEach((record) => {
    (record[key] || []).forEach((value) => {
      const label = String(value || "").trim();
      const slug = slugifyEntity(label);
      if (!label || !slug || seen.has(slug)) return;
      seen.add(slug);
      out.push(label);
    });
  });
  return out.sort((a, b) => a.localeCompare(b));
}

function addHub(map: Map<string, ProgrammaticHubDefinition>, hub: ProgrammaticHubDefinition) {
  if (map.has(hub.slug)) return;
  map.set(hub.slug, hub);
}

function hubMatches(definition: ProgrammaticHubDefinition, record: ArchiveRecord): boolean {
  return definition.matchRecord ? definition.matchRecord(record) : recordMatches(record, definition.filters);
}

function materializeHub(definition: ProgrammaticHubDefinition, records: ArchiveRecord[]): ProgrammaticHub {
  const matched = records.filter((record) => hubMatches(definition, record));
  return {
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    filters: definition.filters,
    recordIds: matched.map((record) => record.id),
  };
}

function toHubSummary(definition: ProgrammaticHubDefinition): ProgrammaticHubSummary {
  return {
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    filters: definition.filters,
  };
}

let programmaticHubDefinitionsPromise: Promise<ProgrammaticHubDefinition[]> | null = null;
let programmaticHubsPromise: Promise<ProgrammaticHub[]> | null = null;

function rememberPromise<T>(promise: Promise<T>, reset: () => void): Promise<T> {
  return promise.catch((error) => {
    reset();
    throw error;
  });
}

async function buildProgrammaticHubDefinitionsUncached(): Promise<ProgrammaticHubDefinition[]> {
  const records = await getPublicArchiveRecords();
  const hubs = new Map<string, ProgrammaticHubDefinition>();
  const countries = Array.from(
    new Set([...PROGRAMMATIC_COUNTRIES, ...uniquePlaces(records, "country")]),
  ).sort((a, b) => a.localeCompare(b));
  const regions = Array.from(new Set([...REGIONS, ...uniquePlaces(records, "region")]));
  const communities = COMMUNITY_GROUPS.filter((label) => !label.startsWith("Unknown") && !label.startsWith("Multiple"));
  const languages = LANGUAGES.filter((label) => !["Unknown", "Multiple Languages", "Other African Language"].includes(label));

  countries.forEach((country) => {
    addHub(
      hubs,
      {
        slug: `knowledge-systems-in-${slugifyEntity(country)}`,
        title: `Knowledge Systems in ${country}`,
        description: `Index of ARED knowledge objects, communities and cultural materials associated with ${country}.`,
        filters: { country: [country] },
      },
    );
    addHub(
      hubs,
      {
        slug: `museums-and-archives-in-${slugifyEntity(country)}`,
        title: `Museums and Archives in ${country}`,
        description: `Holding institutions, archives and museum-linked records associated with ${country}.`,
        filters: { country: [country], tags: ["museum", "archive", "library", "gallery"] },
      },
    );
    addHub(
      hubs,
      {
        slug: `unesco-and-heritage-records-in-${slugifyEntity(country)}`,
        title: `UNESCO and Heritage Records in ${country}`,
        description: `Heritage and culturally significant records linked to ${country}.`,
        filters: { country: [country], tags: ["unesco", "heritage", "world heritage", "intangible"] },
      },
    );
    addHub(
      hubs,
      {
        slug: `oral-histories-in-${slugifyEntity(country)}`,
        title: `Oral Histories in ${country}`,
        description: `Oral history and performance records associated with ${country}.`,
        filters: { country: [country], recordType: ["Oral History", "Performance / Sonic Record"] },
      },
    );
    addHub(
      hubs,
      {
        slug: `indigenous-languages-of-${slugifyEntity(country)}`,
        title: `Indigenous Languages of ${country}`,
        description: `Language-linked records and multilingual materials associated with ${country}.`,
        filters: { country: [country] },
      },
    );
  });

  regions.forEach((region) => {
    addHub(
      hubs,
      {
        slug: `knowledge-systems-in-${slugifyEntity(region)}`,
        title: `Knowledge Systems in ${region}`,
        description: `ARED records documenting knowledge systems across ${region}.`,
        filters: { region: [region] },
      },
    );
    addHub(
      hubs,
      {
        slug: `indigenous-languages-of-${slugifyEntity(region)}`,
        title: `Indigenous Languages of ${region}`,
        description: `Language-linked records associated with ${region}.`,
        filters: { region: [region] },
      },
    );
    addHub(
      hubs,
      {
        slug: `oral-histories-in-${slugifyEntity(region)}`,
        title: `Oral Histories in ${region}`,
        description: `Oral history and tradition records connected to ${region}.`,
        filters: { region: [region], recordType: ["Oral History", "Performance / Sonic Record"] },
      },
    );
  });

  KNOWLEDGE_AREAS.forEach((area) => {
    regions.forEach((region) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(area)}-in-${slugifyEntity(region)}`,
          title: `${area} in ${region}`,
          description: `Records and entities classified under ${area} and situated in ${region}.`,
          filters: { knowledge: [area], region: [region] },
        },
      );
    });
    countries.forEach((country) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(area)}-in-${slugifyEntity(country)}`,
          title: `${area} in ${country}`,
          description: `Records and entities classified under ${area} and associated with ${country}.`,
          filters: { knowledge: [area], country: [country] },
        },
      );
    });
    communities.forEach((community) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(area)}-and-${slugifyEntity(community)}`,
          title: `${area} and ${community}`,
          description: `Intersections between ${area} and ${community} knowledge holding.`,
          filters: { knowledge: [area], community: [community] },
        },
      );
    });
  });

  communities.forEach((community) => {
    countries.forEach((country) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(community)}-in-${slugifyEntity(country)}`,
          title: `${community} in ${country}`,
          description: `Community-linked records connecting ${community} and ${country}.`,
          filters: { community: [community], country: [country] },
        },
      );
    });
    regions.forEach((region) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(community)}-in-${slugifyEntity(region)}`,
          title: `${community} in ${region}`,
          description: `Community-linked records connecting ${community} and ${region}.`,
          filters: { community: [community], region: [region] },
        },
      );
    });
  });

  languages.forEach((language) => {
    regions.forEach((region) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(language)}-language-in-${slugifyEntity(region)}`,
          title: `${language} Language in ${region}`,
          description: `Language-linked materials for ${language} across ${region}.`,
          filters: { language: [language], region: [region] },
        },
      );
    });
    countries.forEach((country) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(language)}-language-in-${slugifyEntity(country)}`,
          title: `${language} Language in ${country}`,
          description: `Language-linked materials for ${language} associated with ${country}.`,
          filters: { language: [language], country: [country] },
        },
      );
    });
  });

  RECORD_TYPES.forEach((recordType) => {
    regions.forEach((region) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(recordType)}-in-${slugifyEntity(region)}`,
          title: `${recordType} in ${region}`,
          description: `${recordType} records situated in ${region}.`,
          filters: { recordType: [recordType], region: [region] },
        },
      );
    });
    countries.slice(0, 40).forEach((country) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(recordType)}-in-${slugifyEntity(country)}`,
          title: `${recordType} in ${country}`,
          description: `${recordType} records associated with ${country}.`,
          filters: { recordType: [recordType], country: [country] },
        },
      );
    });
  });

  THEME_BRIDGES.forEach((theme) => {
    addHub(hubs, {
      slug: `knowledge-systems-connected-to-${slugifyEntity(theme.label)}`,
      title: `Knowledge Systems connected to ${theme.label}`,
      description: `Cross-linked ARED records where knowledge systems intersect with ${theme.label.toLowerCase()}.`,
      filters: { tags: theme.matchers },
      matchRecord: (record) => {
        const bag = [
          ...(record.knowledgeAreas || []),
          ...(record.tags || []),
          ...(record.keywords || []),
          record.title || "",
          record.summary || "",
        ];
        return includesAny(bag, theme.matchers);
      },
    });

    regions.forEach((region) => {
      addHub(
        hubs,
        {
          slug: `${slugifyEntity(theme.label)}-and-knowledge-systems-in-${slugifyEntity(region)}`,
          title: `${theme.label} and Knowledge Systems in ${region}`,
          description: `Intersections of ${theme.label.toLowerCase()} and knowledge systems across ${region}.`,
          filters: { region: [region], tags: theme.matchers },
        },
      );
    });
  });

  addHub(
    hubs,
    {
      slug: "community-controlled-archives",
      title: "Community-controlled Archives",
      description:
        "Records and sources that emphasise community stewardship, local knowledge holding and culturally governed access.",
      filters: { knowledge: ["Indigenous Knowledge Systems"] },
    },
  );
  addHub(
    hubs,
    {
      slug: "african-textile-archives",
      title: "African Textile Archives",
      description: "Textile knowledge, cloth systems and related archival materials across Africa and the diaspora.",
      filters: { knowledge: ["Textile Knowledge", "Material Culture"] },
    },
  );

  return Array.from(hubs.values()).sort((a, b) => a.title.localeCompare(b.title));
}

const getProgrammaticHubDefinitions = cache(async (): Promise<ProgrammaticHubDefinition[]> => {
  if (!programmaticHubDefinitionsPromise) {
    programmaticHubDefinitionsPromise = rememberPromise(buildProgrammaticHubDefinitionsUncached(), () => {
      programmaticHubDefinitionsPromise = null;
    });
  }
  return programmaticHubDefinitionsPromise;
});

const getProgrammaticHubDefinitionIndex = cache(async (): Promise<Map<string, ProgrammaticHubDefinition>> => {
  const definitions = await getProgrammaticHubDefinitions();
  return new Map(definitions.map((definition) => [definition.slug, definition]));
});

async function buildProgrammaticHubsUncached(): Promise<ProgrammaticHub[]> {
  const [definitions, records] = await Promise.all([getProgrammaticHubDefinitions(), getPublicArchiveRecords()]);
  return definitions.map((definition) => materializeHub(definition, records));
}

export const buildProgrammaticHubs = cache(async (): Promise<ProgrammaticHub[]> => {
  if (!programmaticHubsPromise) {
    programmaticHubsPromise = rememberPromise(buildProgrammaticHubsUncached(), () => {
      programmaticHubsPromise = null;
    });
  }
  return programmaticHubsPromise;
});

export const getProgrammaticHub = cache(async (slug: string): Promise<ProgrammaticHub | null> => {
  const definition = (await getProgrammaticHubDefinitionIndex()).get(slug);
  if (!definition) return null;
  const records = await getPublicArchiveRecords();
  return materializeHub(definition, records);
});

export async function getRelatedProgrammaticHubs(
  hub: ProgrammaticHubSummary,
  limit = 12,
): Promise<ProgrammaticHubSummary[]> {
  const definitions = await getProgrammaticHubDefinitions();
  return definitions
    .filter((item) => item.slug !== hub.slug)
    .filter((item) => {
      const shared =
        (hub.filters.country || []).some((value) => item.filters.country?.includes(value)) ||
        (hub.filters.region || []).some((value) => item.filters.region?.includes(value)) ||
        (hub.filters.knowledge || []).some((value) => item.filters.knowledge?.includes(value));
      return shared;
    })
    .slice(0, limit)
    .map(toHubSummary);
}

export function recordsForHub(hub: ProgrammaticHub, records: ArchiveRecord[]): ArchiveRecord[] {
  const ids = new Set(hub.recordIds);
  return records.filter((record) => ids.has(record.id));
}
