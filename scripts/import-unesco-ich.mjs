import fs from "node:fs/promises";
import path from "node:path";

const DATASET_URL =
  "https://data.unesco.org/api/explore/v2.1/catalog/datasets/ich001";
const RECORDS_URL = `${DATASET_URL}/records`;
const COUNTRY_METADATA_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";
const OUTPUT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "unesco-ich-records.json",
);

const COUNTRY_REGION_OVERRIDES = new Map([
  ["AQ", { country: "Antarctica", region: "Global", subregion: "Antarctica" }],
  ["XK", { country: "Kosovo", region: "Europe", subregion: "Southern Europe" }],
]);

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSummary(value, max = 340) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max - 1);
  const boundary = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("; "),
    sliced.lastIndexOf(", "),
    sliced.lastIndexOf(" "),
  );
  return `${sliced.slice(0, boundary > 180 ? boundary : max - 1).trim()}...`;
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function parseJsonish(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sourceTypeFromAcronym(acronym, label) {
  if (acronym === "USL") return "UNESCO urgent safeguarding list";
  if (acronym === "GSP") return "UNESCO good safeguarding practice";
  if (acronym === "RL") return "UNESCO representative list";
  return label || "UNESCO intangible cultural heritage element";
}

function normalizeAredRegion(region, subregion) {
  if (region === "Africa") return "Africa";
  if (region === "Europe") return "Europe";
  if (region === "Oceania") return "Pacific";
  if (region === "Americas") {
    return subregion === "Northern America"
      ? "North America"
      : "Latin America and Caribbean";
  }
  if (region === "Asia") {
    if (subregion === "Southern Asia") return "South Asia";
    if (subregion === "South-eastern Asia") return "Southeast Asia";
    if (subregion === "Eastern Asia") return "East Asia";
    if (subregion === "Central Asia") return "Central Asia";
    if (subregion === "Western Asia") return "Middle East";
    return "Asia and the Pacific";
  }
  return region || "Global";
}

const REGION_CENTRES = {
  Africa: { lat: 1.6, lng: 17.5 },
  Australia: { lat: -25.3, lng: 133.8 },
  "Aotearoa New Zealand": { lat: -41.2, lng: 174.8 },
  Pacific: { lat: -12.5, lng: 170.0 },
  "North America": { lat: 45.0, lng: -100.0 },
  "Latin America and Caribbean": { lat: -13.0, lng: -63.0 },
  "South Asia": { lat: 22.0, lng: 78.0 },
  "Southeast Asia": { lat: 10.0, lng: 106.0 },
  "East Asia": { lat: 35.0, lng: 104.0 },
  "Central Asia": { lat: 43.0, lng: 68.0 },
  "Middle East": { lat: 29.0, lng: 44.0 },
  Europe: { lat: 50.0, lng: 10.0 },
  Arctic: { lat: 68.0, lng: -40.0 },
  "Global Diasporas": { lat: 0.0, lng: 0.0 },
  Global: { lat: 0.0, lng: 0.0 },
};

function categoriesFromConcepts(primary, secondary, title) {
  const concepts = unique([...primary, ...secondary, title]);
  const text = concepts.join(" ").toLowerCase();
  const categories = [];

  if (/dance|music|song|chant|theatre|performance|festival|carnival|procession|mask|puppet|drama/.test(text)) {
    categories.push("Music, Performance and Oral Literature");
  }
  if (/oral|epic|story|storytelling|language|poetry|memory|legend|narrative|calligraphy|letter/.test(text)) {
    categories.push("Language, Story and Memory");
  }
  if (/craft|weav|textile|pottery|ceramic|wood|metal|silver|gold|embroidery|lacemak|instrument|boat|building|construction|architecture/.test(text)) {
    categories.push("Material Culture, Design and Technology");
  }
  if (/agricultur|food|bread|wine|cuisine|coffee|tea|date palm|irrigation|seasonal|harvest|fishing|pastoral|herding|water/.test(text)) {
    categories.push("Food, Agriculture and Seasonal Practice");
  }
  if (/medicine|healing|midwifery|health|care|therapy/.test(text)) {
    categories.push("Health, Healing and Care");
  }
  if (/law|customary|governance|council|mediation|justice|ethic|peace/.test(text)) {
    categories.push("Law, Governance and Ethics");
  }
  if (/ritual|religious|spiritual|sacred|pilgrimage|cosmolog|ceremony|prayer/.test(text)) {
    categories.push("Ceremony, Spirituality and Cosmology");
  }
  if (/ecolog|nature|forest|sea|sky|navigation|land|environment|animal|tracking/.test(text)) {
    categories.push("Land, Sea, Sky and Ecology");
  }
  if (/migration|diaspora|urban|city|market|trade/.test(text)) {
    categories.push("Migration, Diaspora and Urban Life");
  }

  categories.push("Ways of Knowing and Knowledge Transmission");
  return unique(categories);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function fetchAllRecords() {
  const first = await fetchJson(`${RECORDS_URL}?limit=100&offset=0`);
  const total = first.total_count ?? first.totalCount ?? first.results?.length ?? 0;
  const records = [...(first.results ?? [])];
  for (let offset = records.length; offset < total; offset += 100) {
    const page = await fetchJson(`${RECORDS_URL}?limit=100&offset=${offset}`);
    records.push(...(page.results ?? []));
  }
  return records;
}

async function fetchCountryLookup(codes) {
  const lookup = new Map(COUNTRY_REGION_OVERRIDES);
  const wanted = new Set(codes.filter((code) => !lookup.has(code)));
  if (!wanted.size) return lookup;

  const countries = await fetchJson(COUNTRY_METADATA_URL);
  for (const country of countries) {
    const code = country["alpha-2"];
    if (!wanted.has(code)) continue;
    lookup.set(code, {
      country: country.name ?? code,
      region: country.region || "Global",
      subregion: country["sub-region"] || "",
    });
  }

  return lookup;
}

function mapRecord(record, countryLookup, importDate) {
  const countryCodes = Array.isArray(record.countries) ? record.countries : [];
  const countryMeta = countryCodes
    .map((code) => countryLookup.get(code))
    .filter(Boolean);
  const countries = unique(countryMeta.map((item) => item.country));
  const subregions = unique(countryMeta.map((item) => item.subregion));
  const regions = unique(
    countryMeta.map((item) => normalizeAredRegion(item.region, item.subregion)),
  );
  const primaryConcepts = Array.isArray(record.concepts_primary_names)
    ? record.concepts_primary_names
    : parseJsonish(record.concepts_primary).map((item) => item.name_en);
  const secondaryConcepts = Array.isArray(record.concepts_secondary_names)
    ? record.concepts_secondary_names
    : parseJsonish(record.concepts_secondary).map((item) => item.name_en);
  const whcSites = Array.isArray(record.whc_sites)
    ? record.whc_sites
    : parseJsonish(record.whc_sites).map((item) => item.name_en || item.name);
  const videos = parseJsonish(record.videos);
  const images = parseJsonish(record.images);
  const title = cleanText(record.title_en) || cleanText(record.title_fr) || `UNESCO ICH ${record.ich_public_ref}`;
  const sourceUrl = cleanText(record.http_url_en) || cleanText(record.http_url_fr);
  const publicRef = cleanText(record.ich_public_ref);
  const slug = `unesco-ich-${publicRef}-${slugify(title).slice(0, 80)}`;
  const type = sourceTypeFromAcronym(record.type_acronym, record.type_of_element_en);
  const categories = categoriesFromConcepts(primaryConcepts, secondaryConcepts, title);
  const relationships = unique([
    ...primaryConcepts,
    ...secondaryConcepts.slice(0, 8),
    type,
    ...whcSites.map((site) => `World Heritage connection: ${site}`),
  ]).slice(0, 18);

  const aredRegion =
    regions.length === 1 ? regions[0] : regions.length > 1 ? "Global Diasporas" : "Global";
  const regionCentre = REGION_CENTRES[aredRegion] ?? REGION_CENTRES.Global;

  return {
    slug,
    title,
    preferredTitle: cleanText(record.title_fr) || undefined,
    type,
    summary: truncateSummary(record.description_en || record.description_fr),
    overview: [
      truncateSummary(record.description_en || record.description_fr, 900),
      "This record is imported from the UNESCO Intangible Cultural Heritage public dataset as discovery metadata. ARED has not independently verified community authority, access protocols or local naming beyond the source record.",
    ],
    community: countries.length ? countries : ["Community not specified in imported dataset"],
    languages: ["Not specified in UNESCO dataset"],
    region: aredRegion,
    subregion: subregions.length === 1 ? subregions[0] : undefined,
    countries,
    culturalTerritories: countries.length ? countries : ["Not specified"],
    categories,
    periods: record.inscription_year
      ? [`Inscribed ${cleanText(record.inscription_year)}`]
      : ["Inscription year not specified"],
    relationships,
    sourceIds: ["unesco-intangible-cultural-heritage"],
    verificationStatus: "source-supported",
    culturalAccess: "context-required",
    publicationStatus: "published",
    lastReviewed: importDate,
    coordinates: {
      label: countries.length ? countries.join(", ") : aredRegion,
      lat: regionCentre.lat,
      lng: regionCentre.lng,
      precision: "regional",
    },
    sourceNote:
      "Imported from UNESCO DataHub dataset ich001. Field-level provenance is retained in the record metadata.",
    culturalCare:
      "Use this as public discovery metadata only. It does not replace community authority or local access protocols.",
    limitations: [
      "Community names, languages and access protocols may need enrichment from local/community sources.",
      "Country metadata reflects the UNESCO record and may not represent all communities, territories or diasporic contexts.",
    ],
    externalIdentifier: publicRef,
    externalUuid: cleanText(record.uuid),
    externalSourceName: "UNESCO Intangible Heritage List",
    sourceUrl,
    rights: {
      label: "Open Access",
      url: "https://www.unesco.org/en/open-access",
      rightsStatement:
        "UNESCO DataHub metadata lists the dataset licence as Open Access. Check individual UNESCO pages before media reuse.",
    },
    importedAt: importDate,
    fieldProvenance: {
      title: "UNESCO DataHub field title_en",
      preferredTitle: "UNESCO DataHub field title_fr",
      summary: "UNESCO DataHub field description_en",
      type: "UNESCO DataHub fields type_of_element_en and type_acronym",
      countries:
        "UNESCO DataHub field countries, ISO codes resolved with ISO-3166 regional metadata",
      categories:
        "ARED category inference from UNESCO concepts_primary_names, concepts_secondary_names and title",
      relationships:
        "UNESCO concepts_primary_names, concepts_secondary_names, type fields and World Heritage links",
      sourceUrl: "UNESCO DataHub field http_url_en",
      rights: "UNESCO DataHub dataset metadata license and license_url",
    },
    original: {
      uuid: record.uuid,
      ich_public_ref: record.ich_public_ref,
      inscription_year: record.inscription_year,
      title_en: record.title_en,
      title_fr: record.title_fr,
      type_of_element_en: record.type_of_element_en,
      type_acronym: record.type_acronym,
      countries: record.countries,
      http_url_en: record.http_url_en,
      concepts_primary_names: primaryConcepts,
      concepts_secondary_names: secondaryConcepts,
      main_image_url: record.main_image_url,
      main_image_caption_en: record.main_image_caption_en,
      main_image_copyright: record.main_image_copyright,
      main_image_author: record.main_image_author,
      videos: videos.map((video) => video.link).filter(Boolean),
      images,
    },
    image: record.main_image_url
      ? {
          url: record.main_image_url,
          alt: cleanText(record.main_image_caption_en) || title,
          credit: unique([
            record.main_image_author,
            record.main_image_copyright,
            "UNESCO",
          ]).join(" / "),
        }
      : undefined,
  };
}

async function main() {
  const dataset = await fetchJson(DATASET_URL);
  const records = await fetchAllRecords();
  const importDate = new Date().toISOString().slice(0, 10);
  const countryCodes = unique(records.flatMap((record) => record.countries ?? []));
  const countryLookup = await fetchCountryLookup(countryCodes);
  const mappedRecords = records
    .map((record) => mapRecord(record, countryLookup, importDate))
    .sort((a, b) => a.title.localeCompare(b.title));

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        source: {
          datasetId: "ich001",
          title: dataset.metas?.default?.title_en ?? "Intangible Heritage List",
          publisher: "UNESCO",
          apiUrl: RECORDS_URL,
          datasetUrl: "https://data.unesco.org/explore/assets/ich001/",
          recordsCount: mappedRecords.length,
          license: dataset.metas?.default?.license ?? "Open Access",
          licenseUrl:
            dataset.metas?.default?.license_url_en ??
            "https://www.unesco.org/en/open-access",
          modified: dataset.metas?.default?.modified ?? null,
        },
        records: mappedRecords,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Imported ${mappedRecords.length} UNESCO ICH records to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
