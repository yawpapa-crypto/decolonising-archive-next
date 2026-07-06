/**
 * Ghana collection — one major collection organised into authoritative subcollections.
 * Public filter pills map to catalogue search; records retain historical periods
 * and visual systems in the data layer.
 */

import type { CatalogueRecord } from "@/lib/catalogue/types";

export const GHANA_COLLECTION_TITLE =
  "History of Graphic Design and Visual Communication in Ghana";

export const GHANA_COLLECTION_SUBTITLE =
  "Objects, makers, symbols, print cultures and public images across Ghanaian history.";

export type GhanaSubcollectionId =
  | "symbols-authority-knowledge"
  | "asafo-visual-culture"
  | "cloth-pattern-identity"
  | "colonial-print"
  | "independence-national-identity"
  | "popular-everyday"
  | "design-education"
  | "digital-diasporic";

export type GhanaCollectionFilterId =
  | "all"
  | "asafo"
  | "adinkra"
  | "goldweights"
  | "kente"
  | "print"
  | "national-identity"
  | "popular-graphics"
  | "design-education"
  | "digital-design";

export type GhanaSubcollection = {
  id: GhanaSubcollectionId;
  number: number;
  title: string;
  summary: string;
  topics: string[];
  /** Primary public filter when browsing this section */
  primaryFilter: GhanaCollectionFilterId;
  launchPriority: number;
  featured?: boolean;
};

export const GHANA_SUBCOLLECTIONS: GhanaSubcollection[] = [
  {
    id: "symbols-authority-knowledge",
    number: 1,
    title: "Symbols, Authority and Knowledge",
    summary:
      "Ghanaian graphic history began long before professional graphic design — in weights, stamps, cloth, regalia and proverbial symbols.",
    topics: [
      "Akan goldweights",
      "Adinkra stamps and cloth",
      "Linguist staffs",
      "Stools and state swords",
      "Umbrellas and royal emblems",
      "Shrine imagery",
      "Proverbial symbols",
    ],
    primaryFilter: "adinkra",
    launchPriority: 3,
  },
  {
    id: "asafo-visual-culture",
    number: 2,
    title: "Fante Asafo Visual Culture",
    summary:
      "A visually powerful and historically distinctive tradition — flags, companies, posuban shrines, proverbs and performance.",
    topics: [
      "Asafo flags and flag makers",
      "Asafo companies",
      "Posuban shrines",
      "Proverbs and rivalries",
      "Performance photographs",
      "Museum collections",
      "Colonial and Ghanaian flag cantons",
      "Oral interpretations",
    ],
    primaryFilter: "asafo",
    launchPriority: 1,
    featured: true,
  },
  {
    id: "cloth-pattern-identity",
    number: 3,
    title: "Cloth, Pattern and Social Identity",
    summary:
      "Woven and printed cloth as social communication — not every textile is kente.",
    topics: [
      "Asante kente",
      "Ewe kente",
      "Adinkra cloth",
      "Northern woven cloth",
      "Commemorative and political cloth",
      "Funeral cloth",
      "Named weavers and weaving centres",
    ],
    primaryFilter: "kente",
    launchPriority: 3,
  },
  {
    id: "colonial-print",
    number: 4,
    title: "Colonial Print and Public Communication",
    summary:
      "How print entered an already rich visual culture — newspapers, mission books, maps, campaigns and photography.",
    topics: [
      "Newspapers and mission publications",
      "Colonial maps and schoolbooks",
      "Postcards and government forms",
      "Railway graphics and advertisements",
      "Health campaigns",
      "Photography and printing presses",
    ],
    primaryFilter: "print",
    launchPriority: 6,
  },
  {
    id: "independence-national-identity",
    number: 5,
    title: "Independence and National Identity",
    summary:
      "State symbols, national designers and the visual language of sovereignty after 1957.",
    topics: [
      "Theodosia Salome Okoh",
      "Ghana national flag",
      "Nii Amon Kotei and coat of arms",
      "Kofi Antubam",
      "Independence programmes and currency",
      "Stamps and political posters",
      "Black Star imagery and Ghana Airways",
      "Trade fairs and tourism graphics",
    ],
    primaryFilter: "national-identity",
    launchPriority: 4,
    featured: true,
  },
  {
    id: "popular-everyday",
    number: 6,
    title: "Popular Graphics and Everyday Design",
    summary:
      "The archive feels alive here — sign painting, posters, church banners and vernacular commercial art.",
    topics: [
      "Sign painting and chop-bar signs",
      "Barber, salon and trotro lettering",
      "Funeral and church banners",
      "Market packaging and music posters",
      "Cassette covers and cinema posters",
      "Fantasy coffins",
    ],
    primaryFilter: "popular-graphics",
    launchPriority: 5,
    featured: true,
  },
  {
    id: "design-education",
    number: 7,
    title: "Graphic Design Education and Professional Practice",
    summary:
      "How graphic design became a formal profession — schools, studios, agencies and professional associations.",
    topics: [
      "Achimota and KNUST",
      "Technical universities",
      "Curriculum and student work",
      "Printers and publishing houses",
      "Advertising agencies and design studios",
      "Exhibitions and design journals",
    ],
    primaryFilter: "design-education",
    launchPriority: 7,
  },
  {
    id: "digital-diasporic",
    number: 8,
    title: "Digital, Broadcast and Diasporic Design",
    summary:
      "Television, social media, motion design and Ghanaian designers working across borders.",
    topics: [
      "Television and radio identities",
      "Social-media flyers and motion design",
      "Interface and digital branding",
      "Political memes and music videos",
      "Diasporic publications and studios",
    ],
    primaryFilter: "digital-design",
    launchPriority: 8,
  },
];

