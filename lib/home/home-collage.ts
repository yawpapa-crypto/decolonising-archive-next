import { europeanaStream } from "./europeana";
import { takeFresh, type DiscoverItem } from "./discover-shared";
import { editorialPhoto } from "@/lib/media/unsplash";
import "server-only";
import { unstable_cache } from "next/cache";

import { GHANA_COLLECTION_ITEMS } from "@/lib/data/ghana-collection";
import { searchSmithsonianRecords } from "@/lib/search/smithsonian";
import { commonsStream } from "./providers";
import { featuredDate, featuredOrder, featuredProviderPage, featuredTopics, unit } from "./featured";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { allowed, hydrate } from "@/lib/recommendations/catalogue";

/**
 * Image supply for the glocal homepage.
 *
 * "local"  = ARED's own Ghana graphic-design catalogue (the anchor).
 * "global" = open-access museum collections (the echo): Art Institute of
 *            Chicago, Smithsonian Open Access, Europeana.
 *
 * All API keys stay on the server. Every upstream call is cached for an hour
 * and any failure degrades to a small verified fallback set, so the page never
 * renders empty.
 */

export type CollageOrigin = "local" | "global";

export type CollageTile = Pick<DiscoverItem, "institution" | "dataProvider" | "provider" | "country" | "subjects" | "rights" | "recordId" | "originalRecordUrl" | "originalImage" | "previewImage" | "imageRole" | "authors" | "year" | "abstract" | "oa"> & {
  id: string;
  origin: CollageOrigin;
  src: string;
  alt: string;
  title: string;
  /** Short institution / source label, e.g. "Art Institute of Chicago". */
  source: string;
  /** Where a visitor should land when they open the tile. */
  href: string;
  licence: string;
  photographer?: string;
  credit?: string;
  downloadLocation?: string;
};

export type HomeCollage = {
  local: CollageTile[];
  global: CollageTile[];
  /** Which upstream sources actually answered (useful for diagnostics). */
  live: { aic: boolean; smithsonian: boolean; europeana: boolean };
  /** True when too few live images came back and the verified fallback was topped up. */
  usedFallback: boolean;
};

const REVALIDATE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 6000;
const AIC_IIIF = "https://www.artic.edu/iiif/2";

/* ----------------------------------------------------------------------- */
/* Local anchor                                                             */
/* ----------------------------------------------------------------------- */

/** Human remains are not decoration. Keep them out of the floating field and the large placements. */
const SENSITIVE = /\b(skull|cranium|crania|skeleton|bones?|remains|mortuary|burial|corpse|mummy|mummies)\b/i;
const isSensitive = (t: { title?: string; alt?: string }) => SENSITIVE.test(`${t.title ?? ""} ${t.alt ?? ""}`);

/** Wikimedia now only serves standard thumbnail widths; 150px/200px requests return 400. */
function standardThumb(src: string): string {
  return src.replace(/(upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+?\/)(\d+)px-([^/?]+)/, (_m, head, _w, name) => `${head}500px-${name}`);
}

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** ARED's own catalogue, live: the day's Featured selection (with images) — changes daily, no repeats with yesterday. */
function catalogueTiles(day: string): CollageTile[] {
  const pool = loadCatalogueRecords().filter(allowed);
  const { main, rest } = featuredOrder(pool.map((r) => ({ id: r.id, region: r.region, periodId: r.periodId, recordType: r.recordType, visualSystemId: r.visualSystemId, institution: r.institutionOrCollection, record: r })), day, { perDay: 24 });
  return [...main, ...rest].flatMap(({ record }) => {
    const h = hydrate(record);
    if (!h.image) return [];
    return [{
      id: `ared-cat-${record.id}`, origin: "local" as const, src: standardThumb(h.image), alt: h.title, title: h.title,
      source: record.institutionOrCollection || record.sourceName || "ARED catalogue", href: `/records/${encodeURIComponent(record.id)}`,
      licence: record.rightsStatus || "",
    }];
  }).slice(0, 30);
}

/** Live Wikimedia Commons photography of Ghana and West Africa; topics rotate by date, never yesterday's. */
const COMMONS_TOPICS = ["Accra street", "Kumasi market", "Kente weaving", "Cape Coast Ghana", "Ghana architecture", "Adinkra cloth", "Ghana festival", "Elmina Ghana", "Tamale Ghana", "Bolgatanga basket", "Ghana fishing boats", "Lagos street", "Dakar architecture", "Ouagadougou", "Lome market", "Ghana textile market", "Akwasidae", "Ghana sign painting"];
async function fetchCommons(day: string): Promise<CollageTile[]> {
  const topics = featuredTopics(COMMONS_TOPICS, day, 4);
  const batches = await Promise.allSettled(topics.map((t) => commonsStream(featuredProviderPage(COMMONS_TOPICS, day, t), t, 10)));
  return batches.flatMap((b) => (b.status === "fulfilled" ? b.value : [])).filter((i) => i.image).map((i) => ({
    ...i, origin: "local" as const, src: standardThumb(i.image!), alt: i.alt || i.title, title: i.title,
    source: "Wikimedia Commons", href: i.href || i.originalRecordUrl || "", licence: i.licence || "Wikimedia Commons licence",
  }));
}

