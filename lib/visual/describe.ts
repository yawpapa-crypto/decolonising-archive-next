/**
 * Pure visual descriptors. No network, no models. Answers only "is this image usable and
 * authentic, and what does it look like in a sequence?" — never what a culture or object means.
 */
export type Form = "photograph" | "object" | "poster" | "book" | "document" | "article" | "collection" | "text";
export type Orient = "tall" | "portrait" | "square" | "landscape" | "wide";

export type VisualProvenance = {
  provider: string;
  sourceUrl?: string;
  recordUrl?: string;
  imageUrl?: string;
  providerId?: string;
  licence?: string;
  attribution?: string;
  retrievedAt?: string;
  /** 0..1: how sure we are the image depicts this record. */
  confidence: number;
  method: string;
};

/** What the offline visual index knows about an image (all optional). */
export type IndexEntry = {
  w?: number;
  h?: number;
  dhash?: string;
  hue?: number;
  lum?: number;
  failed?: boolean;
  provenance?: VisualProvenance;
};

export type VDesc = {
  id: string;
  form: Form;
  orient: Orient;
  source: string;
  creator: string;
  region: string;
  hasImage: boolean;
  /** Computational cluster (form + proportion + coarse colour). Not a scholarly category. */
  cluster: string;
  dhash?: string;
  hue?: number;
  lum?: number;
  /** 0..1 usability and authenticity, never aesthetics. */
  quality: number;
  dupKeys: string[];
};

export type ItemLike = {
  id: string;
  kind: string;
  title: string;
  image?: string;
  ar?: number;
  source?: string;
  venue?: string;
  authors?: string;
  country?: string[];
  subjects?: string[];
  institution?: string[];
  provider?: string[];
  abstract?: string;
  oa?: boolean;
  visual?: VisualProvenance;
};

export function orientOf(ar: number | undefined): Orient {
  if (!ar || !Number.isFinite(ar)) return "square";
  if (ar < 0.55) return "tall";
  if (ar < 0.9) return "portrait";
  if (ar <= 1.12) return "square";
  if (ar <= 1.7) return "landscape";
  return "wide";
}

const POSTER = /\b(poster|placard|flyer|handbill|banner|broadside|billboard|advertis|campaign)\b/i;
const MAP = /\b(map|plan|chart|atlas)\b/i;
const DRAWING = /\b(drawing|sketch|print|engraving|illustration|lithograph|woodcut|painting)\b/i;
const DOC = /\b(manuscript|letter|document|report|pamphlet|journal issue|newspaper|gazette|archive of|minutes|treaty)\b/i;

export function formOf(i: ItemLike): Form {
  const t = `${i.title} ${(i.subjects || []).join(" ")}`;
  switch (i.kind) {
    case "book": return "book";
    case "article": case "chapter": return "article";
    case "essay": return "document";
    case "collection": return "collection";
  }
  if (POSTER.test(t)) return "poster";
  if (DOC.test(t) || MAP.test(t)) return "document";
  if (i.kind === "object") return DRAWING.test(t) ? "document" : "object";
  if (i.kind === "image") return /\b(photograph|photo|portrait|street|market|studio)\b/i.test(t) || i.source === "Wikimedia Commons" ? "photograph" : "photograph";
  return i.image ? "photograph" : "text";
}

const PLACEHOLDER = /placeholder|no[-_ ]?image|image[-_ ]?not|default[-_.]|blank\.|spacer|1x1|pixel\.|missing/i;

export function urlUsable(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !PLACEHOLDER.test(u.pathname);
  } catch {
    return false;
  }
}

/** Known-broken URLs, fed by the browser's error beacon and the index builder. */
const failed = new Map<string, number>();
const FAIL_TTL = 24 * 3600 * 1000;
export function markFailed(url: string, now = Date.now()) {
  failed.set(url, now);
  if (failed.size > 5000) for (const k of [...failed.keys()].slice(0, 1000)) failed.delete(k);
}
export function isKnownBroken(url: string, now = Date.now()) {
  const t = failed.get(url);
  if (t === undefined) return false;
  if (now - t > FAIL_TTL) { failed.delete(url); return false; }
  return true;
}

export function gate(i: ItemLike, idx?: IndexEntry): { ok: boolean; reason?: string } {
  if (!i.image) return { ok: true }; // designed fallback is legitimate
  if (!urlUsable(i.image)) return { ok: false, reason: "unusable-url" };
  if (isKnownBroken(i.image)) return { ok: false, reason: "known-broken" };
  if (idx?.failed) return { ok: false, reason: "index-failed" };
  if (idx?.w && idx?.h && Math.min(idx.w, idx.h) < 150) return { ok: false, reason: "too-small" };
  return { ok: true };
}

const MUSEUM = /clevelandart|artic\.edu|metmuseum|si\.edu|europeana|loc\.gov|wikimedia|smithsonian/i;

/**
 * Quality is usability and authenticity only:
 * resolution + source confidence + record-match confidence + crop usability.
 */
export function qualityOf(i: ItemLike, idx?: IndexEntry): number {
  if (!i.image) return 0.3;
  let resolution = 0.55;
  if (idx?.w && idx?.h) {
    const m = Math.min(idx.w, idx.h);
    resolution = m >= 800 ? 1 : m >= 500 ? 0.8 : m >= 300 ? 0.6 : 0.3;
  }
  const host = (() => { try { return new URL(i.image!, "https://x.invalid").hostname + i.image; } catch { return ""; } })();
  const sourceConf = i.visual ? 0.5 + 0.5 * i.visual.confidence : MUSEUM.test(host) || MUSEUM.test(i.source || "") ? 0.9 : 0.65;
  const ar = idx?.w && idx?.h ? idx.w / idx.h : i.ar;
  const crop = !ar ? 0.7 : ar >= 0.4 && ar <= 2.5 ? 1 : 0.5;
  return Math.max(0, Math.min(1, 0.4 * resolution + 0.35 * sourceConf + 0.25 * crop));
}

function hueBand(h: number | undefined, l: number | undefined) {
  if (h === undefined || l === undefined) return "";
  return `${l < 0.33 ? "d" : l > 0.7 ? "l" : "m"}${Math.floor((((h % 360) + 360) % 360) / 60)}`;
}

export function describe(
  i: ItemLike,
  idx?: IndexEntry,
  keys: (i: ItemLike) => string[] = (x) => [x.id],
): VDesc {
  const form = formOf(i);
  const ar = idx?.w && idx?.h ? idx.w / idx.h : i.ar;
  const orient = orientOf(ar);
  const hasImage = Boolean(i.image) && gate(i, idx).ok;
  return {
    id: i.id,
    form,
    orient,
    source: (i.source || i.venue || i.provider?.[0] || "").toLowerCase(),
    creator: (i.authors || "").toLowerCase().slice(0, 40),
    region: (i.country?.[0] || "").toLowerCase(),
    hasImage,
    cluster: hasImage ? `${form}:${orient}:${hueBand(idx?.hue, idx?.lum)}` : `fallback:${form}`,
    dhash: idx?.dhash,
    hue: idx?.hue,
    lum: idx?.lum,
    quality: qualityOf(i, idx),
    dupKeys: keys(i),
  };
}

/** Hamming distance of two hex dHashes (16 hex = 64 bits). */
export function hamming(a?: string, b?: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let k = 0; k < a.length; k++) {
    let x = parseInt(a[k], 16) ^ parseInt(b[k], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}
