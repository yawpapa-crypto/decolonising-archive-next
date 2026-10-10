import type { VisualProvenance } from "./describe";

/**
 * PRIMARY + ALTERNATIVE visuals. A record never permanently takes image[0]:
 * provenance and curatorial preference decide first; only among equals does the
 * algorithm (usability, proportion, recent exposure, feed context) choose.
 */
export type VisualOption = {
  url: string;
  /** Chosen by an ARED curator. */
  curated?: boolean;
  /** Marked primary by the source institution. */
  sourcePrimary?: boolean;
  w?: number;
  h?: number;
  provenance?: VisualProvenance;
  /** How many times this exact image was shown recently. */
  exposure?: number;
};

export type PickContext = { seed: string; prefer?: "portrait" | "landscape" | "any" };

const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function pickVisual(options: VisualOption[], ctx: PickContext): { primary?: VisualOption; alternatives: VisualOption[]; why: string } {
  const live = options.filter((o) => o.url);
  if (!live.length) return { alternatives: [], why: "no visual" };
  const tier = (o: VisualOption) => (o.curated ? 3 : o.sourcePrimary ? 2 : 1);
  const top = Math.max(...live.map(tier));
  const equals = live.filter((o) => tier(o) === top);
  const score = (o: VisualOption) => {
    const m = o.w && o.h ? Math.min(o.w, o.h) : 500;
    const res = m >= 800 ? 1 : m >= 500 ? 0.75 : m >= 300 ? 0.5 : 0.2;
    const ar = o.w && o.h ? o.w / o.h : 1;
    const fit = ctx.prefer === "portrait" ? (ar < 0.95 ? 0.3 : 0) : ctx.prefer === "landscape" ? (ar > 1.05 ? 0.3 : 0) : 0;
    const conf = o.provenance?.confidence ?? 0.8;
    return res + fit + 0.4 * conf - 0.35 * Math.min(3, o.exposure ?? 0) + (fnv(ctx.seed + o.url) % 100) / 1e4;
  };
  const ranked = [...equals].sort((a, b) => score(b) - score(a));
  const primary = ranked[0];
  const why = top === 3 ? "curated primary" : top === 2 ? "source primary" : equals.length > 1 ? "best usable of equal candidates" : "only candidate";
  return { primary, alternatives: live.filter((o) => o !== primary), why };
}