export type GhanaFilterPill = {
  id: GhanaCollectionFilterId;
  label: string;
  subcollectionId?: GhanaSubcollectionId;
  q?: string;
  visualSystemId?: string;
};

/** Public index filters shown on the browse page */
export const GHANA_COLLECTION_FILTER_PILLS: GhanaFilterPill[] = [
  { id: "all", label: "ALL RECORDS" },
  {
    id: "asafo",
    label: "ASAFO",
    subcollectionId: "asafo-visual-culture",
    q: "asafo posuban frankaa",
  },
  {
    id: "adinkra",
    label: "ADINKRA",
    subcollectionId: "symbols-authority-knowledge",
    q: "adinkra",
  },
  {
    id: "goldweights",
    label: "GOLDWEIGHTS",
    subcollectionId: "symbols-authority-knowledge",
    q: "goldweight gold weight",
  },
  {
    id: "kente",
    label: "KENTE",
    subcollectionId: "cloth-pattern-identity",
    q: "kente cloth weaving",
  },
  {
    id: "print",
    label: "PRINT",
    subcollectionId: "colonial-print",
    visualSystemId: "V4",
  },
  {
    id: "national-identity",
    label: "NATIONAL IDENTITY",
    subcollectionId: "independence-national-identity",
    visualSystemId: "V5",
  },
  {
    id: "popular-graphics",
    label: "POPULAR GRAPHICS",
    subcollectionId: "popular-everyday",
    visualSystemId: "V6",
  },
  {
    id: "design-education",
    label: "DESIGN EDUCATION",
    subcollectionId: "design-education",
    q: "achimota knust design education curriculum studio",
  },
  {
    id: "digital-design",
    label: "DIGITAL DESIGN",
    subcollectionId: "digital-diasporic",
    visualSystemId: "V7",
  },
];

export function getGhanaFilterPill(id: GhanaCollectionFilterId): GhanaFilterPill | undefined {
  return GHANA_COLLECTION_FILTER_PILLS.find((p) => p.id === id);
}

