/**
 * Following ranker. Pure, deterministic, token-free: no database, network or LLM.
 * Pipeline: candidates -> score -> diversity rerank -> mix -> access filter -> dedupe.
 * Every score component is kept so a developer can answer "why did this appear?".
 * An optional external candidate source (for example a future Gorse service) can be passed in;
 * if it is absent or throws, the feed is unchanged.
 */
export const FEED_CONFIG = {
  weights: { direct: 100, collectionFollow: 90, orgFollow: 70, secondDegree: 28, shared: 20, discovery: 10, actorAffinity: 14, knowledge: 16, freshness: 24, significance: 1, novelty: 4, external: 12 },
  significance: { collection_published: 22, records_added: 20, path_published: 22, record_contributed: 18, records_connected: 14, source_added: 16, collection_updated: 9, public_save: 3, profile_update: 0 } as Record<string, number>,
  /** Share of the page given to each pool. Direct is never allowed to fall below 70%. */
  mix: { direct: 0.76, secondDegree: 0.15, discovery: 0.09 },
  freshnessHalfLifeHours: 72,
  aggregateWindowHours: 36,
  actorCap: 2,          // max events by one actor in any window of `capWindow`
  collectionCap: 2,
  capWindow: 6,
  actorSaturation: 14,
  collectionSaturation: 10,
  repetition: 12,
  seenPenalty: 30,
  negative: 60,
  moduleEvery: 9,       // one discovery module after roughly this many events
  followerCountWeight: 0.2, // deliberately tiny: popularity must never dominate
} as const;

export type EventType = keyof typeof FEED_CONFIG.significance;
export type Pool = "direct" | "collection" | "secondDegree" | "discovery";

export interface FeedEvent {
  id: string;
  actor: string;            // entity id
  type: EventType;
  collection?: string;      // collection id
  at: string | number;      // ISO or ms
  itemIds: string[];
  areas?: string[];         // knowledge areas / regions, lower-case
  public: boolean;          // false => never shown
  accessible?: boolean;     // final access filter result
}
export interface Viewer {
  follows: string[];                 // entity or collection ids the viewer chose
  interests: string[];               // knowledge areas
  affinity?: Record<string, number>; // actor -> 0..1 learned from meaningful opens only
  seen?: string[];                   // event ids already meaningfully shown
  less?: string[];                   // actors / collections the viewer asked to see less of
  more?: string[];
  external?: string[];                // event ids suggested by an optional external recommender, best first
  graph?: Record<string, string[]>;  // entity -> entities it follows or collects from (second degree)
  now?: number;
}
export interface Parts { direct: number; collection: number; secondDegree: number; actorAffinity: number; knowledge: number; freshness: number; significance: number; novelty: number; external: number; saturation: number; repetition: number; seen: number; negative: number }
export interface Scored { event: FeedEvent; pool: Pool; score: number; parts: Parts; reason: string; position?: number }

const ms = (t: string | number) => (typeof t === "number" ? t : Date.parse(t));

/** Merge bursts by the same actor on the same collection and type into one event. */
export function aggregate(events: FeedEvent[], windowHours: number = FEED_CONFIG.aggregateWindowHours): FeedEvent[] {
  const sorted = [...events].sort((a, b) => ms(b.at) - ms(a.at) || a.id.localeCompare(b.id));
  const out: FeedEvent[] = [];
  for (const e of sorted) {
    const hit = out.find((o) => o.actor === e.actor && o.type === e.type && o.collection === e.collection && Math.abs(ms(o.at) - ms(e.at)) <= windowHours * 3600e3);
    if (hit) hit.itemIds = [...new Set([...hit.itemIds, ...e.itemIds])];
    else out.push({ ...e, itemIds: [...e.itemIds] });
  }
  return out;
}

