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

function addHub(
  map: Map<string, ProgrammaticHub>,
  hub: Omit<ProgrammaticHub, "recordIds">,
  records: ArchiveRecord[],
) {
  if (map.has(hub.slug)) return;
  const matched = records.filter((record) => recordMatches(record, hub.filters));
  map.set(hub.slug, {
    ...hub,
    recordIds: matched.map((record) => record.id),
  });
}

export const buildProgrammaticHubs = cache(async (): Promise<ProgrammaticHub[]> => {
  const records = await getPublicArchiveRecords();
  const hubs = new Map<string, ProgrammaticHub>();
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
      records,
    );
    addHub(
      hubs,
      {
        slug: `museums-and-archives-in-${slugifyEntity(country)}`,
        title: `Museums and Archives in ${country}`,
        description: `Holding institutions, archives and museum-linked records associated with ${country}.`,
        filters: { country: [country], tags: ["museum", "archive", "library", "gallery"] },
      },
      records,
    );
    addHub(
      hubs,
      {
        slug: `unesco-and-heritage-records-in-${slugifyEntity(country)}`,
        title: `UNESCO and Heritage Records in ${country}`,
        description: `Heritage and culturally significant records linked to ${country}.`,
        filters: { country: [country], tags: ["unesco", "heritage", "world heritage", "intangible"] },
      },
      records,
    );
    addHub(
      hubs,
      {
        slug: `oral-histories-in-${slugifyEntity(country)}`,
        title: `Oral Histories in ${country}`,
        description: `Oral history and performance records associated with ${country}.`,
        filters: { country: [country], recordType: ["Oral History", "Performance / Sonic Record"] },
      },
      records,
    );
    addHub(
      hubs,
      {
        slug: `indigenous-languages-of-${slugifyEntity(country)}`,
        title: `Indigenous Languages of ${country}`,
        description: `Language-linked records and multilingual materials associated with ${country}.`,
        filters: { country: [country] },
      },
      records,
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
      records,
    );
    addHub(
      hubs,
      {
        slug: `indigenous-languages-of-${slugifyEntity(region)}`,
        title: `Indigenous Languages of ${region}`,
        description: `Language-linked records associated with ${region}.`,
        filters: { region: [region] },
      },
      records,
    );
    addHub(
      hubs,
      {
        slug: `oral-histories-in-${slugifyEntity(region)}`,
        title: `Oral Histories in ${region}`,
        description: `Oral history and tradition records connected to ${region}.`,
        filters: { region: [region], recordType: ["Oral History", "Performance / Sonic Record"] },
      },
      records,
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
        records,
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
        records,
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
        records,
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
        records,
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
        records,
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
        records,
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
        records,
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
        records,
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
        records,
      );
    });
  });

  THEME_BRIDGES.forEach((theme) => {
    const matched = records.filter((record) => {
      const bag = [
        ...(record.knowledgeAreas || []),
        ...(record.tags || []),
        ...(record.keywords || []),
        record.title || "",
        record.summary || "",
      ];
      return includesAny(bag, theme.matchers);
    });
    hubs.set(`knowledge-systems-connected-to-${slugifyEntity(theme.label)}`, {
      slug: `knowledge-systems-connected-to-${slugifyEntity(theme.label)}`,
      title: `Knowledge Systems connected to ${theme.label}`,
      description: `Cross-linked ARED records where knowledge systems intersect with ${theme.label.toLowerCase()}.`,
      filters: { tags: theme.matchers },
      recordIds: matched.map((record) => record.id),
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
        records,
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
    records,
  );
  addHub(
    hubs,
    {
      slug: "african-textile-archives",
      title: "African Textile Archives",
      description: "Textile knowledge, cloth systems and related archival materials across Africa and the diaspora.",
      filters: { knowledge: ["Textile Knowledge", "Material Culture"] },
    },
    records,
  );

  return Array.from(hubs.values()).sort((a, b) => a.title.localeCompare(b.title));
});

export async function getProgrammaticHub(slug: string): Promise<ProgrammaticHub | null> {
  const hubs = await buildProgrammaticHubs();
  return hubs.find((hub) => hub.slug === slug) || null;
}

export function recordsForHub(hub: ProgrammaticHub, records: ArchiveRecord[]): ArchiveRecord[] {
  const ids = new Set(hub.recordIds);
  return records.filter((record) => ids.has(record.id));
}
