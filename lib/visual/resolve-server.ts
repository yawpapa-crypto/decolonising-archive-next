import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getSupabase } from "@/src/lib/supabase";
import { imageKey } from "./index-store";

/**
 * Server-side twin of scripts/resolve-visuals.mjs, run nightly by Vercel Cron
 * (/api/visual/resolve). Collects legitimate images from ARED's museum caches, analyses only
 * the ones public.visual_assets does not have yet, and upserts them. Nobody has to run a script.
 */
type Row = {
  record_key: string; image_key: string; is_primary: boolean; provider: string; source_url: string | null;
  record_url: string | null; image_url: string; provider_id: string | null; licence: string | null;
  attribution: string | null; retrieved_at: string; match_confidence: number; resolver_method: string;
  width: number | null; height: number | null; dhash: string | null; sha1: string | null;
  hue: number | null; lum: number | null; failed_at: string | null;
};
type Cand = Omit<Row, "image_key" | "retrieved_at" | "width" | "height" | "dhash" | "sha1" | "hue" | "lum" | "failed_at">;

function scan(dir: string, fn: (o: Record<string, unknown>, id: string) => void) {
  const d = join(process.cwd(), dir);
  if (!existsSync(d)) return;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".json"))) {
    try { fn(JSON.parse(readFileSync(join(d, f), "utf8")), f.replace(".json", "")); } catch { /* unreadable cache file */ }
  }
}

export function collectCandidates(): Cand[] {
  const out: Cand[] = [];
  scan("data/catalogue/cache/met", (o, id) => {
    const url = (o.primaryImageSmall || o.primaryImage) as string | undefined;
    if (!o.isPublicDomain || !url) return;
    out.push({ record_key: `met:${id}`, image_url: url, provider: "The Metropolitan Museum of Art", source_url: (o.objectURL as string) ?? null, record_url: (o.objectURL as string) ?? null, provider_id: id, licence: "CC0 / public domain", attribution: (o.creditLine as string) ?? null, match_confidence: 1, resolver_method: "museum-api-cache", is_primary: true });
  });
  scan("data/catalogue/cache/cleveland", (o, id) => {
    if (o.license !== "CC0" || !o.url) return;
    const page = `https://www.clevelandart.org/art/${id}`;
    out.push({ record_key: `cleveland:${id}`, image_url: o.url as string, provider: "Cleveland Museum of Art", source_url: page, record_url: page, provider_id: id, licence: "CC0", attribution: null, match_confidence: 1, resolver_method: "museum-api-cache", is_primary: true });
  });
  return out;
}

async function analyse(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal, headers: { "User-Agent": "ARED-visual-index/1.0 (+https://ared.design)" } });
  const type = res.headers.get("content-type") || "";
  if (res.status === 404 || res.status === 410 || (res.ok && !type.startsWith("image/"))) return { failed: true as const };
  if (!res.ok) return null; // 403/429/5xx says nothing about the image: retry next night
  const buf = Buffer.from(await res.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "none" });
  const meta = await img.metadata();
  const { data } = await img.clone().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  let dhash = "";
  for (let i = 0; i < 64; i += 4) dhash += parseInt(bits.slice(i, i + 4), 2).toString(16);
  const px = await img.clone().resize(8, 8, { fit: "cover" }).removeAlpha().raw().toBuffer();
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < px.length; i += 3) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
  const n = px.length / 3; r /= n * 255; g /= n * 255; b /= n * 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { w: meta.width ?? null, h: meta.height ?? null, dhash, sha1: createHash("sha1").update(buf).digest("hex").slice(0, 16), hue: Math.round((h * 60 + 360) % 360), lum: +((mx + mn) / 2).toFixed(2) };
}

/** Resolve up to `limit` new images within `budgetMs`, then upsert. Returns a summary for the cron log. */
export async function resolveNewVisuals(limit = 200, budgetMs = 45000) {
  const db = getSupabase();
  const known = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("visual_assets").select("record_key,image_key").range(from, from + 999);
    if (error) throw new Error(error.message);
    (data ?? []).forEach((r) => known.add(`${r.record_key}|${r.image_key}`));
    if (!data || data.length < 1000) break;
  }
  const todo = collectCandidates().filter((c) => !known.has(`${c.record_key}|${imageKey(c.image_url)}`)).slice(0, limit);
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), budgetMs);
  const rows: Row[] = [];
  let next = 0, skipped = 0;
  const now = new Date().toISOString();
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < todo.length && !stop.signal.aborted) {
      const c = todo[next++];
      try {
        const a = await analyse(c.image_url, stop.signal);
        if (!a) { skipped++; continue; }
        rows.push({ ...c, image_key: imageKey(c.image_url), retrieved_at: now, width: "failed" in a ? null : a.w, height: "failed" in a ? null : a.h, dhash: "failed" in a ? null : a.dhash, sha1: "failed" in a ? null : a.sha1, hue: "failed" in a ? null : a.hue, lum: "failed" in a ? null : a.lum, failed_at: "failed" in a ? now : null });
      } catch { skipped++; }
    }
  }));
  clearTimeout(timer);
  if (rows.length) {
    const { error } = await db.from("visual_assets").upsert(rows, { onConflict: "record_key,image_key" });
    if (error) throw new Error(error.message);
  }
  return { candidates: todo.length, resolved: rows.filter((r) => !r.failed_at).length, failed: rows.filter((r) => r.failed_at).length, skipped, alreadyKnown: known.size };
}