export function classify(e: FeedEvent, v: Viewer): { pool: Pool; reason: string } {
  const f = new Set(v.follows);
  if (f.has(e.actor)) return { pool: "direct", reason: "From someone you follow." };
  if (e.collection && f.has(e.collection)) return { pool: "collection", reason: "From a collection you follow." };
  const near = (v.follows ?? []).filter((x) => (v.graph?.[x] ?? []).includes(e.actor));
  if (near.length) return { pool: "secondDegree", reason: near.length > 1 ? "Followed by people you follow." : "Connected to someone you follow." };
  const shared = (e.areas ?? []).filter((a) => v.interests.includes(a));
  if (shared.length) return { pool: "discovery", reason: `Connected to your interest in ${shared[0]}.` };
  return { pool: "discovery", reason: "Related to material across the archive." };
}

/** Small, bounded nudge for an external suggestion: it can reorder close calls, never override a direct follow. */
function externalBoost(id: string, v: Viewer): number {
  const i = (v.external ?? []).indexOf(id);
  return i < 0 ? 0 : FEED_CONFIG.weights.external * (1 - i / Math.max(1, (v.external ?? []).length));
}

export function score(e: FeedEvent, v: Viewer): Scored {
  const W = FEED_CONFIG.weights;
  const { pool, reason } = classify(e, v);
  const now = v.now ?? Date.now();
  const ageH = Math.max(0, (now - ms(e.at)) / 3600e3);
  const shared = (e.areas ?? []).filter((a) => v.interests.includes(a)).length;
  const parts: Parts = {
    direct: pool === "direct" ? W.direct : 0,
    collection: pool === "collection" ? W.collectionFollow : 0,
    secondDegree: pool === "secondDegree" ? W.secondDegree : pool === "discovery" ? W.discovery : 0,
    actorAffinity: W.actorAffinity * (v.affinity?.[e.actor] ?? 0) + ((v.more ?? []).includes(e.actor) ? W.actorAffinity : 0),
    knowledge: Math.min(2, shared) * (W.knowledge / 2),
    freshness: W.freshness * Math.pow(0.5, ageH / FEED_CONFIG.freshnessHalfLifeHours),
    significance: (FEED_CONFIG.significance[e.type] ?? 0) * W.significance + Math.min(8, e.itemIds.length),
    novelty: pool === "discovery" ? W.novelty : 0,
    external: externalBoost(e.id, v),
    saturation: 0,
    repetition: 0,
    seen: (v.seen ?? []).includes(e.id) ? -FEED_CONFIG.seenPenalty : 0,
    negative: (v.less ?? []).includes(e.actor) || (e.collection && (v.less ?? []).includes(e.collection)) ? -FEED_CONFIG.negative : 0,
  };
  const s = Object.values(parts).reduce((a, b) => a + b, 0);
  return { event: e, pool, score: s, parts, reason };
}

/** Greedy rerank: applies actor and collection saturation as the page is built. */
export function rerank(rows: Scored[]): Scored[] {
  const pool = [...rows].sort((a, b) => b.score - a.score || a.event.id.localeCompare(b.event.id));
  const out: Scored[] = [];
  const C = FEED_CONFIG;
  while (pool.length) {
    const recent = out.slice(-C.capWindow);
    let pick = -1, best = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const r = pool[i];
      const a = recent.filter((x) => x.event.actor === r.event.actor).length;
      const c = r.event.collection ? recent.filter((x) => x.event.collection === r.event.collection).length : 0;
      const capped = a >= C.actorCap || c >= C.collectionCap;
      const adj = r.score - a * C.actorSaturation - c * C.collectionSaturation - (out.some((x) => x.event.type === r.event.type && x.event.actor === r.event.actor) ? C.repetition * 0.25 : 0);
      const eff = capped ? adj - 1000 : adj;
      if (eff > best) { best = eff; pick = i; }
    }
    const r = pool.splice(pick, 1)[0];
    const a = recent.filter((x) => x.event.actor === r.event.actor).length;
    const c = r.event.collection ? recent.filter((x) => x.event.collection === r.event.collection).length : 0;
    r.parts.saturation = -(a * C.actorSaturation + c * C.collectionSaturation);
    r.score += r.parts.saturation;
    out.push(r);
  }
  return out;
}

