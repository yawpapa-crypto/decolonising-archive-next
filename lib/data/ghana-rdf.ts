/**
 * ARED — RDF vocabulary and serialisation for the Ghana Graphic Design collection.
 *
 * Vocabularies used:
 *   ared:      https://ared.design/vocab#              (own namespace)
 *   dcterms:   http://purl.org/dc/terms/               (Dublin Core Terms)
 *   schema:    https://schema.org/                      (Schema.org)
 *   skos:      http://www.w3.org/2004/02/skos/ns#       (Simple Knowledge Organisation System)
 *   edm:       http://www.europeana.eu/schemas/edm/     (Europeana Data Model)
 *   crm:       http://www.cidoc-crm.org/cidoc-crm/      (CIDOC-CRM)
 *   wd:        https://www.wikidata.org/entity/         (Wikidata)
 *   rdfs:      http://www.w3.org/2000/01/rdf-schema#
 *   rdf:       http://www.w3.org/1999/02/22-rdf-syntax-ns#
 *   owl:       http://www.w3.org/2002/07/owl#
 *   xsd:       http://www.w3.org/2001/XMLSchema#
 *   cc:        http://creativecommons.org/ns#
 */

import {
  CATEGORY_LABELS,
  GHANA_COLLECTION_ITEMS,
  GHANA_COLLECTION_META,
  type ArchiveItemCategory,
  type GhanaArchiveItem,
} from "./ghana-collection";

// ── Namespace prefixes ────────────────────────────────────────────────────────

export const PREFIXES = {
  ared: "https://ared.design/vocab#",
  aredo: "https://ared.design/collection/ghana-graphic-design/",
  dcterms: "http://purl.org/dc/terms/",
  schema: "https://schema.org/",
  skos: "http://www.w3.org/2004/02/skos/ns#",
  edm: "http://www.europeana.eu/schemas/edm/",
  crm: "http://www.cidoc-crm.org/cidoc-crm/",
  wd: "https://www.wikidata.org/entity/",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  cc: "http://creativecommons.org/ns#",
  foaf: "http://xmlns.com/foaf/0.1/",
} as const;

// ── Licence URI mapping ───────────────────────────────────────────────────────

export const LICENCE_URIS: Record<string, string> = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-NC": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "Public Domain": "https://creativecommons.org/publicdomain/mark/1.0/",
};

// ── Wikidata entity mappings ──────────────────────────────────────────────────
// Key concepts in Ghana graphic design linked to Wikidata entities

export const WIKIDATA_CONCEPTS: Record<string, string> = {
  Ghana: "Q117",
  Accra: "Q3960",
  Kumasi: "Q49255",
  Kwame_Nkrumah: "Q8588",
  Adinkra_symbols: "Q678002",
  Kente_cloth: "Q847541",
  Ghana_flag: "Q9645",
  Highlife_music: "Q1371819",
  Barber_shop_sign: "Q4858645",
  Offset_lithography: "Q185670",
  Screen_printing: "Q471700",
  Postage_stamp: "Q37010",
  Graphic_design: "Q185638",
  Sign_painting: "Q7513027",
  Cinema_of_Ghana: "Q1483090",
};

// ── SKOS concept scheme for categories ───────────────────────────────────────

