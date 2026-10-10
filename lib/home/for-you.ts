import { FALLBACK_IMAGES } from "@/lib/home/fallback-images";
import "server-only";
import { recommendationBatch, relatedBatch } from "@/lib/recommendations/server";
import { createClient } from "@/src/lib/supabase/server";
import { loadCatalogueTaxonomy } from "@/lib/catalogue/store";
import {
  commonsStream,
  crossrefStream,
  googleBooksStream,
  locStream,
  metStream,
  semanticScholarStream,
  enrichCovers,
} from "./providers";
import {
  articleStream,
  bookStream,
  catalogueStream,
  hash,
  imageStream,
} from "./discover";
import { sequence } from "@/lib/visual/apply";
import { warmHashes } from "@/lib/visual/live-hash";
import { dupKeys, takeFresh, type DiscoverItem, type DiscoverPage } from "./discover-shared";
import { featuredDate, featuredProviderPage, featuredTopics } from "./featured";

/** Diagnostics for the admin Featured health check (per server instance). */
export const featuredHealth = {
  lastRefreshAt: null as string | null,
  date: null as string | null,
  topics: [] as string[],
  candidates: 0,
  selected: 0,
  duplicatesRejected: 0,
  providerErrors: [] as string[],
};

/** For You delegates to the native, PostgreSQL-backed recommendation pipeline.
 * Explore remains query-led and reads no recommendation profile. */

export interface Signal {
  title?: string;
  source?: string;
  type?: string;
  /** Collection title the item was placed in, when there is one. */
  list?: string;
  weight: number;
}

export interface Interest {
  term: string;
  weight: number;
  origin: "profile" | "saved" | "collection" | "search" | "session";
}

const STOP = new Set(
  "the and for with from that this into over under about their there which where when what while after before between through during against among other these those have has had been being were was are not but its your you our out off than then them they some such only also more most very into onto upon within without across around part book books article articles paper papers journal study studies new one two three four five".split(" "),
);

function tokens(text: string | undefined): string[] {
  if (!text) return [];
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOP.has(t) && !/^\d+$/.test(t))
  );
}

/** Real ARED taxonomy labels (visual systems, periods) used to find neighbours. */
function taxonomyLabels(): string[] {
  try {
    return loadCatalogueTaxonomy().map((r) => r.label).filter(Boolean);
  } catch {
    return [];
  }
}

/** ARED-relevant topics. With no query, a batch walks this list so the feed keeps meeting new material. */
const TOPICS = [
  "African art", "Ghana textiles", "adinkra symbols", "kente cloth", "Yoruba sculpture", "Asante goldweights", "African graphic design",
  "postcolonial design", "decolonising design", "West African architecture", "African typography", "Benin bronzes", "Maori carving",
  "Indigenous knowledge", "African photography", "pan-African posters", "Swahili coast", "Ethiopian manuscripts", "Zulu beadwork", "Caribbean art",
];

function topicFor(seed: string, page: number): { q: string; providerPage: number } {
  const start = hash(seed) % TOPICS.length;
  const i = (page - 1 + start) % TOPICS.length;
  return { q: TOPICS[i], providerPage: Math.floor((page - 1) / TOPICS.length) + 1 };
}


/** One query across every live source ARED already uses. A source that fails is simply absent. */
async function streamsFor(q: string, page: number, n: number, seed: string, fixed?: { q: string; providerPage: number }, stats?: { dup: number; errors: string[] }): Promise<DiscoverItem[]> {
  const topic = fixed ?? (q ? { q, providerPage: page } : topicFor(seed, page));
  const query = topic.q; // Explicit exploration intent wins.
  const pp = topic.providerPage;
  const share = (f: number) => Math.max(1, Math.round(n * f));
  const wide = n >= 8; // small buckets use the lighter set, so a personal batch stays quick
  const jobs: Array<Promise<DiscoverItem[]>> = [
    imageStream(pp, query, share(0.2), seed),
    commonsStream(pp, query, share(0.22)),
    bookStream(pp, query, share(0.08)),
    googleBooksStream(pp, query, share(0.1)),
    articleStream(pp, query, share(0.12)),
  ];
  if (wide) {
    jobs.push(
      metStream(pp, query, share(0.1)),
      locStream(pp, query, share(0.08)),
      crossrefStream(pp, query, share(0.1)),
      semanticScholarStream(pp, query, share(0.06)),
    );
  }
  const settled = await Promise.all(jobs.map((j, k) => j.catch((e) => { stats?.errors.push(`${query} #${k}: ${e instanceof Error ? e.message.slice(0, 80) : "failed"}`); return [] as DiscoverItem[]; })));
  const cat = catalogueStream(page, q || "", share(0.1));
  const seenKeys = new Set<string>();
  const scope = (i: DiscoverItem) => /africa|ghana|yoruba|akan|asante|swahili|benin|decolon|indigenous|diaspora|global south|caribbean|latin america|south asia/i.test(`${i.title} ${i.abstract || ""} ${i.authors || ""}`) ? 2 : 0;
  const all = [...settled.flat(), ...cat]
    .filter(i => !/stock market forecast|celebrity gossip|iphone review|best gaming laptop/i.test(i.title))
    .filter(i => Boolean(i.image) || (i.kind !== "image" && i.kind !== "object"))
    .filter((i) => { const ok = takeFresh(i, seenKeys); if (!ok && stats) stats.dup++; return ok; });
  if (q) return all;
  // Alternate archive-themed items with the wider world so the board never reads as one region.
  const near = all.filter(i => scope(i) > 0), far = all.filter(i => scope(i) === 0);
  const mixed: DiscoverItem[] = [];
  for (let n = 0; n < Math.max(near.length, far.length); n++) { if (far[n]) mixed.push(far[n]); if (near[n] && n % 2 === 0) mixed.push(near[n]); if (near[n] && n % 2 === 1 && far[n + 1] === undefined) mixed.push(near[n]); }
  return mixed.length >= all.length ? mixed : [...mixed, ...near.filter(i => !mixed.includes(i))];
}