function recordSearchHaystack(record: CatalogueRecord): string {
  return [
    record.title,
    record.description,
    record.creatorOrAuthority ?? "",
    record.region ?? "",
    record.locality ?? "",
    record.institutionOrCollection ?? "",
    record.visualSystemLabel ?? "",
    record.objectOrRecordType ?? "",
    record.sourceName ?? "",
    record.historicalSignificance ?? "",
    record.mediumOrFormat ?? "",
    ...record.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesAnyTerm(haystack: string, terms: string[]): boolean {
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

/** Narrow public filter pill — ASAFO, ADINKRA, etc. */
export function recordMatchesGhanaFilter(
  record: CatalogueRecord,
  filterId: GhanaCollectionFilterId,
): boolean {
  if (filterId === "all") return true;
  const haystack = recordSearchHaystack(record);
  switch (filterId) {
    case "asafo":
      return matchesAnyTerm(haystack, ["asafo", "posuban", "frankaa", "fante flag", "company flag"]);
    case "adinkra":
      return matchesAnyTerm(haystack, ["adinkra"]);
    case "goldweights":
      return matchesAnyTerm(haystack, ["goldweight", "gold weight", "goldweights", "gold-weight"]);
    case "kente":
      return (
        record.visualSystemId === "V3" ||
        matchesAnyTerm(haystack, ["kente", "weaving", "woven cloth", "textile"])
      );
    case "print":
      return record.visualSystemId === "V4";
    case "national-identity":
      return record.visualSystemId === "V5";
    case "popular-graphics":
      return record.visualSystemId === "V6";
    case "design-education":
      return matchesAnyTerm(haystack, [
        "achimota",
        "knust",
        "kumasi",
        "design education",
        "design school",
        "curriculum",
        "typography",
        "graphic design",
        "design studio",
        "design department",
      ]);
    case "digital-design":
      return (
        record.visualSystemId === "V7" ||
        matchesAnyTerm(haystack, ["television", "social media", "motion design", "digital branding"])
      );
    default:
      return true;
  }
}

/** Full subcollection section — broader than a single filter pill */
export function recordMatchesSubcollection(
  record: CatalogueRecord,
  subcollectionId: GhanaSubcollectionId,
): boolean {
  const haystack = recordSearchHaystack(record);
  switch (subcollectionId) {
    case "symbols-authority-knowledge":
      return (
        record.visualSystemId === "V1" ||
        record.visualSystemId === "V2" ||
        matchesAnyTerm(haystack, [
          "goldweight",
          "gold weight",
          "adinkra",
          "stool",
          "linguist",
          "sword",
          "umbrella",
          "shrine",
          "proverb",
          "regalia",
          "emblem",
          "authority",
        ])
      );
    case "asafo-visual-culture":
      return matchesAnyTerm(haystack, [
        "asafo",
        "posuban",
        "frankaa",
        "fante flag",
        "company flag",
        "asafo flag",
      ]);
    case "cloth-pattern-identity":
      return (
        record.visualSystemId === "V3" ||
        matchesAnyTerm(haystack, ["kente", "weaving", "woven cloth", "textile", "adinkra cloth", "ewe"])
      );
    case "colonial-print":
      return (
        record.visualSystemId === "V4" ||
        matchesAnyTerm(haystack, [
          "newspaper",
          "mission",
          "postcard",
          "schoolbook",
          "printing press",
          "colonial map",
          "railway",
          "health campaign",
        ])
      );
    case "independence-national-identity":
      return record.visualSystemId === "V5";
    case "popular-everyday":
      return record.visualSystemId === "V6";
    case "design-education":
      return matchesAnyTerm(haystack, [
        "achimota",
        "knust",
        "kumasi",
        "design education",
        "design school",
        "curriculum",
        "typography",
        "graphic design",
        "design studio",
        "design department",
        "publishing house",
        "advertising agency",
      ]);
    case "digital-diasporic":
      return (
        record.visualSystemId === "V7" ||
        matchesAnyTerm(haystack, [
          "television",
          "social media",
          "motion design",
          "digital branding",
          "diaspor",
          "music video",
        ])
      );
    default:
      return false;
  }
}

export function getSubcollectionByFilter(
  filterId: GhanaCollectionFilterId,
): GhanaSubcollection | undefined {
  const pill = getGhanaFilterPill(filterId);
  if (!pill?.subcollectionId) return undefined;
  return GHANA_SUBCOLLECTIONS.find((s) => s.id === pill.subcollectionId);
}

/** Build order for public launch messaging */
export const GHANA_LAUNCH_PRIORITIES = [...GHANA_SUBCOLLECTIONS]
  .sort((a, b) => a.launchPriority - b.launchPriority)
  .map((s) => s.title);
