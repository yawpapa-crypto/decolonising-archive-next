import unescoIchImport from "@/src/data/unesco-ich-records.json";

export type KnowledgeVerificationStatus =
  | "community-verified"
  | "source-supported"
  | "review-needed";

export type KnowledgeAccessStatus =
  | "open-summary"
  | "context-required"
  | "restricted";

export type KnowledgeRecord = {
  slug: string;
  title: string;
  preferredTitle?: string;
  type: string;
  summary: string;
  overview: string[];
  community: string[];
  languages: string[];
  region: string;
  subregion?: string;
  countries: string[];
  culturalTerritories: string[];
  categories: string[];
  periods: string[];
  relationships: string[];
  sourceIds: string[];
  verificationStatus: KnowledgeVerificationStatus;
  culturalAccess: KnowledgeAccessStatus;
  publicationStatus: "published" | "draft";
  lastReviewed: string;
  coordinates?: {
    label: string;
    lat: number;
    lng: number;
    precision: "regional" | "country" | "community";
  };
  sourceNote: string;
  culturalCare: string;
  limitations: string[];
  image?: {
    url: string;
    alt: string;
    credit: string;
  };
  externalIdentifier?: string;
  externalUuid?: string;
  externalSourceName?: string;
  sourceUrl?: string;
  importedAt?: string;
  rights?: {
    label: string;
    url?: string;
    rightsStatement?: string;
  };
  fieldProvenance?: Record<string, string>;
  original?: Record<string, unknown>;
};

export type KnowledgeSource = {
  slug: string;
  title: string;
  type:
    | "Community authority"
    | "Archive"
    | "Museum"
    | "Language centre"
    | "Research institution"
    | "Publication"
    | "Dataset";
  summary: string;
  region: string;
  country?: string;
  url?: string;
  governance: string;
  accessNote: string;
  supports: string[];
  status: "active" | "reference";
};

export const KNOWLEDGE_CATEGORIES = [
  "Ways of Knowing and Knowledge Transmission",
  "Language, Story and Memory",
  "Land, Sea, Sky and Ecology",
  "Health, Healing and Care",
  "Material Culture, Design and Technology",
  "Law, Governance and Ethics",
  "Ceremony, Spirituality and Cosmology",
  "Food, Agriculture and Seasonal Practice",
  "Music, Performance and Oral Literature",
  "Migration, Diaspora and Urban Life",
] as const;

export const KNOWLEDGE_REGIONS = [
  "Africa",
  "Australia",
  "Aotearoa New Zealand",
  "Pacific",
  "North America",
  "Latin America and Caribbean",
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "Central Asia",
  "Middle East",
  "Europe",
  "Arctic",
  "Global Diasporas",
] as const;

