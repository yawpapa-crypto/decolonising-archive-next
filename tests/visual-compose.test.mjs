import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Compile the two pure modules once.
const out = mkdtempSync(join(tmpdir(), "vc-"));
execSync(`npx tsc lib/visual/describe.ts lib/visual/compose.ts --outDir ${out} --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck`, { stdio: "pipe" });
writeFileSync(join(out, "package.json"), '{"type":"commonjs"}');
const { compose } = await import(join(out, "compose.js"));

const d = (id, o = {}) => ({ id, form: "photograph", orient: "portrait", source: "s", creator: "", region: "", hasImage: true, cluster: "photograph:portrait:", quality: 0.8, dupKeys: [id], ...o });
const c = (id, k, o = {}, extra = {}) => ({ id, knowledge: k, desc: d(id, o), ...extra });

test("15 portraits + others of similar relevance do not open as a portrait wall", () => {
  const cs = [];
  for (let i = 0; i < 15; i++) cs.push(c("p" + i, 100 - i, { dhash: (i * 7919).toString(16).padStart(16, "0") }));
  for (let i = 0; i < 5; i++) cs.push(c("post" + i, 85 - i, { form: "poster", orient: "landscape", cluster: "poster:landscape:" }));
  for (let i = 0; i < 5; i++) cs.push(c("book" + i, 84 - i, { form: "book", orient: "tall", cluster: "book:tall:", source: "ol" }));
  for (let i = 0; i < 5; i++) cs.push(c("obj" + i, 83 - i, { form: "object", orient: "square", cluster: "object:square:", source: "met" }));
  const { order } = compose(cs, { n: 12, seed: "x", lookahead: 24 });
  const forms = order.map((x) => x.desc.form);
  let run = 1, max = 1;
  for (let i = 1; i < forms.length; i++) { run = forms[i] === forms[i - 1] ? run + 1 : 1; max = Math.max(max, run); }
  assert.ok(max <= 3, forms.join(","));
  assert.ok(new Set(forms).size >= 3);
});

test("knowledge beats beauty: a weak-relevance spectacular image cannot leap", () => {
  const cs = [];
  for (let i = 0; i < 60; i++) cs.push(c("r" + i, 100 - i, {}, {}));
  cs.push(c("beauty", 5, { quality: 1 }));
  const { order } = compose(cs, { n: 30, seed: "y" });
  assert.ok(!order.some((x) => x.id === "beauty"));
});

test("a relevant candidate never moves further than the lookahead", () => {
  const cs = [];
  for (let i = 0; i < 100; i++) cs.push(c("r" + i, 100 - i, { form: i < 40 ? "photograph" : "book", cluster: i < 40 ? "a" : "b" }));
  const { trace } = compose(cs, { n: 40, seed: "z", lookahead: 8 });
  for (const t of trace) assert.ok(t.originalRank - t.position <= 8, `${t.id} ${t.originalRank}->${t.position}`);
});

test("same photograph across records and resolutions is held apart", () => {
  const h = "ffff0000ffff0000", near = "ffff0000ffff0001";
  const cs = [c("a", 100, { dhash: h }), c("b", 99, { dhash: near }), c("c", 98, { dhash: "0123456789abcdef", form: "book", cluster: "book" }), c("d", 97, { dhash: "f0f0f0f00f0f0f0f", form: "object", cluster: "o" })];
  const { order } = compose(cs, { n: 4, seed: "q" });
  const ia = order.findIndex((x) => x.id === "a"), ib = order.findIndex((x) => x.id === "b");
  assert.ok(Math.abs(ia - ib) > 1, order.map((x) => x.id).join());
});

test("shared dupKeys are never shown twice near each other", () => {
  const cs = [c("a", 100, { dupKeys: ["u:x"] }), c("b", 99, { dupKeys: ["u:x"] }), c("c", 98, { form: "book", cluster: "b" })];
  const { order } = compose(cs, { n: 3, seed: "q" });
  assert.equal(order[2].id, "b");
});

test("explicit region intent is not diversified away", () => {
  const cs = [];
  for (let i = 0; i < 20; i++) cs.push(c("g" + i, 100 - i, { region: "ghana", form: i % 2 ? "poster" : "book", cluster: i % 2 ? "p" : "b" }));
  for (let i = 0; i < 20; i++) cs.push(c("o" + i, 70 - i, { region: "kenya" }));
  const { order } = compose(cs, { n: 20, seed: "g", explicit: ["region"] });
  assert.equal(order.filter((x) => x.desc.region === "ghana").length, 20);
});

test("explore breadth: under-exposed beats over-exposed at equal relevance", () => {
  const cs = [c("seen", 50, {}, { exposure: 3 }), c("fresh", 50, { cluster: "z", form: "object" }, { exposure: 0 })];
  const { order } = compose(cs, { n: 2, seed: "e", breadth: 1.4 });
  assert.equal(order[0].id, "fresh");
});

test("stable: same seed gives the same sequence; tail carries across batches", () => {
  const cs = Array.from({ length: 40 }, (_, i) => c("x" + i, 100 - i, { form: i % 3 ? "photograph" : "book", cluster: i % 3 ? "a" : "b", dhash: (i * 104729).toString(16).padStart(16, "0") }));
  const a = compose(cs, { n: 20, seed: "s" }).order.map((x) => x.id).join();
  const b = compose(cs, { n: 20, seed: "s" }).order.map((x) => x.id).join();
  assert.equal(a, b);
  const t = compose(cs, { n: 5, seed: "s" }).order;
  const next = compose(cs.filter((x) => !t.includes(x)), { n: 5, seed: "s", tail: t.map((x) => x.desc) });
  assert.ok(next.order.length === 5);
});

const { pickVisual } = await (async () => {
  execSync(`npx tsc lib/visual/select.ts --outDir ${out} --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck`, { stdio: "pipe" });
  return await import(join(out, "select.js"));
})();

test("curated primary outranks a higher-resolution algorithmic candidate", () => {
  const r = pickVisual([{ url: "big", w: 3000, h: 2000 }, { url: "curated", curated: true, w: 400, h: 300 }], { seed: "a" });
  assert.equal(r.primary.url, "curated");
  assert.equal(r.alternatives[0].url, "big");
});

test("source primary outranks resolution; among equals the less-exposed wins", () => {
  assert.equal(pickVisual([{ url: "a", w: 2000, h: 2000 }, { url: "b", sourcePrimary: true, w: 500, h: 500 }], { seed: "s" }).primary.url, "b");
  assert.equal(pickVisual([{ url: "a", w: 1000, h: 1000, exposure: 3 }, { url: "b", w: 1000, h: 1000, exposure: 0 }], { seed: "s" }).primary.url, "b");
});
