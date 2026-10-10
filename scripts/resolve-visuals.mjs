#!/usr/bin/env node
/**
 * Ingestion-time visual resolver. Run after ingestion, on record update, or as a repair job:
 *   node scripts/resolve-visuals.mjs [--limit 600] [--push]
 * 1. Collects legitimate image URLs from ARED's own caches (Met public-domain, Cleveland CC0)
 *    with provider, record URL, licence and match confidence, so provenance is never lost.
 * 2. Runs the offline analyser (scripts/build-visual-index.mjs) for size, dHash and colour,
 *    and marks dead URLs failed.
 * 3. Writes data/visual-assets.json (the visual_assets rows) and, with --push and Supabase
 *    env present, upserts them into public.visual_assets. Feeds then read record.visual,
 *    never resolve on scroll.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2);
const limit = args.includes("--limit") ? args[args.indexOf("--limit") + 1] : "600";
const rows = [];
const now = new Date().toISOString();

function scan(dir, fn) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    try { fn(JSON.parse(readFileSync(`${dir}/${f}`, "utf8")), f.replace(".json", "")); } catch { /* skip unreadable */ }
  }
}
scan("data/catalogue/cache/met", (o, id) => {
  if (!o.isPublicDomain) return;
  const url = o.primaryImageSmall || o.primaryImage;
  if (!url) return;
  rows.push({ record_key: `met:${id}`, image_url: url, provider: "The Metropolitan Museum of Art", source_url: o.objectURL, record_url: o.objectURL, provider_id: id, licence: "CC0 / public domain", attribution: o.creditLine, match_confidence: 1, resolver_method: "museum-api-cache", is_primary: true,
    alts: (o.additionalImages || []).slice(0, 4) });
});
scan("data/catalogue/cache/cleveland", (o, id) => {
  if (o.license !== "CC0" || !o.url) return;
  rows.push({ record_key: `cleveland:${id}`, image_url: o.url, provider: "Cleveland Museum of Art", source_url: `https://www.clevelandart.org/art/${id}`, record_url: `https://www.clevelandart.org/art/${id}`, provider_id: id, licence: "CC0", match_confidence: 1, resolver_method: "museum-api-cache", is_primary: true });
});
const urls = rows.flatMap((r) => [r.image_url, ...(r.alts || [])]);
writeFileSync("data/visual-urls.txt", urls.join("\n"));
if (args.includes("--collect-only")) { console.log(`collected ${urls.length} urls → data/visual-urls.txt`); process.exit(0); }
// --skip-index reuses data/visual-index.json (built elsewhere, e.g. where sharp has a native build).
if (!args.includes("--skip-index")) execFileSync("node", ["scripts/build-visual-index.mjs", "--limit", limit, "--urls", "data/visual-urls.txt"], { stdio: "inherit" });
const index = JSON.parse(readFileSync("data/visual-index.json", "utf8"));
// Same key function as the feed (kept in sync with lib/home/discover-shared.ts).
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const key = (u) => "i:" + fnv(u.replace(/#.*/, "").replace(/^http:/, "https:").replace(/\/$/, "").replace(/\/(thumb|thumbs|small|medium|large|full|\d+x\d*|\d+,)(?=\/)/g, "")).toString(36);
const out = [];
for (const r of rows) {
  const e = index[key(r.image_url)] || {};
  // PostgREST bulk upserts need every row to carry the same columns.
  out.push({ record_key: r.record_key, image_key: key(r.image_url), is_primary: Boolean(r.is_primary), provider: r.provider, source_url: r.source_url ?? null, record_url: r.record_url ?? null, image_url: r.image_url, provider_id: r.provider_id != null ? String(r.provider_id) : null, licence: r.licence ?? null, attribution: r.attribution ?? null, retrieved_at: now, match_confidence: r.match_confidence ?? 1, resolver_method: r.resolver_method, width: e.w ?? null, height: e.h ?? null, dhash: e.dhash ?? null, sha1: e.sha1 ?? null, hue: e.hue ?? null, lum: e.lum ?? null, failed_at: e.failed ? now : null });
}
writeFileSync("data/visual-assets.json", JSON.stringify(out, null, 1));
console.log(`resolved ${out.length} visuals (${out.filter((x) => x.failed_at).length} failed) → data/visual-assets.json`);
if (args.includes("--push")) {
  const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/visual_assets?on_conflict=record_key,image_key`, { method: "POST", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(out) });
  console.log("push:", res.status, res.ok ? "ok" : await res.text());
}