export const knowledgeSources: KnowledgeSource[] = [
  {
    slug: "unesco-intangible-cultural-heritage",
    title: "UNESCO Intangible Cultural Heritage Lists",
    type: "Dataset",
    summary:
      "International reference records for intangible cultural heritage nominations, descriptions and safeguarding plans.",
    region: "Global",
    url: "https://ich.unesco.org/en/lists",
    governance:
      "State-nominated records reviewed through UNESCO processes. Community authority varies by nomination and must be read critically.",
    accessNote:
      "Public metadata is available; community-specific protocols may sit outside the UNESCO record.",
    supports: ["yoruba-ifa-literary-corpus", "ga-homowo-seasonal-knowledge"],
    status: "active",
  },
  {
    slug: "ghana-museums-and-monuments-board",
    title: "Ghana Museums and Monuments Board",
    type: "Museum",
    summary:
      "National heritage body connected to Ghanaian museums, monuments and public cultural heritage interpretation.",
    region: "Africa",
    country: "Ghana",
    url: "https://www.ghanamuseums.org/",
    governance:
      "Institutional heritage authority. Local community custodianship remains important for knowledge-specific access decisions.",
    accessNote:
      "Use as a public institutional source, not as a replacement for community review.",
    supports: ["akan-adinkra-visual-knowledge", "akan-goldweight-proverbial-knowledge"],
    status: "active",
  },
  {
    slug: "metropolitan-museum-open-access",
    title: "The Metropolitan Museum of Art Open Access Collection",
    type: "Museum",
    summary:
      "Open collection records and images for selected objects, including African material culture holdings.",
    region: "Global",
    country: "United States",
    url: "https://www.metmuseum.org/art/collection",
    governance:
      "Museum catalogue data; provenance and community authority should be checked record by record.",
    accessNote:
      "Open access applies to selected media metadata, not to unrestricted cultural use.",
    supports: ["akan-goldweight-proverbial-knowledge"],
    status: "active",
  },
  {
    slug: "british-museum-collection-online",
    title: "British Museum Collection Online",
    type: "Museum",
    summary:
      "Public collection catalogue with object records, provenance trails and institutional descriptions.",
    region: "Global",
    country: "United Kingdom",
    url: "https://www.britishmuseum.org/collection",
    governance:
      "Holding institution catalogue. Records may reflect colonial acquisition histories and should be contextualised.",
    accessNote:
      "Use as evidence of holdings/provenance, not as sole authority for living knowledge.",
    supports: ["akan-adinkra-visual-knowledge", "akan-goldweight-proverbial-knowledge"],
    status: "active",
  },
  {
    slug: "african-online-digital-library",
    title: "African Online Digital Library",
    type: "Archive",
    summary:
      "Digital projects and archival collections focused on African histories, communities and cultural materials.",
    region: "Africa",
    url: "https://aodl.org/",
    governance:
      "Project-based digital archive with institutional and community partnerships varying by collection.",
    accessNote:
      "Review each collection's access and citation instructions before reuse.",
    supports: ["ewe-kente-weaving-knowledge", "ga-homowo-seasonal-knowledge"],
    status: "active",
  },
  {
    slug: "scholarly-publications",
    title: "Peer-reviewed and scholarly publications",
    type: "Publication",
    summary:
      "Journal articles, books and catalogues used as secondary context for public-safe summaries.",
    region: "Global",
    governance:
      "Authorial and institutional scholarship. Community review is still required for sensitive or restricted knowledge.",
    accessNote:
      "Some publications may be paywalled; citations should include stable DOI or publisher links where possible.",
    supports: [
      "ubuntu-ethics-relational-personhood",
      "san-tracking-ecological-knowledge",
      "ewe-kente-weaving-knowledge",
    ],
    status: "reference",
  },
];

