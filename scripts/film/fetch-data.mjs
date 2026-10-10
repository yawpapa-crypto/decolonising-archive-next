// Real data for the film's reconstructed interface moments: the opened record, its related records,
// local vs global collection images, and one real item of each kind from For You.
import { mkdirSync, writeFileSync } from "node:fs";
const B = "http://localhost:3000"; const D = "tmp/film/data"; mkdirSync(D, { recursive: true });
const post = async (p, body) => (await fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
const ex = await post("/api/explore", { page: 1, q: "adinkra", seen: [] });
const rec = ex.items.find((i) => /Adinkra sample/i.test(i.title)) || ex.items.find((i) => i.image);
const sim = await post("/api/for-you/similar", { item: rec, page: 1, seen: [] });
const global = await (await fetch(B + "/api/dev/dhash?collection=african-archives")).json();
const local = await (await fetch(B + "/api/dev/dhash?collection=ghana-graphic-design")).json();
const fy = await post("/api/for-you", { page: 1, seed: "film", seen: [], session: [] });
let n = 0; const files = {};
async function dl(url, tag) {
  if (!url) return null; if (files[url]) return files[url];
  const big = url.replace(/\/(\d{2,4})px-/, "/1000px-").replace("/full/480,/", "/full/1000,/");
  for (const u of [big, url]) {
    try {
      const abs = u.startsWith("/") ? B + u : u;
      const r = await fetch(abs, { headers: { "User-Agent": "ARED-film/1.0 (+https://ared.design)" }, signal: AbortSignal.timeout(20000) });
      if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) continue;
      const f = `${D}/${tag}-${String(++n).padStart(3, "0")}.jpg`; writeFileSync(f, Buffer.from(await r.arrayBuffer())); files[url] = f; return f;
    } catch {}
  }
  return null;
}
const out = { record: { ...rec, file: await dl(rec?.image, "rec") }, related: [], local: [], global: [], kinds: {} };
for (const i of sim.items.filter((x) => x.image).slice(0, 10)) out.related.push({ ...i, file: await dl(i.image, "rel") });
for (const i of local.filter((x) => x.image).slice(0, 14)) out.local.push({ ...i, file: await dl(i.image, "loc") });
for (const i of global.filter((x) => x.image).slice(0, 14)) out.global.push({ ...i, file: await dl(i.image, "glo") });
for (const i of fy.items) { const k = i.kind; out.kinds[k] ??= []; if (out.kinds[k].length < 4) out.kinds[k].push({ ...i, file: await dl(i.image, "kind") }); }
writeFileSync(`${D}/data.json`, JSON.stringify(out, null, 1));
console.log("record", rec?.title, "| related", out.related.length, "| local", out.local.length, "| global", out.global.length, "| kinds", Object.entries(out.kinds).map(([k, v]) => k + ":" + v.length).join(" "));