export type FeedRow = { kind: "event"; row: Scored } | { kind: "module"; id: string; title: string; entities: string[] };

export interface MixOptions { moduleEntities?: string[]; moduleTitle?: string; externalCandidates?: () => FeedEvent[] }

/** Final feed: filter -> score -> rerank -> mix pools to target shares -> insert discovery modules. */
export function buildFeed(events: FeedEvent[], viewer: Viewer, opts: MixOptions = {}): FeedRow[] {
  let extra: FeedEvent[] = [];
  try { extra = opts.externalCandidates?.() ?? []; } catch { extra = []; } // optional service failing must never break Following
  const allowed = aggregate([...events, ...extra].filter((e) => e.public && e.accessible !== false));
  const scored = allowed.map((e) => score(e, viewer));
  const direct = rerank(scored.filter((s) => s.pool === "direct" || s.pool === "collection"));
  const second = rerank(scored.filter((s) => s.pool === "secondDegree"));
  const disc = rerank(scored.filter((s) => s.pool === "discovery"));
  const hasFollows = viewer.follows.length > 0;
  const M = FEED_CONFIG.mix;
  const total = direct.length + second.length + disc.length;
  const merged: Scored[] = [];
  const di = { d: 0, s: 0, x: 0 };
  for (let n = 0; n < total; n++) {
    // Each slot goes to the pool furthest behind its target share; direct wins ties.
    const want = hasFollows ? M : { direct: 0, secondDegree: 0.4, discovery: 0.6 };
    const share = (k: "d" | "s" | "x", t: number) => (n + 1) * t - di[k];
    const cand: Array<["d" | "s" | "x", number, Scored[]]> = [["d", share("d", want.direct), direct], ["s", share("s", want.secondDegree), second], ["x", share("x", want.discovery), disc]];
    const avail = cand.filter((c) => di[c[0]] < c[2].length);
    if (!avail.length) break;
    avail.sort((a, b) => b[1] - a[1] || (a[0] === "d" ? -1 : 1));
    const [k, , list] = avail[0];
    merged.push(list[di[k]++]);
  }
  const rows: FeedRow[] = [];
  let sinceModule = 0, modules = 0;
  merged.forEach((r, i) => {
    r.position = i;
    rows.push({ kind: "event", row: r });
    sinceModule++;
    if (opts.moduleEntities?.length && sinceModule >= FEED_CONFIG.moduleEvery && i < merged.length - 1) {
      rows.push({ kind: "module", id: `m${modules++}`, title: opts.moduleTitle ?? "People connected to what you're exploring", entities: opts.moduleEntities });
      sinceModule = 0;
    }
  });
  return rows;
}

/** Who to follow: knowledge overlap and graph proximity; follower count is a tiny tiebreak, never a driver. */
export interface Candidate { id: string; areas: string[]; followers?: number; followedBy?: string[]; regions?: string[] }
export function whoToFollow(cands: Candidate[], v: Viewer, limit = 8) {
  const f = new Set(v.follows);
  const rows = cands.filter((c) => !f.has(c.id)).map((c) => {
    const shared = c.areas.filter((a) => v.interests.includes(a));
    const social = (c.followedBy ?? []).filter((x) => f.has(x)).length;
    const pop = Math.log10(1 + (c.followers ?? 0)) * FEED_CONFIG.followerCountWeight;
    const s = shared.length * 12 + social * 9 + pop;
    const reason = social ? (social > 1 ? "Followed by people you follow." : "Followed by someone you follow.") : shared.length ? `Works on ${shared[0]}, one of your interests.` : "Editorial selection.";
    return { id: c.id, score: s, reason, shared };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // Diversity: no more than two picks that share the same first knowledge area.
  const used: Record<string, number> = {};
  const out: typeof rows = [];
  for (const r of rows) {
    const k = r.shared[0] ?? "_";
    if ((used[k] = (used[k] ?? 0) + 1) > 2) continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