const curatedKnowledgeRecords: KnowledgeRecord[] = [
  {
    slug: "akan-adinkra-visual-knowledge",
    title: "Adinkra Visual Knowledge System",
    preferredTitle: "Adinkra",
    type: "Symbolic, ethical and visual knowledge system",
    summary:
      "Akan visual symbols used in cloth, architecture, funerary practice and public design to carry philosophical, ethical and social concepts.",
    overview: [
      "This record treats Adinkra as a public-facing visual knowledge system rather than as decorative motif alone.",
      "The open summary focuses on symbols, naming and social use. It does not claim access to restricted ceremonial interpretation.",
    ],
    community: ["Akan", "Asante", "Ghanaian diaspora"],
    languages: ["Twi", "Akan"],
    region: "Africa",
    subregion: "West Africa",
    countries: ["Ghana", "Cote d'Ivoire"],
    culturalTerritories: ["Akan cultural regions"],
    categories: [
      "Material Culture, Design and Technology",
      "Language, Story and Memory",
      "Law, Governance and Ethics",
    ],
    periods: ["Precolonial to present", "Contemporary design practice"],
    relationships: ["symbol system", "textile practice", "proverbial knowledge"],
    sourceIds: [
      "ghana-museums-and-monuments-board",
      "british-museum-collection-online",
    ],
    verificationStatus: "source-supported",
    culturalAccess: "context-required",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Akan cultural regions, West Africa",
      lat: 6.8,
      lng: -1.6,
      precision: "regional",
    },
    sourceNote:
      "Public summary supported by museum and heritage catalogue records. Community review is still needed for deeper interpretation.",
    culturalCare:
      "Do not detach named symbols from Akan language, ethics and ceremony when reusing them in design contexts.",
    limitations: [
      "Symbol meanings vary by community, use and translation.",
      "This record is not a complete symbol dictionary.",
    ],
  },
  {
    slug: "akan-goldweight-proverbial-knowledge",
    title: "Akan Goldweight Proverbial Knowledge",
    preferredTitle: "Mrammuo and goldweight knowledge",
    type: "Material, mathematical and proverbial knowledge system",
    summary:
      "Cast brass goldweights used in trade, measure, diplomacy and proverbial communication across Akan contexts.",
    overview: [
      "Goldweights can be read as material interfaces between measurement, market exchange, memory and moral instruction.",
      "Public museum records document objects, but community-grounded interpretation is essential for symbolic and proverbial meanings.",
    ],
    community: ["Akan", "Asante"],
    languages: ["Twi", "Akan"],
    region: "Africa",
    subregion: "West Africa",
    countries: ["Ghana", "Cote d'Ivoire"],
    culturalTerritories: ["Akan trading networks"],
    categories: [
      "Material Culture, Design and Technology",
      "Law, Governance and Ethics",
      "Ways of Knowing and Knowledge Transmission",
    ],
    periods: ["Precolonial to colonial trade", "Museum collection histories"],
    relationships: ["measurement", "trade knowledge", "proverbial knowledge"],
    sourceIds: [
      "metropolitan-museum-open-access",
      "british-museum-collection-online",
      "ghana-museums-and-monuments-board",
    ],
    verificationStatus: "source-supported",
    culturalAccess: "context-required",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Akan trading regions",
      lat: 6.9,
      lng: -1.2,
      precision: "regional",
    },
    sourceNote:
      "Catalogue sources support the object tradition and collection histories; interpretation should be checked with Akan scholarship and custodians.",
    culturalCare:
      "Treat museum-held objects as displaced evidence, not neutral examples separated from trade, language and community histories.",
    limitations: [
      "Object-level provenance varies across museums.",
      "This record does not resolve contested collection histories.",
    ],
  },
  {
    slug: "ewe-kente-weaving-knowledge",
    title: "Ewe Kente Weaving Knowledge",
    preferredTitle: "Agbamevor and related weaving traditions",
    type: "Textile, naming and intergenerational knowledge system",
    summary:
      "Strip-woven cloth traditions where technique, pattern, naming and social use carry histories of making and identity.",
    overview: [
      "This entry frames weaving as skilled knowledge: loom practice, design memory, apprenticeship and named cloth repertoires.",
      "It is intentionally a high-level public record because particular motifs, histories and naming protocols can be locally specific.",
    ],
    community: ["Ewe"],
    languages: ["Ewe"],
    region: "Africa",
    subregion: "West Africa",
    countries: ["Ghana", "Togo"],
    culturalTerritories: ["Volta region", "Ewe cultural regions"],
    categories: [
      "Material Culture, Design and Technology",
      "Language, Story and Memory",
      "Ways of Knowing and Knowledge Transmission",
    ],
    periods: ["Precolonial to present", "Contemporary textile practice"],
    relationships: ["textile practice", "apprenticeship", "design memory"],
    sourceIds: ["african-online-digital-library", "scholarly-publications"],
    verificationStatus: "review-needed",
    culturalAccess: "context-required",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Ewe cultural regions",
      lat: 6.4,
      lng: 0.7,
      precision: "regional",
    },
    sourceNote:
      "Public summary uses collection-level and scholarly context; local review is required before expanding specific pattern meanings.",
    culturalCare:
      "Avoid flattening Ewe and Asante cloth histories into one generic 'kente' category.",
    limitations: [
      "Naming and attribution can differ between weaving centres.",
      "This record needs community review.",
    ],
  },
  {
    slug: "yoruba-ifa-literary-corpus",
    title: "Yoruba Ifa Literary Corpus",
    preferredTitle: "Ifa",
    type: "Oral, literary, ethical and divinatory knowledge system",
    summary:
      "A Yoruba corpus of verses, interpretation practices and ethical instruction transmitted through specialist lineages and diasporic communities.",
    overview: [
      "This record only presents public orientation metadata. It does not reproduce restricted ritual knowledge.",
      "Ifa connects oral literature, divination, ethics, cosmology, apprenticeship and diaspora memory.",
    ],
    community: ["Yoruba", "Yoruba diaspora"],
    languages: ["Yoruba"],
    region: "Africa",
    subregion: "West Africa",
    countries: ["Nigeria", "Benin", "Togo", "Global diasporas"],
    culturalTerritories: ["Yoruba cultural regions", "Atlantic diaspora"],
    categories: [
      "Ceremony, Spirituality and Cosmology",
      "Language, Story and Memory",
      "Ways of Knowing and Knowledge Transmission",
    ],
    periods: ["Precolonial to present", "Diasporic continuity"],
    relationships: ["oral corpus", "apprenticeship", "diaspora practice"],
    sourceIds: ["unesco-intangible-cultural-heritage"],
    verificationStatus: "source-supported",
    culturalAccess: "restricted",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Yoruba cultural regions",
      lat: 7.4,
      lng: 3.9,
      precision: "regional",
    },
    sourceNote:
      "UNESCO and public references establish a high-level record; deeper knowledge requires lineage and community protocols.",
    culturalCare:
      "Do not treat public descriptions as permission to extract verses, ceremony or divination practice.",
    limitations: [
      "This is a public metadata record only.",
      "Authority is lineage- and community-specific.",
    ],
  },
  {
    slug: "ubuntu-ethics-relational-personhood",
    title: "Ubuntu Ethics and Relational Personhood",
    preferredTitle: "Ubuntu",
    type: "Ethical, social and philosophical knowledge system",
    summary:
      "A family of southern African relational ethics emphasising personhood, reciprocity and communal responsibility.",
    overview: [
      "Ubuntu is often over-generalised. This record distinguishes public philosophical discussion from living community ethics and language-specific meanings.",
      "The registry treats Ubuntu as plural and contextual, not a single slogan.",
    ],
    community: ["Nguni-language communities", "Southern African communities"],
    languages: ["Zulu", "Xhosa", "Ndebele", "Shona", "Related Bantu languages"],
    region: "Africa",
    subregion: "Southern Africa",
    countries: ["South Africa", "Zimbabwe", "Eswatini", "Lesotho"],
    culturalTerritories: ["Southern African relational ethics contexts"],
    categories: ["Law, Governance and Ethics", "Ways of Knowing and Knowledge Transmission"],
    periods: ["Historical to present", "Contemporary public philosophy"],
    relationships: ["ethics", "relational personhood", "public philosophy"],
    sourceIds: ["scholarly-publications"],
    verificationStatus: "review-needed",
    culturalAccess: "open-summary",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Southern Africa",
      lat: -28.7,
      lng: 24.7,
      precision: "regional",
    },
    sourceNote:
      "Public philosophical sources support this orientation; local language and community interpretation varies.",
    culturalCare:
      "Avoid reducing Ubuntu to a universal catchphrase detached from language, history and political use.",
    limitations: [
      "Not all southern African communities use or define Ubuntu in the same way.",
      "Needs deeper language-specific review.",
    ],
  },
  {
    slug: "ga-homowo-seasonal-knowledge",
    title: "Ga Homowo Seasonal Knowledge",
    preferredTitle: "Homowo",
    type: "Festival, seasonal memory and food knowledge system",
    summary:
      "Ga public festival knowledge connecting migration memory, seasonal practice, food, song and community renewal.",
    overview: [
      "This record focuses on public orientation: Homowo as remembrance, harvest and civic-cultural practice.",
      "Specific rites, family histories and ceremonial protocols may not be appropriate for unrestricted publication.",
    ],
    community: ["Ga"],
    languages: ["Ga"],
    region: "Africa",
    subregion: "West Africa",
    countries: ["Ghana"],
    culturalTerritories: ["Greater Accra", "Ga traditional areas"],
    categories: [
      "Food, Agriculture and Seasonal Practice",
      "Music, Performance and Oral Literature",
      "Language, Story and Memory",
    ],
    periods: ["Historical to present", "Annual seasonal calendar"],
    relationships: ["festival knowledge", "food memory", "seasonal practice"],
    sourceIds: ["unesco-intangible-cultural-heritage", "african-online-digital-library"],
    verificationStatus: "review-needed",
    culturalAccess: "context-required",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Ga traditional areas",
      lat: 5.6,
      lng: -0.2,
      precision: "regional",
    },
    sourceNote:
      "Public festival references support basic context. Community authority is needed for ceremony-specific detail.",
    culturalCare:
      "Do not treat food, song or ritual as isolated content separated from Ga community authority.",
    limitations: [
      "Ceremony-specific detail is intentionally not included.",
      "This record needs community review before expansion.",
    ],
  },
  {
    slug: "san-tracking-ecological-knowledge",
    title: "San Tracking and Ecological Knowledge",
    preferredTitle: "Tracking knowledge systems",
    type: "Ecological, observational and land-based knowledge system",
    summary:
      "Land-based tracking practices involving animal behaviour, environmental signs, memory and collective interpretation.",
    overview: [
      "This record treats tracking as sophisticated ecological reasoning, not as a primitive survival skill.",
      "It is deliberately broad because San peoples are diverse and politically situated across national borders.",
    ],
    community: ["San peoples", "Khoe-San communities"],
    languages: ["Diverse San and Khoe languages"],
    region: "Africa",
    subregion: "Southern Africa",
    countries: ["Botswana", "Namibia", "South Africa", "Angola"],
    culturalTerritories: ["Kalahari and southern African ecological regions"],
    categories: [
      "Land, Sea, Sky and Ecology",
      "Ways of Knowing and Knowledge Transmission",
    ],
    periods: ["Ancestral to present", "Contemporary land rights contexts"],
    relationships: ["ecological knowledge", "tracking", "land memory"],
    sourceIds: ["scholarly-publications"],
    verificationStatus: "review-needed",
    culturalAccess: "context-required",
    publicationStatus: "published",
    lastReviewed: "2026-07-23",
    coordinates: {
      label: "Kalahari region",
      lat: -22.0,
      lng: 21.0,
      precision: "regional",
    },
    sourceNote:
      "Scholarly literature supports public overview only; community-led review is needed for specific practices and rights contexts.",
    culturalCare:
      "Avoid treating diverse San communities as one undifferentiated group.",
    limitations: [
      "The record is regional and introductory.",
      "It should be refined with named community authorities and language centres.",
    ],
  },
];