function localTiles(): CollageTile[] {
  return GHANA_COLLECTION_ITEMS.filter(
    (item) =>
      Boolean(item.image_url) &&
      item.rights_status !== "permission_required" &&
      item.verification_status !== "unverified",
  ).map((item): CollageTile => ({
    id: `ared-${item.id}`,
    origin: "local" as const,
    src: standardThumb(item.thumbnail_url || (item.image_url as string)),
    alt: `${item.title}${item.date_display ? `, ${item.date_display}` : ""}`,
    title: item.title,
    source: item.source_name,
    href: `/collections/ghana-graphic-design/${encodeURIComponent(item.id)}`,
    licence: item.licence,
  }));
}

/** Contemporary editorial photos stay on the Unsplash CDN with source attribution. */
async function photoTiles(): Promise<CollageTile[]> {
  const photos = await Promise.all(["Ghana coast architecture", "library books", "Accra Ghana street", "Ghana textiles", "African architecture", "Senegal art", "Kenya landscape", "African craft", "Kumasi market", "Dakar architecture", "Lagos street photography", "African textile weaving", "Nairobi city", "Cape Coast Ghana boats"].map(editorialPhoto));
  return photos.flatMap(p => p ? [{
    id: `unsplash-${p.id}`, origin: "local" as const, src: p.src, alt: p.alt,
    title: `Photograph by ${p.photographer}`, source: "Unsplash", href: p.page,
    licence: "Unsplash licence", photographer: p.photographer, credit: p.credit,
    downloadLocation: p.downloadLocation,
  }] : []);
}

/* ----------------------------------------------------------------------- */
/* Art Institute of Chicago                                                 */
/* ----------------------------------------------------------------------- */

/** Verified public-domain objects, used when the live API is unreachable. */
const AIC_FALLBACK: Array<{ id: number; image: string; title: string }> = [
  { id: 155988, image: "d5a271dc-cb9e-4040-561d-158956db94d4", title: "Royal Chair (Akonkromfi)" },
  { id: 193106, image: "11780ee9-eab6-fe12-122c-f49fdd494d57", title: "Goldweight Depicting a Geometric Shape" },
  { id: 55214, image: "15df337b-d341-eb4f-0a5f-72dc3a98d9fe", title: "Goldweight with a Geometric Design" },
  { id: 193083, image: "51395c39-61e9-6700-7610-683e312e38d0", title: "Goldweight in the Form of a Geometric Shape" },
  { id: 193092, image: "8b1e8eec-b861-1dce-604c-a5d9b891deb8", title: "Goldweight with a Geometric Pattern" },
];

function aicTile(id: number, imageId: string, title: string, detail?: string): CollageTile {
  return {
    id: `aic-${id}`,
    origin: "global",
    src: `${AIC_IIIF}/${imageId}/full/480,/0/default.jpg`,
    alt: detail ? `${title}, ${detail}` : title,
    title,
    source: "Art Institute of Chicago",
    href: `https://www.artic.edu/artworks/${id}`,
    licence: "CC0 public domain",
  };
}

type AicSearchResponse = {
  data?: Array<{
    id: number;
    title?: string;
    image_id?: string | null;
    artist_title?: string | null;
    place_of_origin?: string | null;
    date_display?: string | null;
  }>;
};

const AIC_QUERIES = [
  "Asante Ghana",
  "goldweight",
  "Yoruba Nigeria",
  "Benin Nigeria",
  "Kuba Congo textile",
  "Zulu South Africa",
  "Maori New Zealand",
  "Andean textile Peru",
  "Mexico textile",
  "India textile",
  "Ethiopia manuscript",
  "Senegal Mali",
];

