/**
 * Curated Smithsonian Open Access unit gateways — metadata and external links only.
 * Full EDAN metadata lives on AWS (11M+ line-delimited JSON records); not ingested in Phase 1.
 * @see https://smithsonian-open-access.s3-us-west-2.amazonaws.com/metadata/edan/index.txt
 * @see https://www.si.edu/openaccess
 */
export type SmithsonianOpenCollection = {
  id: string;
  unitCode: string;
  title: string;
  platform: string;
  source: "smithsonian";
  sourceLabel: "Smithsonian Open Access";
  resultKind: "collection";
  type: "Open cultural collection";
  description: string;
  countries: string[];
  languages: string[];
  themes: string[];
  mediaTypes: string[];
  keywords: string[];
  access: "external-open-collection";
  licence: "CC0 1.0";
  url: string;
  searchUrlTemplate: string;
};

const SI_OPEN_ACCESS = "https://www.si.edu/openaccess";
const SI_SEARCH = "https://www.si.edu/search?edan_q=";

function smithsonianCollection(
  id: string,
  unitCode: string,
  title: string,
  description: string,
  opts: {
    countries: string[];
    languages?: string[];
    themes: string[];
    mediaTypes: string[];
    keywords?: string[];
    url: string;
  },
): SmithsonianOpenCollection {
  return {
    id,
    unitCode,
    title,
    platform: "Smithsonian Open Access",
    source: "smithsonian",
    sourceLabel: "Smithsonian Open Access",
    resultKind: "collection",
    type: "Open cultural collection",
    description,
    countries: opts.countries,
    languages: opts.languages ?? ["English"],
    themes: opts.themes,
    mediaTypes: opts.mediaTypes,
    keywords: opts.keywords ?? [],
    access: "external-open-collection",
    licence: "CC0 1.0",
    url: opts.url,
    searchUrlTemplate: SI_SEARCH,
  };
}

