import "server-only";
import { europeanaStream } from "./europeana";
import { takeFresh } from "./discover-shared";
import { unstable_cache } from "next/cache";
import { filterCatalogueRecords, catalogueDataExists } from "@/lib/catalogue/store";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";
import { getHomeCollage, type CollageTile } from "@/lib/home/home-collage";

import { hash, DISCOVER_TYPES, type DiscoverItem, type DiscoverKind, type DiscoverPage, type DiscoverType } from "./discover-shared";
export { hash, DISCOVER_TYPES };
export type { DiscoverItem, DiscoverKind, DiscoverPage, DiscoverType };

const PAGE = 36;
const DEFAULT_BOOK_Q = "african design";
const DEFAULT_ARTICLE_Q = "decolonising design africa";

const OA_BASE = process.env.ARED_OPENALEX_BASE ?? "https://api.openalex.org";
const OL_BASE = process.env.ARED_OPENLIBRARY_BASE ?? "https://openlibrary.org";

export async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ARED-discover/1.0 (mailto:hello@ared.design)", Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 3600 },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/* ---------------------------------- images --------------------------------- */

const imagePool = unstable_cache(
  async () => {
    const c = await getHomeCollage();
    return { local: c.local, global: c.global };
  },
  ["discover-image-pool-v5"],
  { revalidate: 3600 },
);

function tileItem(t: CollageTile): DiscoverItem {
  const internal = t.href.startsWith("/");
  return {
    id: t.id,
    kind: t.origin === "local" ? "image" : "object",
    title: t.title,
    href: t.href,
    external: !internal,
    image: t.src,
    photographer: t.photographer,
    credit: t.credit,
    downloadLocation: t.downloadLocation,
    alt: t.alt,
    source: t.source,
    authors: t.authors, year: t.year, abstract: t.abstract,
    institution: t.institution, dataProvider: t.dataProvider, provider: t.provider,
    country: t.country, subjects: t.subjects, rights: t.rights, licence: t.licence,
    recordId: t.recordId, originalRecordUrl: t.originalRecordUrl, originalImage: t.originalImage,
    previewImage: t.previewImage, imageRole: t.imageRole, oa: t.oa,
  };
}

function matches(text: string, q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = text.toLowerCase();
  return terms.some((t) => hay.includes(t));
}

export async function imageStream(page: number, q: string, perPage: number, seed = ""): Promise<DiscoverItem[]> {
  const [pool, live] = await Promise.all([
    imagePool().catch(() => ({ local: [] as CollageTile[], global: [] as CollageTile[] })),
    q.trim() ? europeanaStream(page, q, Math.ceil(perPage / 2)).catch(() => [] as DiscoverItem[]) : Promise.resolve([] as DiscoverItem[]),
  ]);
  let list = [...pool.local, ...pool.global].map(tileItem);
  list.sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
  if (q) list = list.filter((i) => matches(`${i.title} ${i.source ?? ""} ${i.alt ?? ""} ${(i.subjects || []).join(" ")} ${i.abstract || ""}`, q));
  const local = list.slice((page - 1) * perPage, page * perPage);
  const merged: DiscoverItem[] = [];
  for (let n = 0; n < Math.max(live.length, local.length); n++) {
    if (live[n]) merged.push(live[n]);
    if (local[n]) merged.push(local[n]);
  }
  const seen = new Set<string>();
  return merged.filter(i => takeFresh(i, seen)).slice(0, perPage);
}

/* ------------------------------ catalogue records --------------------------- */

export function catalogueStream(page: number, q: string, perPage: number): DiscoverItem[] {
  if (process.env.ARED_LOCAL_RECORDS !== "1" || !catalogueDataExists()) return [];
  const result = filterCatalogueRecords({ q: q || undefined, page, limit: perPage, sort: "title" });
  return result.items.flatMap((r) => {
    const img = resolveServerRecordImage(r);
    if (img.access !== "display" || !img.url) return []; // no picture, no tile
    const direct = r.sourceUrl && /^https?:\/\//.test(r.sourceUrl) ? r.sourceUrl : null;
    return [{
      id: r.id,
      kind: r.recordType === "publication" ? "essay" : "object",
      title: r.title,
      href: direct ?? `/home-next/explore?record=${encodeURIComponent(r.id)}`,
      external: Boolean(direct),
      collectionSlug: "ghana-graphic-design",
      image: img.access === "display" ? (img.url ?? undefined) : undefined,
      alt: r.title,
      authors: r.creatorOrAuthority && !/unrecorded/i.test(r.creatorOrAuthority) ? r.creatorOrAuthority : undefined,
      year: r.dateStart ? String(r.dateStart) : undefined,
      source: r.institutionOrCollection ?? r.sourceName ?? undefined,
      abstract: undefined,
    } satisfies DiscoverItem];
  });
}

/* ----------------------------------- books ---------------------------------- */

interface OLDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  cover_i?: number;
  isbn?: string[];
}