export interface ForYouPage extends DiscoverPage {
  seed: string;
  featured?: { date: string; topics: string[]; more: number };
  profile: { loggedIn: boolean; saves: number; interests: string[] };
}

export async function getForYouPage(opts: { page: number; seed: string; seen: string[]; session: Signal[]; sessionId?: string; intent?:string[]; feedback?:{more?:string[];less?:string[]};ignoreEvents?:boolean;personalise?:boolean }): Promise<ForYouPage> {
  return recommendationBatch(opts);
}

/** "More like this": same sources, queried with the item's own words. */
export async function getSimilarPage(opts: { item: { id: string; title: string; authors?: string; venue?: string; source?: string }; page: number; seen: string[] }): Promise<DiscoverPage> {
  const page = Math.max(1, Math.min(200, opts.page));
  const local = await relatedBatch(opts.item.id, opts.seen, page);
  if (local?.items.length) return local;
  const words = tokens(opts.item.title).slice(0, 2);
  const q = words.length ? words.join(" ") : opts.item.title.slice(0, 60);
  const seen = new Set([...dupKeys(opts.item), ...opts.seen]);
  const raw = await streamsFor(q, page, 30, opts.item.id);
  const items = raw
    .filter((i) => (!local || i.kind === "object" || i.kind === "image") && tokens(i.title).some((word) => words.includes(word)) && takeFresh(i, seen))
    .map((i) => ({ ...i, why: `Shares a title term: ${tokens(i.title).find((word) => words.includes(word))}`, bucket: "relevant" as const }));
  items.sort((a, b) => hash(`${opts.item.id}:${a.id}`) - hash(`${opts.item.id}:${b.id}`));
  const withCovers = await enrichCovers(items).catch(() => items);
  return { items: withCovers, next: items.length && raw.length && page < 200 ? page + 1 : null, streams: {} };
}

/**
 * EXPLORE: deliberate, not personalised. The same sources, steered only by the category or
 * search the visitor chose. No member signals are read, so two visitors see the same field.
 */
/** Dev-only inspection of the last Explore composition. */
export let exploreTrace: unknown[] = [];

