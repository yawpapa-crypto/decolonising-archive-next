import { hamming, type VDesc } from "./describe";

/**
 * VISUAL COMPOSITION. Knowledge selection has already happened: this only sequences a
 * relevance-qualified pool. Nothing here can promote an irrelevant record past `lookahead`
 * positions, and image quality is a bounded nudge, never a ranking driver.
 */
export type Cand = {
  id: string;
  /** Knowledge relevance, higher is better. Any scale. */
  knowledge: number;
  desc: VDesc;
  /** Times shown recently across feeds (exposure accounting). */
  exposure?: number;
  editorial?: boolean;
};

export type ComposeOpts = {
  n: number;
  seed: string;
  /** Records that may be considered: the top-K by knowledge. */
  pool?: number;
  /** A candidate may move at most this many places forward from its relevance rank. */
  lookahead?: number;
  /** Descriptors of what was already shown (previous batch tail), oldest first. */
  tail?: VDesc[];
  /** Dimensions the visitor explicitly chose; these are never diversified away. */
  explicit?: Array<"region" | "source" | "form">;
  /** Explore wants breadth; For You wants relevance with variation. */
  breadth?: number;
  weights?: Partial<typeof W>;
};

export const W = {
  knowledge: 10,
  quality: 1.4,
  novelty: 0.6,
  underExposed: 0.8,
  visualSim: 2.4,
  clusterRun: 0.9,
  formRun: 1.3,
  orientRun: 1.0,
  sourceRun: 1.1,
  creatorRun: 1.2,
  regionRun: 0.9,
  colour: 0.15,
  overExposed: 0.9,
  duplicate: 60,
  fallbackRun: 1.2,
} as const;

export type Placement = {
  id: string;
  position: number;
  originalRank: number;
  knowledge: number;
  components: Record<string, number>;
  reason: string;
};

const SIM = 10; // dHash bits: at or under this, images read as the same picture
const DUP = 5;

function fnv(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function runPenalty(desc: VDesc, recent: VDesc[], pick: (d: VDesc) => string, weight: number) {
  const v = pick(desc);
  if (!v) return 0;
  let run = 0;
  for (let i = recent.length - 1; i >= 0 && run < 3; i--) {
    if (pick(recent[i]) === v) run++; else break;
  }
  // 1 → mild, 2 → strong, 3 → saturating
  return weight * (run === 0 ? 0 : run === 1 ? 0.35 : run === 2 ? 1 : 1.5);
}

export function compose(cands: Cand[], o: ComposeOpts): { order: Cand[]; trace: Placement[] } {
  const w = { ...W, ...o.weights };
  const sorted = [...cands].sort((a, b) => b.knowledge - a.knowledge || fnv(o.seed + a.id) - fnv(o.seed + b.id));
  const pool = sorted.slice(0, o.pool ?? 240).map((c, rank) => ({ c, rank }));
  if (!pool.length) return { order: [], trace: [] };
  const hi = pool[0].c.knowledge, lo = pool[pool.length - 1].c.knowledge;
  const span = hi - lo || 1;
  const look = o.lookahead ?? 24;
  const breadth = o.breadth ?? 1;
  const explicit = new Set(o.explicit || []);
  const placed: VDesc[] = [];
  const history: VDesc[] = [...(o.tail || [])];
  const order: Cand[] = [];
  const trace: Placement[] = [];
  const remaining = pool.slice();
  const claimed = new Set<string>();
  for (const t of history) for (const k of t.dupKeys) claimed.add(k);

  while (remaining.length && order.length < o.n) {
    const recent = history.slice(-3);
    const near = history.slice(-40);
    let bestI = 0, bestS = -Infinity, bestC: Record<string, number> = {};
    const upto = Math.min(look, remaining.length);
    for (let i = 0; i < upto; i++) {
      const { c } = remaining[i];
      const d = c.desc;
      const k = (c.knowledge - lo) / span;
      let dupe = 0;
      if (d.dupKeys.some((x) => claimed.has(x))) dupe = w.duplicate;
      let sim = 0;
      for (const r of recent) {
        const hd = hamming(d.dhash, r.dhash);
        if (hd <= SIM) sim = Math.max(sim, 1 - hd / (SIM + 1));
      }
      if (d.dhash) for (const r of near) if (hamming(d.dhash, r.dhash) <= DUP) dupe = Math.max(dupe, w.duplicate * 0.5);
      const comp = {
        knowledge: w.knowledge * k,
        quality: w.quality * d.quality,
        novelty: c.editorial ? w.novelty : 0,
        underExposed: (c.exposure ?? 0) === 0 && d.quality >= 0.6 ? w.underExposed * breadth : 0,
        overExposed: -w.overExposed * Math.min(3, c.exposure ?? 0) / 3 * breadth,
        visualSim: -w.visualSim * sim,
        clusterRun: -runPenalty(d, recent, (x) => x.cluster, w.clusterRun),
        formRun: -runPenalty(d, recent, (x) => x.form, w.formRun) * (explicit.has("form") ? 0 : 1),
        orientRun: -runPenalty(d, recent, (x) => (x.hasImage ? x.orient : ""), w.orientRun),
        sourceRun: -runPenalty(d, recent, (x) => x.source, w.sourceRun) * (explicit.has("source") ? 0 : breadth),
        creatorRun: -runPenalty(d, recent, (x) => x.creator, w.creatorRun),
        regionRun: explicit.has("region") ? 0 : -runPenalty(d, recent, (x) => x.region, w.regionRun) * breadth,
        fallbackRun: -runPenalty(d, recent, (x) => (x.hasImage ? "" : "fallback"), w.fallbackRun),
        colour: 0,
        duplicate: -dupe,
      };
      if (d.hue !== undefined && d.lum !== undefined) {
        const r = recent[recent.length - 1];
        if (r?.hue !== undefined && r.lum !== undefined) {
          const dh = Math.min(Math.abs(d.hue - r.hue), 360 - Math.abs(d.hue - r.hue)) / 180;
          comp.colour = -w.colour * (1 - dh) * (1 - Math.abs(d.lum - r.lum));
        }
      }
      // Seeded tie-break keeps order stable across requests that share a seed.
      const s = Object.values(comp).reduce((a, b) => a + b, 0) - (fnv(o.seed + c.id) % 1000) / 1e6;
      if (s > bestS) { bestS = s; bestI = i; bestC = comp; }
    }
    const [{ c, rank }] = remaining.splice(bestI, 1);
    placed.push(c.desc);
    history.push(c.desc);
    for (const k of c.desc.dupKeys) claimed.add(k);
    order.push(c);
    trace.push({
      id: c.id,
      position: order.length,
      originalRank: rank + 1,
      knowledge: c.knowledge,
      components: Object.fromEntries(Object.entries(bestC).map(([k, v]) => [k, +v.toFixed(3)])),
      reason: rank < order.length - 1
        ? `held back ${order.length - 1 - rank} places: a run of similar neighbours scored higher`
        : bestI > 0
          ? `moved up ${bestI} to break a visual run`
          : "kept relevance order",
    });
  }
  return { order, trace };
}
