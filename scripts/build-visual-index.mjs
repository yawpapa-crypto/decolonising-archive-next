#!/usr/bin/env node
/**
 * Offline visual index. Run from cron / after ingestion, never during a feed request.
 *   node scripts/build-visual-index.mjs [--limit 400] [--urls urls.txt]
 * For every legitimate image URL: fetch once, decode, record width/height, a 64-bit dHash
 * (duplicate and near-duplicate detection), a coarse dominant hue/luminance (composition only),
 * and mark failures so the feed never requests a dead URL again. No model, no paid API.
 * Reads URLs from data/catalogue/recommendation-visuals + urls file; merges into data/visual-index.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const OUT = "data/visual-index.json";
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const limit = Number(arg("--limit", 400));
const urlsFile = arg("--urls");

const urls = new Set();
if (urlsFile && existsSync(urlsFile)) readFileSync(urlsFile, "utf8").split(/\s+/).filter(Boolean).forEach((u) => urls.add(u));
const index = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

// Must mirror lib/home/discover-shared.ts: hash(canonicalUrl) as base36 under "i:".
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function canonical(value) {
  try {
    const u = new URL(value, "https://ared.design");
    if (u.hostname === "api.europeana.eu" && u.pathname.includes("thumbnail") && u.searchParams.get("uri")) return canonical(u.searchParams.get("uri"));
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|wskey$|api_key$)/i.test(k)) u.searchParams.delete(k);
    if (u.hostname === "upload.wikimedia.org" && u.pathname.includes("/thumb/") && /\/\d+px-[^/]+$/.test(u.pathname)) u.pathname = u.pathname.replace("/thumb/", "/").replace(/\/\d+px-[^/]+$/, "");
    u.hash = "";
    return u.href.replace(/^http:/, "https:").replace(/\/$/, "");
  } catch { return value; }
}
const keyOf = (url) => "i:" + fnv(canonical(url).replace(/\/(thumb|thumbs|small|medium|large|full|\d+x\d*|\d+,)(?=\/)/g, "")).toString(36);

async function analyse(buf) {
  const img = sharp(buf, { failOn: "none" });
  const meta = await img.metadata();
  const { data } = await img.clone().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  let dhash = ""; for (let i = 0; i < 64; i += 4) dhash += parseInt(bits.slice(i, i + 4), 2).toString(16);
  const px = await img.clone().resize(8, 8, { fit: "cover" }).removeAlpha().raw().toBuffer();
  let r = 0, g = 0, b = 0; for (let i = 0; i < px.length; i += 3) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
  const n = px.length / 3; r /= n * 255; g /= n * 255; b /= n * 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { w: meta.width, h: meta.height, dhash, hue: Math.round(((h * 60) + 360) % 360), lum: +((mx + mn) / 2).toFixed(2) };
}

let done = 0, skipped = 0;
const queue = [...urls].slice(0, limit);
async function work(url) {
  const key = keyOf(url);
  if (index[key]?.dhash && Date.now() - (index[key].at || 0) < 30 * 864e5) return;
  try {
    let buf;
    if (url.startsWith("/")) buf = readFileSync("public" + url);
    else {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "ARED-visual-index/1.0 (+https://ared.design)" } });
      // Only 404/410 (gone) or a 200 that is not an image prove the image is dead. 403/429/5xx can be
      // a proxy, rate limit or outage, so they are skipped and retried rather than recorded.
      if (res.status === 404 || res.status === 410 || (res.ok && !(res.headers.get("content-type") || "").startsWith("image/"))) throw Object.assign(new Error(String(res.status)), { definite: true });
      if (!res.ok) throw new Error(String(res.status));
      buf = Buffer.from(await res.arrayBuffer());
    }
    index[key] = { ...(await analyse(buf)), sha1: createHash("sha1").update(buf).digest("hex").slice(0, 16), at: Date.now() };
  } catch (e) {
    // Only a definite answer from the host marks an image failed. No network, a timeout or a
    // DNS error says nothing about the image, so it is skipped and retried next run.
    if (e && e.definite) index[key] = { failed: true, at: Date.now(), error: String(e.message).slice(0, 60) };
    else { skipped++; return; }
  }
  if (++done % 50 === 0) writeFileSync(OUT, JSON.stringify(index));
}
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await work(queue.shift()); }));
writeFileSync(OUT, JSON.stringify(index));
console.log(`skipped ${skipped} (unreachable); indexed ${done} images; ${Object.values(index).filter((v) => v.failed).length} marked failed; ${Object.keys(index).length} total`);
