import "server-only";
import { imageKey } from "./index-store";
import type { IndexEntry } from "./describe";

/**
 * On-demand perceptual hashing for pictures the offline index has not seen yet.
 * Bounded: small thumbnails only, hard time budget, in-process cache. It exists so the same
 * picture arriving from two providers (different URLs) is still recognised as one.
 */
const live = new Map<string, IndexEntry>();
export const liveEntry = (url?: string) => (url ? live.get(imageKey(url)) : undefined);

async function hashOne(url: string, signal: AbortSignal): Promise<IndexEntry | null> {
  const res = await fetch(url, { signal, headers: { "User-Agent": "ARED-visual/1.0 (+https://ared.design)", Accept: "image/*" } });
  if (!res.ok) return null;
  const len = Number(res.headers.get("content-length") || 0);
  if (len > 6_000_000) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "none" });
  const meta = await img.metadata();
  const { data } = await img.clone().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  let dhash = "";
  for (let i = 0; i < 64; i += 4) dhash += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return { w: meta.width, h: meta.height, dhash, at: Date.now() } as IndexEntry;
}

export async function warmHashes(urls: Array<string | undefined>, budgetMs = 2200, concurrency = 12) {
  const todo = [...new Set(urls.filter((u): u is string => Boolean(u) && /^https?:/.test(u!)))].filter((u) => !live.has(imageKey(u)));
  if (!todo.length) return;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), budgetMs);
  let next = 0;
  const run = async () => {
    while (next < todo.length && !stop.signal.aborted) {
      const url = todo[next++];
      try {
        const e = await hashOne(url, stop.signal);
        if (e) live.set(imageKey(url), e);
      } catch { /* slow or unreadable: the picture simply isn't hashed this time */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, run));
  clearTimeout(timer);
  if (live.size > 6000) for (const k of [...live.keys()].slice(0, 1500)) live.delete(k);
}
