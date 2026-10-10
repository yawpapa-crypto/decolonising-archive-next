import type { VisualProvenance } from "@/lib/visual/describe";
import "server-only";
import { json } from "./discover";
import type { DiscoverItem, DiscoverKind } from "./discover-shared";
import { yearOf } from "./year";

/**
 * Live adapters for the sources ARED already searches elsewhere. Each one returns
 * only what the provider supplied, never throws, and returns [] when the provider
 * refuses (rate limit, expired licence, outage), so one failing source never
 * empties the feed.
 */

const SENSITIVE = /\b(skull|skulls|cranium|crania|bones?|remains|mortuary|burial|corpse|mummy|mummies|nude|naked|genital)\b/i;
const clean = (s: string | undefined | null) => (s ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
const ok = (title: string) => title.length > 2 && !SENSITIVE.test(title);

/* ---------------------------- Wikimedia Commons ----------------------------- */

interface CommonsPage {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: { ObjectName?: { value?: string }; Artist?: { value?: string }; DateTimeOriginal?: { value?: string } };
  }>;
}

export async function commonsStream(page: number, q: string, n: number): Promise<DiscoverItem[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  const p = url.searchParams;
  p.set("action", "query");
  p.set("generator", "search");
  p.set("gsrnamespace", "6");
  p.set("gsrsearch", `${q} filetype:bitmap`);
  p.set("gsrlimit", String(n));
  p.set("gsroffset", String((page - 1) * n));
  p.set("prop", "imageinfo");
  p.set("iiprop", "url|size|mime|extmetadata");
  p.set("iiurlwidth", "480");
  p.set("format", "json");
  p.set("origin", "*");
  const data = await json<{ query?: { pages?: Record<string, CommonsPage> } }>(url.toString());
  return Object.values(data?.query?.pages ?? {})
    .map((pg) => {
      const info = pg.imageinfo?.[0];
      const title = clean(info?.extmetadata?.ObjectName?.value) || pg.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " ");
      if (!info?.thumburl || !/^image\/(jpeg|png)$/.test(info.mime ?? "") || !ok(title)) return null;
      const w = info.thumbwidth ?? 0;
      const h = info.thumbheight ?? 0;
      // A year named in the title describes the thing itself. The file's own date is often just
      // when someone photographed it, so it only counts when it predates digital photography.
      const fromTitle = yearOf(title);
      const taken = yearOf(clean(info.extmetadata?.DateTimeOriginal?.value));
      const year = fromTitle ?? (taken != null && taken < 1960 ? taken : null);
      return {
        id: `wc-${pg.pageid}`,
        kind: "image" as const,
        title,
        href: info.descriptionurl ?? `https://commons.wikimedia.org/?curid=${pg.pageid}`,
        external: true,
        image: info.thumburl,
        ar: w && h ? Math.min(2, Math.max(0.5, w / h)) : undefined,
        alt: title,
        authors: clean(info.extmetadata?.Artist?.value) || undefined,
        year: year != null ? String(year) : undefined,
        source: "Wikimedia Commons",
        oa: true,
      } satisfies DiscoverItem;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/* ---------------------------------- The Met --------------------------------- */

interface MetObject {
  objectID: number;
  title?: string;
  primaryImageSmall?: string;
  isPublicDomain?: boolean;
  artistDisplayName?: string;
  objectDate?: string;
  objectURL?: string;
  culture?: string;
}

export async function metStream(page: number, q: string, n: number): Promise<DiscoverItem[]> {
  const search = await json<{ objectIDs?: number[] | null }>(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(q)}`);
  const ids = (search?.objectIDs ?? []).slice((page - 1) * n, page * n);
  const objs = await Promise.all(ids.map((id) => json<MetObject>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)));
  return objs
    .filter((o): o is MetObject => Boolean(o?.primaryImageSmall && o.isPublicDomain && o.title && ok(o.title)))
    .map((o) => ({
      id: `met-${o.objectID}`,
      kind: "object" as const,
      title: o.title as string,
      href: o.objectURL ?? `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
      external: true,
      image: o.primaryImageSmall,
      alt: o.title,
      authors: o.artistDisplayName || undefined,
      year: o.objectDate || undefined,
      source: "The Metropolitan Museum of Art",
    }));
}

/* ------------------------------ Library of Congress ------------------------- */

interface LocResult {
  id?: string;
  title?: string;
  url?: string;
  date?: string;
  image_url?: string[];
}