export async function getExplorePage(opts: { page: number; q: string; seen: string[]; seed?: string; day?: string; more?: number }): Promise<ForYouPage> {
  const page = Math.max(1, Math.min(500, opts.page));
  const seen = new Set(opts.seen);
  // Featured (no query): two topics chosen by the publication date — a different pair each day,
  // never yesterday's — and deeper provider pages as a topic recurs. "Discover more" (more ≥ 1)
  // walks further pairs of the same day. Previously the topic seed was the constant "explore",
  // so every day and every session queried the same two topics.
  const day = opts.day || featuredDate();
  const more = Math.max(0, Math.min(20, opts.more ?? 0));
  const stats = { dup: 0, errors: [] as string[] };
  let topics: string[] = [];
  let raw: DiscoverItem[];
  if (opts.q) raw = await streamsFor(opts.q, page, 36, "explore", undefined, stats);
  else {
    topics = featuredTopics(TOPICS, day, 2, (more + page - 1) * 2);
    raw = (await Promise.all(topics.map((t) => streamsFor("", page, 36, "explore", { q: t, providerPage: featuredProviderPage(TOPICS, day, t) }, stats)))).flat()
      // ARED catalogue records come only from the daily catalogue selection (with its cooldowns).
      .filter((i) => !String(i.id).startsWith("ARED-"));
  }
  // In Featured, same source + same title + same year reads as a repeat (e.g. numbered copies of one
  // poster) even when the provider ids differ; elsewhere distinct archival items keep their identity.
  const near = new Set<string>();
  const fresh0 = raw.filter((i) => {
    let ok = takeFresh(i, seen);
    if (ok && !opts.q) {
      const k = `${i.source}|${i.title.trim().toLowerCase()}|${i.year ?? ""}`;
      if (near.has(k)) ok = false; else near.add(k);
    }
    if (!ok) stats.dup++;
    return ok;
  });
  const fresh = await enrichCovers(fresh0).catch(() => fresh0);
  // Stable all day (Featured) — never a per-session or per-request shuffle.
  const rotation = opts.q ? `explore:${opts.seed || Math.floor(Date.now() / (6 * 3600 * 1000))}:${opts.q}` : `featured:${day}:${more}:${page}`;
  if (!opts.q && page === 1 && more === 0) {
    Object.assign(featuredHealth, { lastRefreshAt: new Date().toISOString(), date: day, topics, candidates: raw.length, selected: fresh.length, duplicatesRejected: stats.dup, providerErrors: stats.errors.slice(0, 20) });
  }
  // Knowledge for Explore is breadth, not taste: position within its own source (providers
  // rank their own results), a lift for ARED's editorial catalogue, and seeded rotation.
  const groups = new Map<string, number>();
  const rankIn = new Map<string, number>();
  for (const i of fresh) { const g = i.source || i.kind; rankIn.set(i.id, groups.get(g) || 0); groups.set(g, (groups.get(g) || 0) + 1); }
  await warmHashes(fresh.map((i) => i.image));
  const seq = sequence(fresh, {
    n: fresh.length, seed: rotation, breadth: opts.q ? 0.6 : 1.4, explicit: opts.q ? ["region"] : [],
    lookahead: opts.q ? 14 : 30, tailIn: `${rotation}|${page - 1}`, tailOut: `${rotation}|${page}`,
    knowledge: (i) => 1 - (rankIn.get(i.id)! / Math.max(1, groups.get(i.source || i.kind)!)) * 0.7 + (i.collectionSlug ? 0.25 : 0) + (hash(`${rotation}:${i.id}`) % 100) / 100 * 0.45,
    editorial: (i) => Boolean(i.collectionSlug),
  });
  exploreTrace = seq.trace;
  const withCovers = seq.items;
  let loggedIn = false;
  try {
    const supabase = await createClient();
    loggedIn = Boolean((await supabase.auth.getUser()).data.user);
  } catch {
    /* visitor */
  }
  return { items: withCovers, next: page < 500 ? page + 1 : null, streams: Object.fromEntries(groups), seed: "explore", profile: { loggedIn, saves: 0, interests: [] }, ...(opts.q ? {} : { featured: { date: day, topics, more } }) };
}

/** Real labels from ARED's own taxonomy, for the category chips on Explore. */
export function exploreCategories(): string[] {
  const labels = taxonomyLabels();
  return [...new Set(labels)].slice(0, 16);
}

/** A few real images for a curated card: a stable slice of the cached pool. */
export async function collageFor(key: string, n = 3): Promise<string[]> {
  const imgs = await imageStream(1, "", 60, key).catch(() => []);
  return [...new Set(imgs.filter((i) => i.image && i.source !== "Unsplash").map((i) => i.image as string))].slice(0, n);
}

const YOUTH_QUERIES = [
  "young Black African students smiling",
  "young African woman portrait natural light",
  "young Black man portrait Africa",
  "African university students campus",
  "young Black friends laughing Accra",
  "young African artist studio",
  "African youth community gathering",
  "young Black woman reading book",
  "young African designer working",
  "Ghana young people street",
  "young Black creatives Lagos",
  "African teenagers school uniform",
  "young Black man smiling portrait",
  "young African women together",
  "Nairobi young professionals",
];

type Mixed = { image: string; title: string; source?: string; credit?: { name: string; url: string } };

async function unsplashPool(queries: string[]): Promise<Mixed[]> {
  const { editorialPhoto, resizeUnsplash } = await import("@/lib/media/unsplash");
  const photos = (await Promise.all(queries.map((q) => editorialPhoto(q).catch(() => null)))).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const seen = new Set<string>();
  const out: Mixed[] = [];
  for (const p of photos) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ image: resizeUnsplash(p.src, 900), title: p.alt.charAt(0).toUpperCase() + p.alt.slice(1), source: `Photo by ${p.photographer} on Unsplash`, credit: { name: p.photographer, url: p.credit } });
  }
  return out;
}

/** Alternate two sources so neither one running dry leaves a gap: A, B, A, B, then whatever is left. */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); }
  return out;
}