export const CATEGORY_SKOS: Record<ArchiveItemCategory, {
  uri: string;
  broader: string;
  definition: string;
  wikidata?: string;
  relatedTerms: string[];
}> = {
  "early-print": {
    uri: "ared:EarlyPrint",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Missionary printing presses, colonial administrative printing, early vernacular typography, and the introduction of Western graphic conventions into the Gold Coast from the 1820s to 1957.",
    wikidata: "Q11936511",
    relatedTerms: ["letterpress", "mission press", "colonial administration", "vernacular typography", "Gold Coast"],
  },
  independence: {
    uri: "ared:IndependenceNationBuilding",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "State graphic identity, stamp programmes, currency design, national symbols, official portraiture, and the visual assertion of postcolonial sovereignty from 1957 onwards.",
    wikidata: "Q46197",
    relatedTerms: ["stamp", "banknote", "national symbol", "Nkrumah", "CPP", "black star", "postcolonial"],
  },
  newspapers: {
    uri: "ared:NewspapersPublishing",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Ghanaian newspaper mastheads, editorial layout, book cover design, magazine covers, educational publishing, and the typographic conventions of the Ghanaian press from the 1880s to the present.",
    wikidata: "Q11032",
    relatedTerms: ["Daily Graphic", "Ghanaian Times", "masthead", "editorial design", "book cover", "typography"],
  },
  political: {
    uri: "ared:PoliticalGraphics",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Election posters, party symbols, campaign graphics, propaganda, military government visual identity, and the design of civic and public political communication from independence to the present.",
    wikidata: "Q170737",
    relatedTerms: ["election poster", "CPP", "NDC", "NPP", "campaign", "party symbol", "propaganda"],
  },
  "cinema-posters": {
    uri: "ared:HandpaintedCinemaPosters",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Hand-painted film posters produced for Ghana's mobile VHS cinema circuit from the 1980s–1990s, characterised by enamel on flour sack or rice sack substrates and inventive composite imagery.",
    wikidata: "Q15975596",
    relatedTerms: ["VHS cinema", "flour sack", "mobile cinema", "sign painting", "enamel", "composite poster", "Accra", "Kumasi"],
  },
  "street-signage": {
    uri: "ared:StreetGraphicsSignage",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Barber shop portrait boards, chop bar signage, church banners, kiosk panels, market signs, transport lettering, and the full ecology of Ghanaian hand-painted commercial visual communication.",
    wikidata: "Q7513027",
    relatedTerms: ["barber sign", "chop bar", "sign painter", "kiosk", "trotro", "market", "enamel on board"],
  },
  music: {
    uri: "ared:MusicPopularCultureGraphics",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Highlife, hiplife, gospel and Afrobeats album covers, concert posters, event flyers, and the visual culture surrounding Ghanaian popular music from the 1950s to the present.",
    wikidata: "Q1371819",
    relatedTerms: ["highlife", "album cover", "LP sleeve", "E.T. Mensah", "event flyer", "concert poster", "Decca"],
  },
  religious: {
    uri: "ared:ReligiousVisualCulture",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Pentecostal and charismatic church banners, Catholic institutional print, Islamic visual culture, funeral posters, and the visual systems of Ghanaian religious public life.",
    wikidata: "Q9174",
    relatedTerms: ["church banner", "crusade", "funeral poster", "Pentecostal", "Islamic", "Catholic"],
  },
  textile: {
    uri: "ared:TextilePatternGraphics",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Adinkra symbols as graphic language, kente weave pattern naming, GTP wax print design, commemorative cloth, and the intersection of textile production with graphic communication.",
    wikidata: "Q847541",
    relatedTerms: ["adinkra", "kente", "wax print", "GTP", "commemorative cloth", "Ashanti", "Ntonso"],
  },
  institutional: {
    uri: "ared:InstitutionalCommercialIdentity",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Brand systems, bank and telco visual identity, university marks, state corporation logos, NGO graphics, packaging, and the development of formal graphic design practice in Ghanaian institutions.",
    wikidata: "Q185638",
    relatedTerms: ["logo", "brand", "packaging", "institutional", "bank", "telco", "NGO"],
  },
  digital: {
    uri: "ared:DigitalEraGhanaianDesign",
    broader: "ared:GhanaGraphicDesign",
    definition:
      "Social media flyer culture, digital event promotion, tech startup branding, mobile-first visual design, motion graphics, and the transformation of Ghanaian graphic design under digital-platform conditions.",
    wikidata: "Q392881",
    relatedTerms: ["social media flyer", "digital design", "startup", "mobile", "motion graphics", "Afrobeats"],
  },
};

