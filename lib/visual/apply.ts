import "server-only";
import type { DiscoverItem } from "@/lib/home/discover-shared";
import { compose, type Cand, type ComposeOpts, type Placement } from "./compose";
import { gate, hamming, type VDesc } from "./describe";
import { pickVisual } from "./select";
import { describeItem, exposureOf, indexEntry, recordExposure } from "./index-store";
import { warmHashes } from "./live-hash";
import { takeFresh } from "@/lib/home/discover-shared";

const tails = new Map<string, VDesc[]>();
export const recallTail = (key: string) => tails.get(key) || [];
function rememberTail(key: string, d: VDesc[]) {
  tails.set(key, d.slice(-40));
  if (tails.size > 2000) for (const k of [...tails.keys()].slice(0, 500)) tails.delete(k);
}

export type SequenceOpts = Pick<ComposeOpts, "n" | "seed" | "explicit" | "breadth" | "pool" | "lookahead"> & {
  /** Knowledge relevance for each candidate. Never derived from the image. */
  knowledge: (i: DiscoverItem, index: number) => number;
  editorial?: (i: DiscoverItem) => boolean;
  /** Where to read the previous batch's tail from, and where to store this one for the next. */
  tailIn?: string;
  tailOut?: string;
};

/**
 * Visual selection + composition for a relevance-qualified candidate list:
 * 1. gate unusable images (broken, placeholder, tiny) — items that need a picture are dropped,
 *    others fall back to the designed typographic tile;
 * 2. fill real proportions from the index so masonry slots match the picture;
 * 3. sequence the window for rhythm, bounded so relevance still leads.
 */
export function sequence(items: DiscoverItem[], o: SequenceOpts): { items: DiscoverItem[]; trace: Array<Placement & { title: string; form: string; orient: string; cluster: string; indexed: boolean }> } {
  const ready: DiscoverItem[] = [];
  items.forEach((it0) => {
    let it = it0;
    if (it.visuals?.length) {
      const pick = pickVisual(it.visuals.filter((v) => gate({ ...it0, image: v.url }, indexEntry(v.url)).ok), { seed: o.seed + it.id });
      if (pick.primary) it = { ...it, image: pick.primary.url, visual: pick.primary.provenance ?? it.visual, ar: pick.primary.w && pick.primary.h ? +(pick.primary.w / pick.primary.h).toFixed(3) : it.ar };
    }
    const idx = indexEntry(it.image);
    const g = gate(it, idx);
    if (!g.ok) {
      if (it.kind === "image" || it.kind === "object") return;
      ready.push({ ...it, image: undefined, ar: undefined });
      return;
    }
    const ar = it.ar ?? (idx?.w && idx?.h ? +(idx.w / idx.h).toFixed(3) : undefined);
    ready.push(ar === it.ar ? it : { ...it, ar });
  });
  // Same picture twice in one request (any provider, any URL): keep the first.
  // …or the same picture as one just shown on the previous page.
  const hashes: string[] = (o.tailIn ? recallTail(o.tailIn) : []).map((d) => d.dhash).filter((h): h is string => Boolean(h));
  const unique = ready.filter((it) => {
    const h = indexEntry(it.image)?.dhash;
    if (!h) return true;
    if (hashes.some((x) => hamming(x, h) <= 6)) return false;
    hashes.push(h);
    return true;
  });
  ready.length = 0;
  ready.push(...unique);
  const byId = new Map(ready.map((i) => [i.id, i]));
  const cands: Cand[] = ready.map((it, k) => ({
    id: it.id,
    knowledge: o.knowledge(it, k),
    desc: describeItem(it),
    exposure: exposureOf(it.id),
    editorial: o.editorial?.(it),
  }));
  // Compose a little past n so the per-collection cap below still leaves a full batch.
  const composed = compose(cands, { ...o, n: Math.ceil(o.n * 1.3), tail: o.tailIn ? recallTail(o.tailIn) : [] });
  // One photographer's studio series reads as the same picture over and over: cap each
  // digitised collection per batch (one per Endangered Archives project, three per Europeana partner museum).
  const perBatch = new Map<string, number>();
  const order = composed.order.filter((c) => {
    const g = seriesOf(byId.get(c.id)?.image);
    if (!g) return true;
    const n = perBatch.get(g.key) || 0;
    if (n >= g.cap) return false;
    perBatch.set(g.key, n + 1);
    return true;
  });
  order.splice(o.n);
  const kept = new Set(order.map((c) => c.id));
  const trace = composed.trace.filter((t) => kept.has(t.id));
  recordExposure(order.map((c) => c.id));
  if (o.tailOut) rememberTail(o.tailOut, order.map((c) => c.desc));
  const meta = new Map(cands.map((c) => [c.id, c.desc]));
  return {
    items: order.map((c) => byId.get(c.id)!),
    trace: trace.map((t) => ({ ...t, title: byId.get(t.id)!.title, form: meta.get(t.id)!.form, orient: meta.get(t.id)!.orient, cluster: meta.get(t.id)!.cluster, indexed: Boolean(indexEntry(byId.get(t.id)!.image)) })),
  };
}

function seriesOf(url?: string): { key: string; cap: number } | null {
  if (!url) return null;
  try {
    let u = new URL(url);
    const viaEuropeana = u.hostname === "api.europeana.eu" && Boolean(u.searchParams.get("uri"));
    if (viaEuropeana) u = new URL(u.searchParams.get("uri")!);
    const eap = u.href.match(/\b(EAP\d+)\b/i);
    if (eap) return { key: "eap:" + eap[1].toUpperCase(), cap: 1 };
    return viaEuropeana ? { key: "host:" + u.hostname, cap: 3 } : null;
  } catch {
    return null;
  }
}

/**
 * For boards and collection pages that are not composed by the feed: drop records that are the
 * same picture (same file, numbered series, or a near-identical image from another provider),
 * and keep a single photographer's studio series from filling the board.
 */
export async function distinctPictures(items: DiscoverItem[], seriesCap = 2): Promise<DiscoverItem[]> {
  await warmHashes(items.map((i) => i.image), 4000, 16).catch(() => undefined);
  const keys = new Set<string>();
  const hashes: string[] = [];
  const perSeries = new Map<string, number>();
  return items.filter((it) => {
    if (!takeFresh(it, keys)) return false;
    const h = indexEntry(it.image)?.dhash;
    if (h && hashes.some((x) => hamming(x, h) <= 6)) return false;
    const g = seriesOf(it.image);
    if (g?.key.startsWith("eap:")) {
      const n = perSeries.get(g.key) || 0;
      if (n >= seriesCap) return false;
      perSeries.set(g.key, n + 1);
    }
    if (h) hashes.push(h);
    return true;
  });
}