const HERITAGE_QUERIES = [
  "Ghana heritage architecture", "African textile weaving kente", "West African market", "African artisan craft hands",
  "African art museum", "African village landscape", "Black African students university", "young African woman portrait",
  "Accra street life", "African pottery clay", "Adinkra cloth pattern", "Black African elder portrait",
];

/** Fieldnotes imagery: archive records mixed with Unsplash photographs. Always over-supplies, because a dead link is simply dropped. */
export async function mixedCollage(key: string, n: number): Promise<Array<{ src: string; credit?: { name: string; url: string } }>> {
  const [archive, extra] = await Promise.all([
    imageStream(1, "", 60, key).catch(() => []),
    unsplashPool(HERITAGE_QUERIES),
  ]);
  const arc: Mixed[] = [...new Set(archive.filter((i) => i.image && i.source !== "Unsplash").map((i) => i.image as string))].map((image) => ({ image, title: "" }));
  // Archive and editorial images lead; a local photo punctuates every fourth
  // slot. Local backups supplement live records rather than replacing them.
  const live = interleave(arc, extra);
  const offset = hash(key + Math.floor(Date.now() / 3600000)) % FALLBACK_IMAGES.length;
  const out: Array<{ src: string; credit?: { name: string; url: string } }> = [];
  const seen = new Set<string>();
  let localIndex = 0;
  for (const image of live) {
    if (out.length >= n) break;
    if (seen.has(image.image)) continue;
    seen.add(image.image);
    out.push({ src: image.image, credit: image.credit });
    if (out.length % 4 === 3 && out.length < n && localIndex < FALLBACK_IMAGES.length) {
      const src = FALLBACK_IMAGES[(offset + localIndex++) % FALLBACK_IMAGES.length];
      if (!seen.has(src)) { out.push({ src }); seen.add(src); }
    }
  }
  for (let i = 0; out.length < n; i++) out.push({ src: FALLBACK_IMAGES[i % FALLBACK_IMAGES.length], credit: undefined });
  return out;
}

/** Imagery for the onboarding panels: young Black African people from Unsplash, interleaved with archive records. */
export async function onboardingCompositions(): Promise<Array<Array<{ image: string; title: string; source?: string }>>> {
  const out: Array<Array<{ image: string; title: string; source?: string }>> = [[], [], [], []];
  const [youth, archive] = await Promise.all([
    unsplashPool(YOUTH_QUERIES),
    imageStream(1, "", 60, "onboarding").catch(() => []),
  ]);
  const arc: Mixed[] = archive.filter((i) => i.image && i.source !== "Unsplash").map((i) => ({ image: i.image as string, title: i.title, source: i.source }));
  const mine: Mixed[] = [{ image: "/images/auth/friends-dune.jpg", title: "Friends together" }, { image: "/images/auth/beach-friends.jpg", title: "Beach, Ghana" }, { image: "/images/auth/dance-drums.jpg", title: "Dance and drums" }, { image: "/images/auth/minibus-accra.jpg", title: "Accra, by trotro" }, { image: "/images/auth/dance-procession.jpg", title: "Procession" }];
  interleave(interleave(mine, youth), arc).slice(0, 18).forEach((i, n) => out[n % 4].push({ image: i.image, title: i.title, source: i.source }));
  return out;
}

export type AuthPhoto = { id: string; src: string; alt: string; credit?: { name: string; url: string } };

/** Your own photographs, served from /public: they cannot fail the way a remote source can. */
const LOCAL_AUTH: AuthPhoto[] = [
  { id: "l-group", src: "/images/auth/friends-dune.jpg", alt: "Friends cheering together on a sand dune" },
  { id: "l-beach", src: "/images/auth/beach-friends.jpg", alt: "Young men laughing and splashing in the sea at a Ghanaian beach" },
  { id: "l-drums", src: "/images/auth/dance-drums.jpg", alt: "A dancer in kente cloth and beads, drummers behind her" },
  { id: "l-bus", src: "/images/auth/minibus-accra.jpg", alt: "Young man leaning out of a trotro minibus" },
  { id: "l-proc", src: "/images/auth/dance-procession.jpg", alt: "A smiling dancer leading a procession" },
];
const ORDER = { signup: ["l-group", "l-beach", "l-drums", "l-bus", "l-proc"], signin: ["l-proc", "l-bus", "l-beach", "l-group", "l-drums"] } as const;

/** Sign-in and sign-up imagery: the local photographs first, in a different order on each page, with Unsplash and archive images behind them as spares. */
export async function authPhotos(variant: "signup" | "signin" = "signup"): Promise<AuthPhoto[]> {
  const local = ORDER[variant].map((id) => LOCAL_AUTH.find((p) => p.id === id)!);
  return local;
}

export const LOCAL_ONBOARDING = LOCAL_AUTH;