// ── Turtle serialiser ─────────────────────────────────────────────────────────

function turtle(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function turtleDate(date: string | null): string {
  if (!date) return "";
  if (/^\d{4}$/.test(date)) return `"${date}"^^xsd:gYear`;
  if (/^\d{4}-\d{2}$/.test(date)) return `"${date}"^^xsd:gYearMonth`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `"${date}"^^xsd:date`;
  return `"${date}"^^xsd:string`;
}

function prefixBlock(): string {
  return Object.entries(PREFIXES)
    .map(([k, v]) => `@prefix ${k}: <${v}> .`)
    .join("\n");
}

// ── Generate Turtle for the collection concept scheme ────────────────────────

export function generateConceptSchemeTurtle(): string {
  const lines: string[] = [
    prefixBlock(),
    "",
    "# ── ARED Ghana Graphic Design — SKOS Concept Scheme ──────────────────────────",
    "",
    "ared:GhanaGraphicDesignScheme",
    "  a skos:ConceptScheme ;",
    `  skos:prefLabel "History of Graphic Design in Ghana"@en ;`,
    `  dcterms:description "A concept scheme for categorising the history of graphic design in Ghana, tracing visual communication from pre-colonial textile systems through colonial print, post-independence state graphics, hand-painted cinema posters, street signage, music covers, religious graphics, and contemporary digital design."@en ;`,
    `  dcterms:created "2026-07"^^xsd:gYearMonth ;`,
    `  dcterms:publisher <https://ared.design> ;`,
    `  dcterms:rights <https://creativecommons.org/licenses/by/4.0/> ;`,
    ".",
    "",
    "ared:GhanaGraphicDesign",
    "  a skos:Concept ;",
    "  skos:inScheme ared:GhanaGraphicDesignScheme ;",
    `  skos:prefLabel "Graphic Design in Ghana"@en ;`,
    `  skos:definition "The full history of visual communication practice in Ghana, from pre-colonial graphic systems through colonial print, independence-era state design, popular visual culture, and digital-era practice."@en ;`,
    `  skos:exactMatch wd:Q185638 ;`,
    `  skos:relatedMatch wd:Q117 ;`,
    ".",
    "",
  ];

  for (const [id, meta] of Object.entries(CATEGORY_SKOS) as [ArchiveItemCategory, typeof CATEGORY_SKOS[keyof typeof CATEGORY_SKOS]][]) {
    lines.push(`${meta.uri}`);
    lines.push("  a skos:Concept ;");
    lines.push("  skos:inScheme ared:GhanaGraphicDesignScheme ;");
    lines.push(`  skos:prefLabel "${CATEGORY_LABELS[id]}"@en ;`);
    lines.push(`  skos:definition "${turtle(meta.definition)}"@en ;`);
    lines.push(`  skos:broader ${meta.broader} ;`);
    if (meta.wikidata) lines.push(`  skos:exactMatch wd:${meta.wikidata} ;`);
    for (const term of meta.relatedTerms) {
      lines.push(`  skos:altLabel "${term}"@en ;`);
    }
    lines.push(".");
    lines.push("");
  }

  return lines.join("\n");
}

// ── Generate Turtle for all collection items ──────────────────────────────────

export function generateItemTurtle(item: GhanaArchiveItem): string {
  const uri = `aredo:${item.id}`;
  const catSkos = CATEGORY_SKOS[item.category];
  const licUri = LICENCE_URIS[item.licence] ?? null;

  const lines: string[] = [
    `# Item: ${item.title}`,
    `${uri}`,
    "  a schema:VisualArtwork, edm:ProvidedCHO, crm:E22_Human-Made_Object ;",
    `  dcterms:identifier "${item.id}" ;`,
    `  dcterms:title "${turtle(item.title)}"@en ;`,
  ];

  if (item.creator) lines.push(`  dcterms:creator "${turtle(item.creator)}"@en ;`);
  if (item.date) lines.push(`  dcterms:date ${turtleDate(item.date)} ;`);
  lines.push(`  schema:dateCreated "${turtle(item.date_display)}"@en ;`);

  if (item.location) lines.push(`  schema:locationCreated "${turtle(item.location)}"@en ;`);
  if (item.city) {
    const wdCity = WIKIDATA_CONCEPTS[item.city];
    if (wdCity) {
      lines.push(`  schema:locationCreated wd:${wdCity} ;`);
    }
  }

  lines.push(`  dcterms:type "${item.format}"@en ;`);
  lines.push(`  schema:artMedium "${item.medium ?? item.format}"@en ;`);
  lines.push(`  dcterms:subject ${catSkos?.uri ?? "ared:GhanaGraphicDesign"} ;`);

  for (const lang of item.language) {
    lines.push(`  dcterms:language "${lang}"@en ;`);
  }

  lines.push(`  dcterms:description "${turtle(item.description)}"@en ;`);
  if (item.cultural_context) lines.push(`  ared:culturalContext "${turtle(item.cultural_context)}"@en ;`);
  if (item.visual_features) lines.push(`  ared:visualFeatures "${turtle(item.visual_features)}"@en ;`);

  // Rights
  lines.push(`  dcterms:source "${turtle(item.source_name)}"@en ;`);
  if (item.source_url) lines.push(`  schema:isBasedOn <${item.source_url}> ;`);
  lines.push(`  dcterms:rights "${turtle(item.licence)}"@en ;`);
  if (licUri) lines.push(`  edm:rights <${licUri}> ;`);
  lines.push(`  ared:rightsStatus ared:${toPascalCase(item.rights_status)} ;`);
  if (item.rights_note) lines.push(`  ared:rightsNote "${turtle(item.rights_note)}"@en ;`);

  // Media
  if (item.image_url) lines.push(`  schema:image <${item.image_url}> ;`);
  if (item.thumbnail_url) lines.push(`  schema:thumbnailUrl <${item.thumbnail_url}> ;`);
  if (item.external_link) lines.push(`  schema:url <${item.external_link}> ;`);

  // Tags as SKOS
  for (const tag of item.tags) {
    lines.push(`  schema:keywords "${tag}"@en ;`);
  }

  if (item.curatorial_note) lines.push(`  ared:curatorialNote "${turtle(item.curatorial_note)}"@en ;`);
  lines.push(`  ared:verificationStatus ared:${toPascalCase(item.verification_status)} ;`);
  lines.push(`  dcterms:isPartOf ared:GhanaGraphicDesignCollection ;`);
  lines.push(`  dcterms:created "${new Date().toISOString().slice(0, 10)}"^^xsd:date ;`);

  lines.push(".");
  return lines.join("\n  ").replace(/\n  \./g, "\n.") + "\n";
}

function toPascalCase(s: string): string {
  return s.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}

// ── Full collection Turtle export ─────────────────────────────────────────────

export function generateCollectionTurtle(): string {
  const sections: string[] = [
    prefixBlock(),
    "",
    "# ═══════════════════════════════════════════════════════════════════════════",
    "# ARED — History of Graphic Design in Ghana",
    "# RDF/Turtle serialisation",
    "# Vocabularies: Dublin Core, Schema.org, SKOS, Europeana EDM, CIDOC-CRM,",
    "#               Wikidata, Creative Commons",
    "# Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/",
    "# Publisher: ARED Design — https://ared.design",
    "# ═══════════════════════════════════════════════════════════════════════════",
    "",
    "# ── Collection resource ──────────────────────────────────────────────────────",
    "",
    "ared:GhanaGraphicDesignCollection",
    "  a schema:Collection, edm:ProvidedCHO ;",
    `  dcterms:title "${GHANA_COLLECTION_META.title}"@en ;`,
    `  dcterms:description "${turtle(GHANA_COLLECTION_META.description)}"@en ;`,
    `  schema:about wd:${WIKIDATA_CONCEPTS.Ghana} ;`,
    `  schema:locationCreated wd:${WIKIDATA_CONCEPTS.Ghana} ;`,
    `  dcterms:publisher <https://ared.design> ;`,
    `  dcterms:rights <https://creativecommons.org/licenses/by/4.0/> ;`,
    `  schema:numberOfItems "${GHANA_COLLECTION_ITEMS.length}"^^xsd:integer ;`,
    `  schema:url <https://ared.design/collections/ghana-graphic-design> ;`,
    ".",
    "",
    "# ── SKOS Concept Scheme ──────────────────────────────────────────────────────",
    "",
    generateConceptSchemeTurtle(),
    "",
    "# ── Rights status vocabulary ─────────────────────────────────────────────────",
    "",
    "ared:OpenIngest a ared:RightsStatus ; rdfs:label \"Open Ingest\"@en ; rdfs:comment \"Licence is CC or Public Domain — image stored and displayed.\"@en .",
    "ared:MetadataOnly a ared:RightsStatus ; rdfs:label \"Metadata Only\"@en ; rdfs:comment \"No image stored — descriptive metadata only.\"@en .",
    "ared:LinkedRecord a ared:RightsStatus ; rdfs:label \"Linked Record\"@en ; rdfs:comment \"Citation card and external link only — no media copied.\"@en .",
    "ared:PermissionRequired a ared:RightsStatus ; rdfs:label \"Permission Required\"@en ; rdfs:comment \"Rights held by artist, collector or institution — permission pending.\"@en .",
    "ared:PermissionGranted a ared:RightsStatus ; rdfs:label \"Permission Granted\"@en ; rdfs:comment \"Written permission received — image stored.\"@en .",
    "",
    "# ── Archive items ────────────────────────────────────────────────────────────",
    "",
  ];

  for (const item of GHANA_COLLECTION_ITEMS) {
    sections.push(generateItemTurtle(item));
  }

  return sections.join("\n");
}

// ── JSON-LD for individual item pages ─────────────────────────────────────────

export function generateItemJsonLd(item: GhanaArchiveItem, baseUrl = "https://ared.design"): object {
  const licUri = LICENCE_URIS[item.licence] ?? null;

  return {
    "@context": {
      "@vocab": "https://schema.org/",
      dcterms: "http://purl.org/dc/terms/",
      edm: "http://www.europeana.eu/schemas/edm/",
      ared: "https://ared.design/vocab#",
      skos: "http://www.w3.org/2004/02/skos/ns#",
    },
    "@type": ["VisualArtwork", "CreativeWork"],
    "@id": `${baseUrl}/collections/ghana-graphic-design/${item.id}`,
    name: item.title,
    description: item.description,
    creator: item.creator ? { "@type": "Person", name: item.creator } : undefined,
    dateCreated: item.date ?? undefined,
    artMedium: item.medium ?? undefined,
    artworkSurface: item.format,
    locationCreated: item.location
      ? {
          "@type": "Place",
          name: item.location,
          addressCountry: "GH",
        }
      : undefined,
    inLanguage: item.language,
    keywords: item.tags,
    license: licUri ?? undefined,
    acquireLicensePage: item.external_link ?? undefined,
    contentUrl: item.image_url ?? undefined,
    thumbnailUrl: item.thumbnail_url ?? undefined,
    isPartOf: {
      "@type": "Collection",
      "@id": `${baseUrl}/collections/ghana-graphic-design`,
      name: "History of Graphic Design in Ghana",
    },
    provider: {
      "@type": "Organization",
      name: item.source_name,
      url: item.source_url ?? undefined,
    },
    "ared:rightsStatus": item.rights_status,
    "ared:rightsNote": item.rights_note ?? undefined,
    "ared:curatorialNote": item.curatorial_note ?? undefined,
    "dcterms:subject": {
      "@type": "skos:Concept",
      "skos:prefLabel": CATEGORY_LABELS[item.category],
    },
  };
}

// ── Genealogy tree ────────────────────────────────────────────────────────────
// The deep lineage of Ghanaian graphic design — for the timeline and RDF

export const GHANA_DESIGN_GENEALOGY = [
  {
    era: "Pre-colonial",
    period: "Before 1820",
    thread: "Indigenous visual systems",
    events: [
      { year: "c. 1400s", event: "Adinkra symbol system emerges among the Akan/Ashanti as stamped cloth philosophy" },
      { year: "c. 1600s", event: "Kente weave pattern naming — each named pattern a visual text encoding social meaning" },
      { year: "c. 1700s", event: "Brass goldweight casting — geometric surface design as economic and philosophical communication" },
      { year: "c. 1750s", event: "Nsibidi-related marking systems in southern Ghana — early ideographic communication" },
    ],
  },
  {
    era: "Colonial print",
    period: "1820–1900",
    thread: "Mission press and colonial administration",
    events: [
      { year: "1828", event: "Basel Mission Press established at Christiansborg (Accra) — first sustained printing operation in Ghana" },
      { year: "1843", event: "Wesleyan Methodist Mission Press begins printing in Cape Coast — first Fante-language typography" },
      { year: "1875", event: "Basel Mission issues Twi-language illustrated New Testament — vernacular typesetting milestone" },
      { year: "1885", event: "Gold Coast Methodist Times — first newspaper designed and printed locally" },
      { year: "1898", event: "Gold Coast Aborigines — J.E. Casely Hayford's nationalist newspaper; early Ghanaian editorial design" },
    ],
  },
  {
    era: "Early press era",
    period: "1900–1947",
    thread: "African-owned newspapers and commercial printing",
    events: [
      { year: "1902", event: "The Gold Coast Leader founded — multiple competing newspapers drive typographic development" },
      { year: "1918", event: "The Gold Coast Independent — editorial design introduces photo-halftone printing" },
      { year: "1935", event: "African Morning Post (Accra) — I.T.A. Wallace-Johnson; anti-colonial editorial typography" },
      { year: "1940", event: "Commercial sign painting tradition established in Accra and Kumasi — enamel on board" },
      { year: "1946", event: "Achimota College Press — educational publishing design conventions set" },
    ],
  },
  {
    era: "Nationalist design",
    period: "1947–1957",
    thread: "Anti-colonial political graphics and popular print",
    events: [
      { year: "1948", event: "CPP Evening News founded — first mass-produced nationalist newspaper with political graphic identity" },
      { year: "1950", event: "Daily Graphic launched under Mirror Group — industrial newspaper production begins" },
      { year: "1952", event: "CPP rooster symbol designed — Ghana's first mass-reproduced party political mark" },
      { year: "1954", event: "First local highlife record covers designed — E.E. Lamptey establishes photography/design practice" },
      { year: "1956", event: "E.T. Mensah / Tempos Decca records — defining Ghanaian album sleeve conventions" },
    ],
  },
  {
    era: "Independence wave",
    period: "1957–1966",
    thread: "State graphic identity and institutional design",
    events: [
      { year: "1957", event: "Ghana independence stamps issued (Harrison & Sons) — first comprehensive national graphic design commission" },
      { year: "1957", event: "Ghana flag design adopted — Theodosia Salome Okoh designs the national flag" },
      { year: "1957", event: "Coat of Arms of Ghana designed — state heraldic identity" },
      { year: "1957", event: "Ghanaian Times launched — state newspaper with distinctive masthead typography" },
      { year: "1958", event: "Ghana Broadcasting Corporation visual identity established" },
      { year: "1959", event: "Ambassador Records Manufacturing Company — first local record label and sleeve design" },
      { year: "1962", event: "Bank of Ghana currency redesign — Ghanaian national symbols replace colonial motifs" },
      { year: "1963", event: "Spark magazine — CPP theoretical journal; sophisticated editorial design" },
      { year: "1965", event: "Nkrumah portrait poster tradition at peak — state portraiture as graphic system" },
    ],
  },
  {
    era: "Post-Nkrumah era",
    period: "1966–1979",
    thread: "Military graphics, highlife covers, commercial sign painting",
    events: [
      { year: "1966", event: "NLC military government — new state visual identity, suppression of CPP graphic tradition" },
      { year: "1969", event: "Second Republic — Progress Party election graphics introduce multi-party design competition" },
      { year: "1970", event: "Highlife album cover golden age — local labels commission elaborate photographic sleeves" },
      { year: "1972", event: "Osibisa first album cover (UK) — Ghanaian band brings African visual identity to global rock design" },
      { year: "1973", event: "GTP (Ghana Textile Printing) wax print design programme expands — commemorative cloths produced" },
      { year: "1975", event: "Barber shop sign painting tradition reaches peak — wayside artists in every Ghanaian market" },
      { year: "1977", event: "Ebo Taylor Love and Death LP — high point of Ghanaian record sleeve design" },
    ],
  },
  {
    era: "VHS and street era",
    period: "1980–1995",
    thread: "Mobile cinema posters, church banners, political graphics",
    events: [
      { year: "1982", event: "PNDC military government — revolutionary graphics, propaganda posters" },
      { year: "1983", event: "Mobile VHS cinema circuits emerge in Greater Accra — hand-painted posters on flour sacks begin" },
      { year: "1985", event: "Cinema poster tradition fully established — Kumasi and Accra artists develop distinct regional styles" },
      { year: "1988", event: "Pentecostal church banner design explodes — vivid outdoor religious visual culture" },
      { year: "1990", event: "Composite cinema poster convention — artists combine characters from multiple films into invented scenes" },
      { year: "1992", event: "Fourth Republic — NDC, NPP, and multiple parties produce Ghana's most competitive election graphics" },
      { year: "1993", event: "International collectors begin acquiring Ghanaian cinema posters — gallery circuit begins" },
    ],
  },
  {
    era: "Desktop publishing era",
    period: "1995–2010",
    thread: "Digital transition, funeral posters, hiplife",
    events: [
      { year: "1996", event: "Desktop publishing arrives in Accra print shops — Corel Draw and Photoshop replace hand-lettering" },
      { year: "1998", event: "Digitally printed vinyl banners replace some painted church signage — analogue/digital coexistence" },
      { year: "2000", event: "Hiplife era — Reggie Rockstone and contemporaries commission a new digital Ghanaian album aesthetic" },
      { year: "2002", event: "Funeral poster design becomes digitised — photography + type on vinyl becomes dominant form" },
      { year: "2005", event: "First dedicated Ghanaian graphic design studios — formal design practice emerges in Accra" },
      { year: "2007", event: "Ghana@50 commemorative design programme — largest state graphic commission since independence" },
      { year: "2007", event: "mPedigree founded — first Ghanaian tech startup to commission premium brand design" },
    ],
  },
  {
    era: "Digital visual culture",
    period: "2010–present",
    thread: "Social media flyer, Afrobeats, pan-African design community",
    events: [
      { year: "2012", event: "Mobile internet penetration drives social media flyer design — Photoshop self-taught designers" },
      { year: "2015", event: "Accra Design Week founded — first formal event for Ghanaian graphic design community" },
      { year: "2016", event: "NPP election social media graphics — first election won partly through digital visual design" },
      { year: "2018", event: "Afrobeats visual identity globalises — Ghanaian designers work across African music diasporas" },
      { year: "2020", event: "Year of Return visual identity — Ghana Tourism Authority commissions major brand design" },
      { year: "2022", event: "Pan-African type design movement — Ghanaian designers contribute to African type revival" },
      { year: "2024", event: "ARED archive project begins — systematic collection of Ghana graphic design history" },
    ],
  },
] as const;