export const SMITHSONIAN_COLLECTIONS: SmithsonianOpenCollection[] = [
  smithsonianCollection(
    "nmafa",
    "NMAfA",
    "National Museum of African Art",
    "African art, textiles, sculpture, photography, and material culture from across the continent and diaspora. CC0 metadata with culturally sensitive media — confirm rights and context at source.",
    {
      countries: ["Pan-Africa", "United States"],
      themes: ["African Art", "Material Culture", "Visual Culture"],
      mediaTypes: ["Objects", "Images", "Photographs"],
      keywords: [
        "African art",
        "Africa",
        "Ghana",
        "Ethiopia",
        "Mali",
        "Benin",
        "Congo",
        "masks",
        "textiles",
        "sculpture",
        "diaspora",
      ],
      url: "https://africa.si.edu/",
    },
  ),
  smithsonianCollection(
    "nmaahc",
    "NMAAHC",
    "National Museum of African American History and Culture",
    "Collections documenting African American history, culture, photography, oral history, and the diaspora. Open access metadata under CC0; community and portrait sensitivity applies.",
    {
      countries: ["United States", "Pan-Africa"],
      themes: ["African American History", "Diaspora", "Cultural Memory"],
      mediaTypes: ["Photographs", "Objects", "Archival Records", "Audio"],
      keywords: [
        "African American history",
        "diaspora",
        "photographs",
        "oral history",
        "civil rights",
        "Black history",
      ],
      url: "https://nmaahc.si.edu/",
    },
  ),
  smithsonianCollection(
    "naa",
    "NAA",
    "National Anthropological Archives",
    "Field notes, manuscripts, photographs, and sound recordings from anthropological fieldwork worldwide, including extensive Africa-related holdings.",
    {
      countries: ["Global", "Pan-Africa"],
      themes: ["Anthropology", "Fieldwork", "Archival Research"],
      mediaTypes: ["Manuscripts", "Photographs", "Audio", "Field Notes"],
      keywords: [
        "anthropology",
        "fieldwork",
        "archival photographs",
        "Africa",
        "ethnography",
        "oral history",
      ],
      url: "https://anthropology.si.edu/accessing-collections/national-anthropological-archives",
    },
  ),
  smithsonianCollection(
    "eepa",
    "EEPA",
    "Eliot Elisofon Photographic Archives",
    "Photographic archives of African life, art, and culture, including major coverage of West and Central Africa.",
    {
      countries: ["Pan-Africa"],
      themes: ["Photography", "African Art", "Visual Archives"],
      mediaTypes: ["Photographs", "Images"],
      keywords: [
        "Ghana photographs",
        "Mali photography",
        "African photography",
        "Elisofon",
        "fieldwork",
        "portraits",
      ],
      url: "https://africa.si.edu/explore/collections/eliot-elisofon-photographic-archives",
    },
  ),
  smithsonianCollection(
    "hsfa",
    "HSFA",
    "Human Studies Film Archives",
    "Documentary and ethnographic film holdings, including visual records of communities, rituals, and cultural practice.",
    {
      countries: ["Global", "Pan-Africa"],
      themes: ["Film", "Ethnographic Media", "Visual Culture"],
      mediaTypes: ["Video", "Film", "Audiovisual"],
      keywords: ["oral history", "fieldwork", "ethnographic film", "Africa", "documentary"],
      url: "https://anthropology.si.edu/hsfa/",
    },
  ),
  smithsonianCollection(
    "sil",
    "SIL",
    "Smithsonian Libraries",
    "Rare books, manuscripts, and published sources supporting Africa, diaspora, Global South, and comparative research across Smithsonian units.",
    {
      countries: ["Global", "Global South", "Pan-Africa", "Pacific", "Southeast Asia"],
      themes: ["Libraries", "Published Sources", "Manuscripts"],
      mediaTypes: ["Books", "Manuscripts", "Documents"],
      keywords: ["archives", "manuscripts", "Africa", "history", "anthropology", "art history"],
      url: "https://library.si.edu/",
    },
  ),
  smithsonianCollection(
    "sia",
    "SIA",
    "Smithsonian Institution Archives",
    "Institutional and expedition records, correspondence, and documentation of Smithsonian collecting and research history.",
    {
      countries: ["United States", "Global"],
      themes: ["Institutional Archives", "Expeditions", "Provenance"],
      mediaTypes: ["Archival Records", "Documents", "Photographs"],
      keywords: ["archives", "expeditions", "fieldwork", "Africa", "collecting history"],
      url: "https://siarchives.si.edu/",
    },
  ),
  smithsonianCollection(
    "aaa",
    "AAA",
    "Archives of American Art",
    "Archival collections on American art with relevance to African diaspora artists, exhibitions, and cultural networks.",
    {
      countries: ["United States"],
      themes: ["Art Archives", "Diaspora", "Exhibition History"],
      mediaTypes: ["Manuscripts", "Photographs", "Correspondence"],
      keywords: ["African American", "diaspora", "art archives", "photographs", "artists"],
      url: "https://www.aaa.si.edu/",
    },
  ),
  smithsonianCollection(
    "fsg",
    "FSG",
    "Freer Gallery of Art & Arthur M. Sackler Gallery",
    "Asian art, archaeology, and material culture including Southeast Asia, South Asia, East Asia, and the Islamic world. CC0 metadata — confirm cultural sensitivity at source.",
    {
      countries: ["Global", "Southeast Asia", "South Asia", "Pacific"],
      themes: ["Asian Art", "Material Culture", "Archaeology"],
      mediaTypes: ["Objects", "Images", "Ceramics", "Sculpture"],
      keywords: [
        "Southeast Asia",
        "Indonesia",
        "Thailand",
        "Vietnam",
        "Philippines",
        "India",
        "China",
        "Japan",
        "Islamic art",
        "ceramics",
        "sculpture",
      ],
      url: "https://asia.si.edu/",
    },
  ),
  smithsonianCollection(
    "nmnh",
    "NMNH",
    "National Museum of Natural History",
    "Anthropology, ethnology, and cultural collections from across the Global South — objects, photographs, and field documentation.",
    {
      countries: ["Global", "Global South", "Pan-Africa", "Pacific", "Southeast Asia"],
      themes: ["Anthropology", "Ethnology", "Material Culture"],
      mediaTypes: ["Objects", "Photographs", "Specimens", "Archival Records"],
      keywords: [
        "anthropology",
        "ethnology",
        "Pacific",
        "Oceania",
        "South Africa",
        "Southeast Asia",
        "Indonesia",
        "fieldwork",
        "material culture",
      ],
      url: "https://naturalhistory.si.edu/research/anthropology",
    },
  ),
];

export const SMITHSONIAN_METADATA_INDEX_URL =
  "https://smithsonian-open-access.s3-us-west-2.amazonaws.com/metadata/edan/index.txt";

export const SMITHSONIAN_OPEN_ACCESS_HOME = SI_OPEN_ACCESS;

export function getSmithsonianCollectionById(id: string): SmithsonianOpenCollection | undefined {
  return SMITHSONIAN_COLLECTIONS.find((c) => c.id === id);
}

export function listSmithsonianFilterOptions() {
  const countries = new Set<string>();
  const themes = new Set<string>();
  const mediaTypes = new Set<string>();
  const languages = new Set<string>();
  const unitCodes = new Set<string>();

  for (const c of SMITHSONIAN_COLLECTIONS) {
    c.countries.forEach((v) => countries.add(v));
    c.themes.forEach((v) => themes.add(v));
    c.mediaTypes.forEach((v) => mediaTypes.add(v));
    c.languages.forEach((v) => languages.add(v));
    unitCodes.add(c.unitCode);
  }

  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));

  return {
    countries: sort(countries),
    themes: sort(themes),
    mediaTypes: sort(mediaTypes),
    languages: sort(languages),
    unitCodes: sort(unitCodes),
  };
}

export function smithsonianCollectionSearchUrl(collection: SmithsonianOpenCollection, query?: string): string {
  const q = String(query || collection.title).trim();
  return `${collection.searchUrlTemplate}${encodeURIComponent(q)}`;
}