export async function bookStream(page: number, q: string, perPage: number): Promise<DiscoverItem[]> {
  const url = new URL(`${OL_BASE}/search.json`);
  url.searchParams.set("q", `${q || DEFAULT_BOOK_Q} cover_i:*`);
  url.searchParams.set("limit", String(perPage));
  url.searchParams.set("offset", String((page - 1) * perPage));
  url.searchParams.set("fields", "key,title,author_name,first_publish_year,publisher,cover_i,isbn");
  const data = await json<{ docs?: OLDoc[] }>(url.toString());
  return (data?.docs ?? [])
    .filter((d) => d.title && d.key)
    .map((d) => ({
      id: `ol-${d.key.replace(/\W+/g, "")}`,
      kind: "book" as const,
      title: d.title as string,
      href: `https://openlibrary.org${d.key}`,
      external: true,
      // A cover id belongs to this exact Open Library work, so it cannot be the wrong book.
      // Without one, an ISBN lookup is tried; if Open Library has no cover the tile becomes typographic.
      image: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : d.isbn?.[0]
          ? `https://covers.openlibrary.org/b/isbn/${d.isbn[0]}-M.jpg?default=false`
          : undefined,
      ar: d.cover_i || d.isbn?.[0] ? 2 / 3 : undefined,
      isbn: d.isbn?.[0],
      alt: `Cover of ${d.title}`,
      authors: d.author_name?.slice(0, 2).join(", "),
      year: d.first_publish_year ? String(d.first_publish_year) : undefined,
      venue: d.publisher?.[0],
      source: "Open Library",
    }));
}

/* --------------------------------- articles --------------------------------- */

interface OAWork {
  id: string;
  title?: string | null;
  type?: string;
  publication_year?: number;
  doi?: string | null;
  authorships?: Array<{ author?: { display_name?: string } }>;
  primary_location?: { source?: { display_name?: string } | null; landing_page_url?: string | null } | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  open_access?: { is_oa?: boolean } | null;
}

function abstractFrom(index?: Record<string, number[]> | null): string | undefined {
  if (!index) return undefined;
  const words: string[] = [];
  for (const [w, positions] of Object.entries(index)) for (const p of positions) words[p] = w;
  const text = words.filter(Boolean).join(" ").trim();
  return text ? text : undefined;
}

export async function articleStream(page: number, q: string, perPage: number): Promise<DiscoverItem[]> {
  const url = new URL(`${OA_BASE}/works`);
  url.searchParams.set("search", q || DEFAULT_ARTICLE_Q);
  url.searchParams.set("per-page", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("select", "id,title,type,publication_year,doi,authorships,primary_location,abstract_inverted_index,open_access");
  const data = await json<{ results?: OAWork[] }>(url.toString());
  return (data?.results ?? [])
    .filter((w) => w.title)
    .map((w) => {
      const href = w.doi || w.primary_location?.landing_page_url || w.id;
      const kind: DiscoverKind = w.type === "book-chapter" ? "chapter" : w.type === "book" ? "book" : w.type === "dissertation" ? "essay" : "article";
      return {
        id: `oa-${w.id.split("/").pop()}`,
        kind,
        title: (w.title as string).replace(/<[^>]+>/g, ""),
        href,
        external: true,
        authors: w.authorships?.slice(0, 2).map((a) => a.author?.display_name).filter(Boolean).join(", ") || undefined,
        year: w.publication_year ? String(w.publication_year) : undefined,
        venue: w.primary_location?.source?.display_name ?? undefined,
        abstract: abstractFrom(w.abstract_inverted_index)?.slice(0, 220),
        source: "OpenAlex",
        oa: w.open_access?.is_oa === true ? true : undefined,
      } satisfies DiscoverItem;
    });
}

/* -------------------------------- collections ------------------------------- */

export function collectionStream(q: string): DiscoverItem[] {
  const all: DiscoverItem[] = [
    { id: "col-ghana-graphic-design", kind: "collection", title: "Ghana graphic design", href: "/collections/ghana-graphic-design", external: false, source: "Decolonising Archive" },
    { id: "col-african-archives", kind: "collection", title: "African archives", href: "/collections/african-archives", external: false, source: "Decolonising Archive" },
  ];
  return q ? all.filter((c) => matches(c.title, q)) : all;
}

/* ---------------------------------- the mix --------------------------------- */

/** Interleave streams in an order that comes from the records, not from a pattern. */
function weave(streams: DiscoverItem[][]): DiscoverItem[] {
  const all = streams.flat();
  return all.sort((a, b) => hash(a.id) - hash(b.id));
}

export async function getDiscoverPage(opts: { page?: number; type?: DiscoverType; q?: string }): Promise<DiscoverPage> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const type = opts.type ?? "all";
  const q = (opts.q ?? "").trim().slice(0, 120);

  const wantImages = type === "all" || type === "images";
  const wantBooks = type === "all" || type === "books";
  const wantArticles = type === "all" || type === "articles";
  const wantCollections = (type === "all" || type === "collections") && page === 1;

  // Quotas per page keep the mix honest: mostly imagery, a steady share of reading.
  const q_img = type === "images" ? PAGE : type === "all" ? 18 : 0;
  const q_cat = type === "images" ? 0 : type === "all" ? 4 : 0;
  const q_book = type === "books" ? PAGE : type === "all" ? 6 : 0;
  const q_art = type === "articles" ? PAGE : type === "all" ? 8 : 0;

  const [images, books, articles] = await Promise.all([
    wantImages && q_img ? imageStream(page, q, q_img).catch(() => []) : Promise.resolve([] as DiscoverItem[]),
    wantBooks && q_book ? bookStream(page, q, q_book).catch(() => []) : Promise.resolve([] as DiscoverItem[]),
    wantArticles && q_art ? articleStream(page, q, q_art).catch(() => []) : Promise.resolve([] as DiscoverItem[]),
  ]);
  const catalogue = wantImages && q_cat ? catalogueStream(page, q, q_cat) : [];
  const collections = wantCollections ? collectionStream(q) : [];

  const seen = new Set<string>();
  const items = weave([images, catalogue, books, articles, collections]).filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return {
    items,
    next: items.length ? page + 1 : null,
    streams: { images: images.length, catalogue: catalogue.length, books: books.length, articles: articles.length, collections: collections.length },
  };
}
