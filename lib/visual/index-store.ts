import "server-only";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { dupKeys, type DiscoverItem } from "@/lib/home/discover-shared";
import { describe, type IndexEntry, type VDesc } from "./describe";

/**
 * Read-only view of the offline visual index (data/visual-index.json), built by
 * scripts/build-visual-index.mjs. Feed requests only ever read this; they never fetch,
 * decode or embed an image.
 */
const FILE = join(process.cwd(), "data", "visual-index.json");
let cache: { at: number; data: Record<string, IndexEntry> } = { at: -1, data: {} };

export function imageKey(url: string): string {
  return dupKeys({ id: "", title: "", image: url }).find((k) => k.startsWith("i:")) || url;
}

function load(): Record<string, IndexEntry> {
  try {
    if (!existsSync(FILE)) return {};
    const m = statSync(FILE).mtimeMs;
    if (m !== cache.at) cache = { at: m, data: JSON.parse(readFileSync(FILE, "utf8")) };
    return cache.data;
  } catch {
    return {};
  }
}

import { liveEntry } from "./live-hash";
import { getSupabase } from "@/src/lib/supabase";

/** public.visual_assets (filled nightly by /api/visual/resolve), refreshed in the background hourly. */
let db: { at: number; data: Record<string, IndexEntry>; loading?: boolean } = { at: 0, data: {} };
function refreshDb() {
  if (db.loading || Date.now() - db.at < 3600e3 || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  db.loading = true;
  (async () => {
    const next: Record<string, IndexEntry> = {};
    for (let from = 0; from < 50000; from += 1000) {
      const { data, error } = await getSupabase().from("visual_assets").select("image_key,width,height,dhash,hue,lum,failed_at").range(from, from + 999);
      if (error) throw error;
      for (const r of data ?? []) next[r.image_key] = { w: r.width ?? undefined, h: r.height ?? undefined, dhash: r.dhash ?? undefined, hue: r.hue ?? undefined, lum: r.lum ?? undefined, failed: Boolean(r.failed_at) || undefined };
      if (!data || data.length < 1000) break;
    }
    db = { at: Date.now(), data: next };
  })().catch(() => { db = { ...db, at: Date.now() - 3000e3 }; }).finally(() => { db.loading = false; });
}

export const indexEntry = (url?: string): IndexEntry | undefined => {
  if (!url) return undefined;
  refreshDb();
  const k = imageKey(url);
  return load()[k] ?? db.data[k] ?? liveEntry(url);
};

export function describeItem(i: DiscoverItem): VDesc {
  return describe(i, indexEntry(i.image), (x) => dupKeys(x as DiscoverItem));
}

/** Exposure accounting: soft, in-process, decaying. Long-tail records get their turn. */
const exposure = new Map<string, { n: number; at: number }>();
const HALF = 6 * 3600 * 1000;
export function exposureOf(id: string, now = Date.now()): number {
  const e = exposure.get(id);
  if (!e) return 0;
  return e.n * Math.pow(0.5, (now - e.at) / HALF);
}
export function recordExposure(ids: string[], now = Date.now()) {
  for (const id of ids) exposure.set(id, { n: exposureOf(id, now) + 1, at: now });
  if (exposure.size > 20000) for (const k of [...exposure.keys()].slice(0, 5000)) exposure.delete(k);
}
