/** Shared by server and client: types and the stable hash. */
/**
 * One feed, many kinds of knowledge object. Every item carries only what a
 * source genuinely supplied; anything missing stays undefined and the tile
 * falls back to typography, never to invented metadata.
 */
export type DiscoverKind = "image" | "object" | "book" | "article" | "chapter" | "essay" | "collection";

export interface DiscoverItem {
  id: string;
  kind: DiscoverKind;
  title: string;
  href: string;
  external: boolean;
  image?: string;
  /** Aggregator provenance; never conflate provider country with object location. */
  institution?: string[];
  dataProvider?: string[];
  provider?: string[];
  country?: string[];
  subjects?: string[];
  rights?: string[];
  licence?: string;
  recordId?: string;
  originalRecordUrl?: string;
  originalImage?: string;
  previewImage?: string;
  imageRole?: "preview";
  photographer?: string;
  credit?: string;
  downloadLocation?: string;
  /** Natural width / height when the source reports it. */
  ar?: number;
  authors?: string;
  year?: string;
  venue?: string;
  source?: string;
  abstract?: string;
  alt?: string;
  isbn?: string;
  /** Metadata for the record page link, when the item is an ARED catalogue record. */
  collectionSlug?: string;
  /** Why the feed chose this. Kept internally; shown only on request. */
  why?: string;
  bucket?: "relevant" | "adjacent" | "serendipity";
  saved?: boolean;
  /** True only when the source itself says the work is open access or freely licensed. */
  oa?: boolean;
  /** Provenance of the resolved image (provider, source, licence, confidence, method). */
  visual?: import("@/lib/visual/describe").VisualProvenance;
  /** Other legitimate images for the same record; the feed picks among them per context. */
  visuals?: import("@/lib/visual/select").VisualOption[];
}

export type DiscoverType = "all" | "images" | "books" | "articles" | "collections";
export const DISCOVER_TYPES: DiscoverType[] = ["all", "images", "books", "articles", "collections"];

export interface DiscoverPage {
  items: DiscoverItem[];
  next: number | null;
  /** Streams that answered, so the interface can be honest about gaps. */
  streams: Record<string, number>;
}

/** FNV-1a: stable across renders and processes. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


/** Same title, different provider: one object. Used by server and browser to keep repeats out. */
export const titleKey = (i: { title: string }) => i.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 70);

const STOP = /^(the|a|an)\s+/;
/** Every way two records can be the same object: id, title, subtitle-stripped title, image file, ISBN. */
function canonicalUrl(value: string): string {
  try {
    const u = new URL(value, "https://ared.design");
    if (u.hostname === "api.europeana.eu" && u.pathname.includes("thumbnail") && u.searchParams.get("uri")) return canonicalUrl(u.searchParams.get("uri")!);
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|wskey$|api_key$)/i.test(key)) u.searchParams.delete(key);
    if (u.hostname === "upload.wikimedia.org" && u.pathname.includes("/thumb/") && /\/\d+px-[^/]+$/.test(u.pathname))
      u.pathname = u.pathname.replace("/thumb/", "/").replace(/\/\d+px-[^/]+$/, "");
    u.hash = "";
    return u.href.replace(/^http:/,"https:").replace(/\/$/,"");
  } catch { return value; }
}
export function dupKeys(i: { id: string; title: string; image?: string; isbn?: string; kind?: DiscoverKind; source?: string; href?: string; originalRecordUrl?: string; originalImage?: string; authors?: string; year?: string; institution?: string[] }): string[] {
  const t = titleKey(i).replace(STOP, "");
  const keys = [i.id];
  // Commons campaign exports are numbered crops of one design, not new discoveries.
  if (i.source === "Wikimedia Commons" && /\s[-–]\sdesign\s+\d+\b/i.test(i.title)) {
    keys.push("series:" + i.title.toLowerCase().replace(/\s[-–]\sdesign\s+\d+.*$/i, "").trim());
  }
  // Numbered views of one thing ("… 02", "… II", "… 3 of 5") read as repeats in a feed.
  const series = i.title.toLowerCase().match(/^(.{12,}?)[\s,._-]+(?:no\.?\s*)?(?:\d{1,3}|[ivx]{1,4})(?:\s+of\s+\d+)?\s*$/);
  if (series) keys.push("s:" + series[1].replace(/[^\p{L}\p{N}]+/gu, " ").trim());
  // Distinct archival photographs/objects often have the same title. Identity wins.
  const archival = i.kind === "image" || i.kind === "object" || i.source === "Europeana";
  if (!archival) {
    keys.push(titleKey(i), "t:" + t);
    const head = i.title.split(/\s*[:\u2013\u2014]\s+|\s+-\s+/)[0];
    const h = head.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(STOP, "");
    if (head !== i.title && h.length >= 18) keys.push("t:" + h);
  }
  for (const url of [i.href, i.originalRecordUrl].filter(Boolean)) keys.push("u:" + canonicalUrl(url!));
  for (const url of [i.image,i.originalImage].filter(Boolean)) {
    const f = canonicalUrl(url!).replace(/\/(thumb|thumbs|small|medium|large|full|\d+x\d*|\d+,)(?=\/)/g, "");
    keys.push("i:" + hash(f).toString(36));
    // The same file served from different hosts or sizes is still one picture.
    const base = decodeURIComponent(f.split("?")[0].split("/").pop() || "").replace(/^\d+px-/, "").toLowerCase();
    if (base.length >= 18 && /[a-z]{4}/.test(base) && !/^(image|photo|thumbnail|cover|default)/.test(base)) keys.push("f:" + base);
  }
  // Metadata can qualify an identity, but is insufficient to merge distinct photographs.
  if (archival && i.authors && i.year && i.institution?.length) keys.push("a:" + [i.href || i.id,i.title,i.authors,i.year,...i.institution].join("|").toLowerCase());
  if (i.isbn) keys.push("b:" + i.isbn.replace(/\D/g, ""));
  return keys;
}
/** True when none of the keys has been seen; records the keys when it is fresh. */
export function takeFresh(i: Parameters<typeof dupKeys>[0], seen: Set<string>): boolean {
  const ks = dupKeys(i);
  if (ks.some((k) => seen.has(k))) return false;
  ks.forEach((k) => seen.add(k));
  return true;
}