export async function locStream(page: number, q: string, n: number): Promise<DiscoverItem[]> {
  const data = await json<{ results?: LocResult[] }>(`https://www.loc.gov/photos/?q=${encodeURIComponent(q)}&fo=json&c=${n}&sp=${page}`);
  return (data?.results ?? [])
    .filter((r) => r.title && r.url && r.image_url?.[0] && ok(r.title))
    .map((r) => ({
      id: `loc-${(r.id ?? r.url ?? "").replace(/\W+/g, "").slice(-40)}`,
      kind: "image" as const,
      title: clean(r.title),
      href: (r.url as string).replace(/^http:/, "https:"),
      external: true,
      image: (r.image_url as string[])[0].replace(/^\/\//, "https://"),
      alt: clean(r.title),
      year: r.date ? String(r.date).slice(0, 4) : undefined,
      source: "Library of Congress",
    }));
}

/* ----------------------------------- Crossref ------------------------------- */

interface CrossrefWork {
  DOI: string;
  title?: string[];
  type?: string;
  author?: Array<{ given?: string; family?: string; name?: string }>;
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  abstract?: string;
}

const CR_KIND: Record<string, DiscoverKind> = {
  "book-chapter": "chapter",
  book: "book",
  monograph: "book",
  "edited-book": "book",
  dissertation: "essay",
  "posted-content": "essay",
};

export async function crossrefStream(page: number, q: string, n: number): Promise<DiscoverItem[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${n}&offset=${(page - 1) * n}&select=DOI,title,type,author,issued,container-title,abstract&mailto=hello@ared.design`;
  const data = await json<{ message?: { items?: CrossrefWork[] } }>(url);
  return (data?.message?.items ?? [])
    .filter((w) => w.title?.[0] && ok(w.title[0]))
    .map((w) => ({
      id: `cr-${w.DOI}`,
      kind: CR_KIND[w.type ?? ""] ?? ("article" as DiscoverKind),
      title: clean(w.title?.[0]),
      href: `https://doi.org/${w.DOI}`,
      external: true,
      authors: w.author?.slice(0, 2).map((a) => a.name ?? [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean).join(", ") || undefined,
      year: w.issued?.["date-parts"]?.[0]?.[0] ? String(w.issued["date-parts"][0][0]) : undefined,
      venue: clean(w["container-title"]?.[0]) || undefined,
      abstract: w.abstract ? clean(w.abstract).replace(/^Abstract\s*/i, "").slice(0, 220) : undefined,
      source: "Crossref",
    }));
}

/* ------------------------------- Semantic Scholar --------------------------- */

interface S2Paper {
  paperId: string;
  title?: string;
  year?: number;
  venue?: string;
  authors?: Array<{ name?: string }>;
  externalIds?: { DOI?: string };
}

export async function semanticScholarStream(page: number, q: string, n: number): Promise<DiscoverItem[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&offset=${(page - 1) * n}&limit=${n}&fields=title,year,venue,authors,externalIds`;
  const data = await json<{ data?: S2Paper[] }>(url);
  // Titles and bibliographic fields only: abstracts are left out to respect the provider's licence.
  return (data?.data ?? [])
    .filter((p) => p.title && ok(p.title))
    .map((p) => ({
      id: `s2-${p.paperId}`,
      kind: "article" as const,
      title: clean(p.title),
      href: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : `https://www.semanticscholar.org/paper/${p.paperId}`,
      external: true,
      authors: p.authors?.slice(0, 2).map((a) => a.name).filter(Boolean).join(", ") || undefined,
      year: p.year ? String(p.year) : undefined,
      venue: p.venue || undefined,
      source: "Semantic Scholar",
    }));
}

/* ------------------------------- Google Books ------------------------------- */

interface GBook {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    infoLink?: string;
  };
}

export async function googleBooksStream(page: number, q: string, n: number): Promise<DiscoverItem[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&startIndex=${(page - 1) * n}&maxResults=${Math.min(n, 20)}&printType=books&orderBy=relevance`;
  const data = await json<{ items?: GBook[] }>(url);
  return (data?.items ?? [])
    .filter((b) => b.volumeInfo?.title && ok(b.volumeInfo.title))
    .map((b) => {
      const v = b.volumeInfo!;
      // The cover belongs to this exact Google Books volume, so it cannot be a different book.
      const thumb = (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail)?.replace(/^http:/, "https:").replace("&edge=curl", "");
      const isbn = v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ?? v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;
      return {
        id: `gb-${b.id}`,
        kind: "book" as const,
        title: clean(v.title),
        href: v.infoLink ?? `https://books.google.com/books?id=${b.id}`,
        external: true,
        image: thumb,
        ar: thumb ? 0.68 : undefined,
        alt: thumb ? `Cover of ${v.title}` : undefined,
        authors: v.authors?.slice(0, 2).join(", "),
        year: v.publishedDate?.slice(0, 4),
        venue: v.publisher,
        isbn,
        source: "Google Books",
      } satisfies DiscoverItem;
    });
}

