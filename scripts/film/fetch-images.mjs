// Collect real ARED archive images (with provenance) for the film's image fields.
import { mkdirSync, writeFileSync } from "node:fs";
const B = "http://localhost:3000";
mkdirSync("tmp/film/img", { recursive: true });
const QUERIES = ["adinkra", "kente cloth", "Ethiopian manuscripts", "Benin bronzes", "Yoruba sculpture", "Asante goldweights", "African textiles", "Ghana photography", "Nsibidi", "Kuba cloth", "African studio photography", "Swahili coast", "Akan design", "Ndebele"];
const seen = new Set(); const items = [];
const big = (u) => u.replace(/\/(\d{2,4})px-/, "/1200px-").replace("/full/480,/", "/full/1000,/").replace("/full/843,/", "/full/1000,/");
for (const q of QUERIES) {
  try {
    const d = await (await fetch(B + "/api/explore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: 1, q, seen: [] }) })).json();
    for (const i of d.items) if (i.image && !seen.has(i.image)) { seen.add(i.image); items.push({ q, id: i.id, title: i.title, kind: i.kind, source: i.source, year: i.year, authors: i.authors, image: i.image }); }
  } catch (e) { console.log("query fail", q, e.message); }
}
try {
  const col = await (await fetch(B + "/api/dev/dhash?collection=african-archives")).json();
  for (const i of col) if (i.image && !seen.has(i.image)) { seen.add(i.image); items.push({ q: "collection:african-archives", id: i.id, title: i.title, kind: "image", source: "Decolonising Archive · African & Global Archive Collections", image: i.image }); }
} catch {}
console.log("candidates", items.length);
const out = []; let n = 0;
async function get(it) {
  for (const url of [big(it.image), it.image]) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "ARED-film/1.0 (+https://ared.design)", Accept: "image/*" }, signal: AbortSignal.timeout(20000) });
      if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 25000) continue;
      const file = `tmp/film/img/${String(++n).padStart(3, "0")}.jpg`;
      writeFileSync(file, buf);
      out.push({ ...it, file, fetched: url, bytes: buf.length });
      return;
    } catch {}
  }
}
const q = items.slice(); await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) await get(q.shift()); }));
writeFileSync("tmp/film/images.json", JSON.stringify(out, null, 1));
console.log("downloaded", out.length);