const importedKnowledgeRecords = (unescoIchImport.records as KnowledgeRecord[]).filter(
  (record) => record.publicationStatus === "published",
);

export const knowledgeRecords: KnowledgeRecord[] = [
  ...curatedKnowledgeRecords,
  ...importedKnowledgeRecords,
];

export function getPublishedKnowledgeRecords() {
  return knowledgeRecords.filter((record) => record.publicationStatus === "published");
}

export function getKnowledgeRecordBySlug(slug: string) {
  return knowledgeRecords.find((record) => record.slug === slug);
}

export function getKnowledgeSourceBySlug(slug: string) {
  return knowledgeSources.find((source) => source.slug === slug);
}

export function getSourcesForKnowledgeRecord(record: KnowledgeRecord) {
  return record.sourceIds
    .map((sourceId) => knowledgeSources.find((source) => source.slug === sourceId))
    .filter((source): source is KnowledgeSource => Boolean(source));
}

export function getKnowledgeRecordsForSource(sourceSlug: string) {
  return getPublishedKnowledgeRecords().filter((record) =>
    record.sourceIds.includes(sourceSlug),
  );
}

export function slugifyRegistryValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function labelFromSlug(slug: string) {
  const lookup = [
    ...KNOWLEDGE_REGIONS,
    ...KNOWLEDGE_CATEGORIES,
    ...knowledgeRecords.flatMap((record) => [
      ...record.countries,
      ...record.community,
      ...record.languages,
      ...record.periods,
      ...record.relationships,
    ]),
  ].find((value) => slugifyRegistryValue(value) === slug);

  if (lookup) return lookup;
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type BrowseKind =
  | "regions"
  | "countries"
  | "communities"
  | "languages"
  | "categories"
  | "periods"
  | "relationships";

export function getRecordsByBrowseValue(kind: BrowseKind, valueSlug: string) {
  const records = getPublishedKnowledgeRecords();
  return records.filter((record) => {
    const values =
      kind === "regions"
        ? [record.region, record.subregion].filter(Boolean)
        : kind === "countries"
          ? record.countries
          : kind === "communities"
            ? record.community
            : kind === "languages"
              ? record.languages
              : kind === "categories"
                ? record.categories
                : kind === "periods"
                  ? record.periods
                  : record.relationships;

    return values.some((value) => value && slugifyRegistryValue(value) === valueSlug);
  });
}

export function getRegistryStats() {
  const records = getPublishedKnowledgeRecords();
  const communities = new Set(records.flatMap((record) => record.community));
  const languages = new Set(records.flatMap((record) => record.languages));
  const sourceLinks = records.reduce((total, record) => total + record.sourceIds.length, 0);

  return {
    records: records.length,
    communities: communities.size,
    languages: languages.size,
    sources: knowledgeSources.length,
    sourceLinks,
    communityVerified: records.filter(
      (record) => record.verificationStatus === "community-verified",
    ).length,
    reviewNeeded: records.filter((record) => record.verificationStatus === "review-needed")
      .length,
  };
}

export function getBrowseIndex(kind: BrowseKind) {
  const counts = new Map<string, number>();
  getPublishedKnowledgeRecords().forEach((record) => {
    const values =
      kind === "regions"
        ? [record.region, record.subregion].filter(Boolean)
        : kind === "countries"
          ? record.countries
          : kind === "communities"
            ? record.community
            : kind === "languages"
              ? record.languages
              : kind === "categories"
                ? record.categories
                : kind === "periods"
                  ? record.periods
                  : record.relationships;

    values.forEach((value) => {
      if (!value) return;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({
      label,
      slug: slugifyRegistryValue(label),
      count,
    }));
}