/* ------------------------------ Cover enrichment ---------------------------- */

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const surname = (a: string | undefined) => norm((a ?? "").split(",")[0]).split(" ").filter(Boolean).pop() ?? "";

/**
 * A book with no cover gets one only when an independent source agrees on BOTH the title and an
 * author surname. A missing cover is better than a wrong one, so anything doubtful is left alone
 * and the tile stays a colour field.
 */
export async function enrichCovers(items: DiscoverItem[], max = 24): Promise<DiscoverItem[]> {
  const todo = items.filter((i) => i.kind === "book" && !i.image).slice(0, max);
  if (!todo.length) return items;
  const found = new Map<string, { url: string; prov: VisualProvenance }>();
  const now = new Date().toISOString();
  await Promise.all(
    todo.map(async (b) => {
      const title = norm(b.title);
      const sur = surname(b.authors);
      const first = (b.title.split(":")[0] ?? b.title).slice(0, 80);
      // 0. ISBN: accepted only when Open Library's own record for that ISBN agrees on title (and author when known).
      if (b.isbn) {
        const isbn = b.isbn.replace(/[^\dXx]/g, "");
        const rec = await json<Record<string, { title?: string; authors?: Array<{ name?: string }>; cover?: { medium?: string; large?: string }; url?: string }>>(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`,
        );
        const r = rec?.[`ISBN:${isbn}`];
        const cover = r?.cover?.large || r?.cover?.medium;
        if (r?.title && cover) {
          const sameTitle = norm(r.title).startsWith(norm(first)) || title.startsWith(norm(r.title));
          const sameAuthor = !sur || (r.authors ?? []).some((a) => norm(a.name || "").includes(sur));
          if (sameTitle && sameAuthor) {
            found.set(b.id, { url: cover, prov: { provider: "Open Library", sourceUrl: r.url ? `https://openlibrary.org${r.url}` : undefined, imageUrl: cover, providerId: `ISBN:${isbn}`, retrievedAt: now, confidence: 0.98, method: "isbn+title-agreement" } });
            return;
          }
        }
      }
      // 1. Google Books volume whose title and author both match
      const gb = await json<{ items?: GBook[] }>(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:${first}${sur ? ` inauthor:${sur}` : ""}`)}&maxResults=5&printType=books`,
      );
      for (const v of gb?.items ?? []) {
        const vi = v.volumeInfo;
        const thumb = vi?.imageLinks?.thumbnail?.replace(/^http:/, "https:").replace("&edge=curl", "");
        if (!thumb || !vi?.title) continue;
        const sameTitle = norm(vi.title).startsWith(norm(first)) || title.startsWith(norm(vi.title));
        const sameAuthor = !sur || (vi.authors ?? []).some((a) => norm(a).includes(sur));
        if (sameTitle && sameAuthor) {
          found.set(b.id, { url: thumb, prov: { provider: "Google Books", imageUrl: thumb, providerId: (v as { id?: string }).id, retrievedAt: now, confidence: sur ? 0.9 : 0.75, method: "title+author-agreement" } });
          return;
        }
      }
      // 2. Open Library search by title and author, same agreement test
      const ol = await json<{ docs?: Array<{ title?: string; author_name?: string[]; cover_i?: number; key?: string }> }>(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(first)}${sur ? `&author=${encodeURIComponent(sur)}` : ""}&limit=5&fields=title,author_name,cover_i,key`,
      );
      for (const d of ol?.docs ?? []) {
        if (!d.cover_i || !d.title) continue;
        const sameTitle = norm(d.title).startsWith(norm(first)) || title.startsWith(norm(d.title));
        const sameAuthor = !sur || (d.author_name ?? []).some((a) => norm(a).includes(sur));
        if (sameTitle && sameAuthor) {
          const url = `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`;
          found.set(b.id, { url, prov: { provider: "Open Library", sourceUrl: d.key ? `https://openlibrary.org${d.key}` : undefined, imageUrl: url, providerId: String(d.cover_i), retrievedAt: now, confidence: sur ? 0.85 : 0.7, method: "title+author-agreement" } });
          return;
        }
      }
    }),
  );
  return items.map((i) => { const f = found.get(i.id); return f ? { ...i, image: f.url, ar: 0.68, alt: `Cover of ${i.title}`, visual: f.prov } : i; });
}