async function fetchAic(day = featuredDate()): Promise<CollageTile[]> {
  const n = dayNumber(day);
  const batches = await Promise.allSettled(
    featuredTopics(AIC_QUERIES, day, 6).map(async (q, k) => {
      const url = new URL("https://api.artic.edu/api/v1/artworks/search");
      url.searchParams.set("q", q);
      url.searchParams.set("query[term][is_public_domain]", "true");
      url.searchParams.set(
        "fields",
        "id,title,image_id,artist_title,place_of_origin,date_display",
      );
      url.searchParams.set("limit", "10");
      url.searchParams.set("page", String(1 + ((n + k) % 5)));
      const res = await fetch(url, {
        headers: { Accept: "application/json", "AIC-User-Agent": "ared.design (decolonising archive)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      });
      if (!res.ok) throw new Error(`AIC ${res.status}`);
      const json = (await res.json()) as AicSearchResponse;
      return (json.data ?? [])
        .filter((row) => row.image_id && row.title)
        .map((row) =>
          aicTile(
            row.id,
            row.image_id as string,
            row.title as string,
            [row.place_of_origin, row.date_display].filter(Boolean).join(", "),
          ),
        );
    }),
  );
  return batches.flatMap((b) => (b.status === "fulfilled" ? b.value : []));
}

/* ----------------------------------------------------------------------- */
/* Smithsonian Open Access                                                  */
/* ----------------------------------------------------------------------- */

async function fetchSmithsonian(): Promise<CollageTile[]> {
  if (!process.env.SMITHSONIAN_API_KEY?.trim()) return [];
  const queries = ["Ghana textile", "Yoruba sculpture", "Maori carving", "African mask", "Zulu beadwork"];
  const batches = await Promise.allSettled(
    queries.map((query) =>
      searchSmithsonianRecords({ query, rows: 8, media: "image", sort: "relevancy" }),
    ),
  );
  const tiles: CollageTile[] = [];
  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue;
    for (const row of batch.value.results) {
      if (!row.imageUrl || !row.openAccess) continue;
      tiles.push({
        id: row.id,
        origin: "global",
        src: row.imageUrl,
        alt: row.title,
        title: row.title,
        source: row.unitCode ? `Smithsonian · ${row.unitCode}` : "Smithsonian Open Access",
        href: row.url,
        licence: "CC0",
      });
    }
  }
  return tiles;
}

/* ----------------------------------------------------------------------- */
/* Europeana                                                                */
/* ----------------------------------------------------------------------- */

async function fetchEuropeana(day = featuredDate()): Promise<CollageTile[]> {
  const items = await europeanaStream(1 + (dayNumber(day) % 6), "(Africa OR Ghana OR Yoruba OR Asante) AND TYPE:IMAGE", 40, true);
  // Decorative homepage use stays limited to explicitly open licences.
  return items.filter(i => i.oa === true && i.image).map(i => ({
    ...i, origin: "global" as const, src: i.image!, alt: i.alt || i.title,
    source: "Europeana", licence: i.licence || "",
  }));
}

/* ----------------------------------------------------------------------- */
/* Public API                                                               */
/* ----------------------------------------------------------------------- */

/** Round-robin merge so no single institution dominates the collage. */
function interleave<T>(...lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i += 1) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

/** Changes once an hour, matching the fetch cache window. */
function hourSeed() {
  return Math.floor(Date.now() / (REVALIDATE_SECONDS * 1000));
}

/** Deterministic shuffle (mulberry32) so a given hour always shows the same wall. */
function seededShuffle<T>(list: T[], seed: number): T[] {
  const out = [...list];
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dedupe(tiles: CollageTile[]): CollageTile[] {
  const seen = new Set<string>();
  return tiles.filter(t => takeFresh({ ...t, kind: "image", image: t.src }, seen));
}

/** Throw on an outage so Next retains the last successful revalidated result
 * instead of replacing a populated institution pool with an empty array.
 */
function cachedSource(name: string, day: string, load: () => Promise<CollageTile[]>) {
  // Keyed by publication date: a new pool every day; within the day, refreshed hourly.
  return unstable_cache(async () => {
    const tiles = await load();
    if (!tiles.length) throw new Error(`No collage images from ${name}`);
    return tiles;
  }, ["home-archive-source-v2", name, day], { revalidate: REVALIDATE_SECONDS });
}

export async function getHomeCollage(): Promise<HomeCollage> {
  const day = featuredDate();
  const [aic, smithsonian, europeana, commons, photos] = await Promise.all([
    cachedSource("aic", day, () => fetchAic(day))().catch(() => [] as CollageTile[]),
    cachedSource("smithsonian", day, fetchSmithsonian)().catch(() => [] as CollageTile[]),
    cachedSource("europeana-v2", day, () => fetchEuropeana(day))().catch(() => [] as CollageTile[]),
    cachedSource("commons", day, () => fetchCommons(day))().catch(() => [] as CollageTile[]),
    photoTiles().catch(() => [] as CollageTile[]),
  ]);
  const seed = Math.floor(unit(`collage:${day}`) * 1e9) + hourSeed();
  const fallback = AIC_FALLBACK.map((f) => aicTile(f.id, f.image, f.title, "Asante, Ghana"));
  const global = dedupe(interleave(seededShuffle(aic, seed), seededShuffle(smithsonian, seed), seededShuffle(europeana, seed))).filter((t) => !isSensitive(t));

  // Local = live: today's ARED catalogue selection + live Commons photography, then the fixed Ghana set and editorial photos.
  const local = dedupe([
    ...interleave(seededShuffle(catalogueTiles(day), seed), seededShuffle(commons, seed)),
    ...seededShuffle([...localTiles(), ...photos], seed),
  ].filter((t) => !isSensitive(t)));

  return {
    local,
    global: global.length >= 6 ? global : dedupe([...global, ...fallback]),
    usedFallback: global.length < 6,
    live: {
      aic: aic.length > 0,
      smithsonian: smithsonian.length > 0,
      europeana: europeana.length > 0,
    },
  };
}
