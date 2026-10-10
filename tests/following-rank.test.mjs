import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const src = readFileSync(new URL("../lib/following/rank.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(js, { module: mod, exports: mod.exports, Math, Date, Object, Set, Array, Infinity, Number });
const { buildFeed, whoToFollow, aggregate, FEED_CONFIG } = mod.exports;

const NOW = Date.parse("2026-10-04T12:00:00Z");
const H = 3600e3;
const ev = (id, actor, hours, extra = {}) => ({ id, actor, type: "records_added", collection: `c-${actor}`, at: NOW - hours * H, itemIds: [id], areas: [], public: true, ...extra });

test("aggregation merges one actor's burst into a single event", () => {
  const out = aggregate([ev("a", "r", 1, { collection: "x" }), ev("b", "r", 2, { collection: "x" }), ev("c", "r", 3, { collection: "x" })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].itemIds.length, 3);
});

test("direct follows dominate and appear first while fresh", () => {
  const events = [ev("d1", "rusaila", 2), ev("o1", "stranger", 1, { areas: ["x"] }), ev("o2", "famous", 1)];
  const rows = buildFeed(events, { follows: ["rusaila"], interests: ["x"], now: NOW });
  assert.equal(rows[0].row.event.actor, "rusaila");
  assert.equal(rows[0].row.pool, "direct");
});

test("actor saturation: one person cannot fill the top of the feed", () => {
  const events = Array.from({ length: 8 }, (_, i) => ev(`r${i}`, "rusaila", i + 1, { collection: `c${i}`, type: i % 2 ? "collection_published" : "records_added" }));
  const others = ["b", "c", "d", "e", "f", "g"];
  others.forEach((o, i) => events.push(ev(`x${i}`, o, 20 + i)));
  const rows = buildFeed(events, { follows: ["rusaila", ...others], interests: [], now: NOW });
  const first6 = rows.slice(0, 6).map((r) => r.row.event.actor);
  assert.ok(first6.filter((a) => a === "rusaila").length <= 2, first6.join());
});

test("seen and less-from-this-person lower rank", () => {
  const events = [ev("a", "p1", 1), ev("b", "p2", 1)];
  const rows = buildFeed(events, { follows: ["p1", "p2"], interests: [], less: ["p1"], now: NOW });
  assert.equal(rows[0].row.event.actor, "p2");
});

test("private or inaccessible events never appear", () => {
  const rows = buildFeed([ev("a", "p", 1, { public: false }), ev("b", "p", 2, { accessible: false }), ev("c", "p", 3)], { follows: ["p"], interests: [], now: NOW });
  assert.equal(rows.map((r) => r.row.event.id).join(), "c");
});

test("a huge account does not outrank a small relevant curator in who-to-follow", () => {
  const picks = whoToFollow([{ id: "huge", areas: ["fashion"], followers: 5_000_000 }, { id: "small", areas: ["adinkra"], followers: 12 }], { follows: [], interests: ["adinkra"] });
  assert.equal(picks[0].id, "small");
});

test("second degree appears but is not labelled as followed", () => {
  const events = [ev("a", "b", 2, { areas: ["adinkra"] })];
  const rows = buildFeed(events, { follows: ["a1"], interests: ["adinkra"], graph: { a1: ["b"] }, now: NOW });
  assert.equal(rows[0].row.pool, "secondDegree");
  assert.match(rows[0].row.reason, /Connected to someone you follow/);
});

test("a failing external candidate source never breaks the feed", () => {
  const rows = buildFeed([ev("a", "p", 1)], { follows: ["p"], interests: [], now: NOW }, { externalCandidates: () => { throw new Error("offline"); } });
  assert.equal(rows.length, 1);
});

test("feed is deterministic for the same inputs (session stable)", () => {
  const events = Array.from({ length: 12 }, (_, i) => ev(`e${i}`, `p${i % 4}`, i + 1, { collection: `c${i}` }));
  const v = { follows: ["p0", "p1"], interests: [], now: NOW };
  const a = buildFeed(events, v).map((r) => r.row.event.id).join();
  const b = buildFeed(events, v).map((r) => r.row.event.id).join();
  assert.equal(a, b);
});

test("direct share never falls below its configured floor", () => {
  assert.ok(FEED_CONFIG.mix.direct >= 0.7);
});

test("network bubble: people followed only by each other cannot crowd out the viewer's own follows", () => {
  const events = [ev("mine", "rusaila", 20), ...Array.from({ length: 9 }, (_, i) => ev(`m${i}`, "rusaila", 30 + i, { collection: `mc${i}` })), ...Array.from({ length: 12 }, (_, i) => ev(`b${i}`, `bubble${i % 4}`, 1 + i, { collection: `bc${i}` }))];
  const graph = { rusaila: ["bubble0", "bubble1", "bubble2", "bubble3"] };
  const rows = buildFeed(events, { follows: ["rusaila"], interests: [], graph, now: NOW }).filter((r) => r.kind === "event");
  const second = rows.filter((r) => r.row.pool === "secondDegree").length;
  assert.ok(rows[0].row.pool === "direct");
  assert.ok(rows.slice(0, 10).filter((r) => r.row.pool === "secondDegree").length <= 3, "second degree stays a minority of the first screen");
  assert.ok(rows.slice(0, 6).every((r) => (r.row.pool === "direct" || r.row.parts.secondDegree <= 28)));
});

test("external suggestions nudge close calls but never beat a direct follow", () => {
  const events = [ev("direct", "rusaila", 30), ev("pushed", "stranger", 1)];
  const rows = buildFeed(events, { follows: ["rusaila"], interests: [], external: ["pushed", "direct"], now: NOW }).filter((r) => r.kind === "event");
  assert.equal(rows[0].row.event.id, "direct");
});

async function loadGorse(fetchImpl, env = {}) {
  const gsrc = readFileSync(new URL("../lib/following/gorse.ts", import.meta.url), "utf8").replace('import "server-only";', "");
  const gjs = ts.transpileModule(gsrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  vm.runInNewContext(gjs, { module: m, exports: m.exports, process: { env }, fetch: fetchImpl, setTimeout, clearTimeout, AbortController, Date, Array, Promise, encodeURIComponent, String, Error, JSON });
  return m.exports;
}

test("Gorse offline: failing, slow or absent service returns no candidates and the feed is unchanged", async () => {
  const off = await loadGorse(() => { throw new Error("down"); }, { GORSE_URL: "http://127.0.0.1:1" });
  assert.equal((await off.gorseCandidates("u")).length, 0);
  const none = await loadGorse(() => { throw new Error("must not be called"); }, {});
  assert.equal((await none.gorseCandidates("u")).length, 0);
  const bad = await loadGorse(async () => ({ ok: true, json: async () => ({ not: "an array" }) }), { GORSE_URL: "http://x" });
  assert.equal((await bad.gorseCandidates("u")).length, 0);
  const events = [ev("a", "rusaila", 2), ev("b", "other", 1)];
  const v = { follows: ["rusaila"], interests: [], now: NOW };
  const ids = (x) => x.filter((r) => r.kind === "event").map((r) => r.row.event.id);
  assert.equal(JSON.stringify(ids(buildFeed(events, { ...v, external: await off.gorseCandidates("u") }))), JSON.stringify(ids(buildFeed(events, v))));
});

test("Gorse circuit breaker stops repeated calls after a failure", async () => {
  let calls = 0;
  const g = await loadGorse(async () => { calls++; throw new Error("down"); }, { GORSE_URL: "http://x" });
  await g.gorseCandidates("u"); await g.gorseCandidates("u"); await g.gorseCandidates("u");
  assert.equal(calls, 1);
});

function loadPure(file) {
  const s = readFileSync(new URL(file, import.meta.url), "utf8");
  const j = ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  vm.runInNewContext(j, { module: m, exports: m.exports, Math, Set, Map, Array, Infinity });
  return m.exports;
}
test("lab candidates map to event ids by best rank, and unknown items are ignored", () => {
  const { labEventIds, interleave } = loadPure("../lib/following/lab-merge.ts");
  const events = [{ id: "e1", actor: "a", collection: "c1" }, { id: "e2", actor: "b", collection: "c2" }, { id: "e3", actor: "z" }];
  const ids = labEventIds([{ item: "collection:c2", score: 1 }, { item: "profile:a", score: 0.5 }, { item: "nobody", score: 0.1 }], events);
  assert.equal(JSON.stringify(ids), JSON.stringify(["e2", "e1"]));
  assert.equal(JSON.stringify(interleave(["a", "b"], ["b", "c"])), JSON.stringify(["a", "b", "c"]));
});
test("lab output cannot override a direct follow", () => {
  const events = [ev("direct", "rusaila", 40), ev("lab", "stranger", 1)];
  const rows = buildFeed(events, { follows: ["rusaila"], interests: [], external: ["lab"], now: NOW }).filter((r) => r.kind === "event");
  assert.equal(rows[0].row.event.id, "direct");
});
