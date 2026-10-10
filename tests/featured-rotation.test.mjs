// Featured daily rotation — runs the real selection over the real catalogue (no mocks).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const src = readFileSync(new URL("../lib/home/featured.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(js, { module: mod, exports: mod.exports, Math, Date, Object, Set, Map, Array, Infinity, Number, String, Intl });
const { featuredHistory, featuredOrder, featuredTopics, featuredDate, shiftDate } = mod.exports;

const records = JSON.parse(readFileSync(new URL("../data/catalogue/catalogue-records.json", import.meta.url), "utf8"))
  .filter((r) => r.publicVisibility && !r.communityAuthorityRequired)
  .map((r) => ({ id: r.id, region: r.region, periodId: r.periodId, recordType: r.recordType, visualSystemId: r.visualSystemId, institution: r.institutionOrCollection }));
const END = "2026-11-08";
const days = Array.from({ length: 30 }, (_, i) => shiftDate(END, i - 29));

test("the catalogue is large enough to rotate", () => assert.ok(records.length >= 48, `${records.length} eligible`));

test("no record repeats on consecutive days; the whole catalogue appears within 30 days", () => {
  const h = featuredHistory(records, END, { perDay: 24, windowDays: 60 });
  for (let i = 1; i < days.length; i++) {
    const prev = new Set(h.get(days[i - 1]));
    assert.equal(h.get(days[i]).filter((id) => prev.has(id)).length, 0, days[i]);
  }
  const seen = new Set(days.flatMap((d) => h.get(d)));
  assert.equal(seen.size, records.length);
});

test("exposure stays even (no record dominates)", () => {
  const h = featuredHistory(records, END, { perDay: 24, windowDays: 60 });
  const count = new Map();
  days.forEach((d) => h.get(d).forEach((id) => count.set(id, (count.get(id) || 0) + 1)));
  const v = [...count.values()];
  assert.ok(Math.max(...v) - Math.min(...v) <= 9, `exposure ${Math.min(...v)}–${Math.max(...v)}`);
});

test("stable within a day, different the next", () => {
  const a = featuredOrder(records, "2026-10-10").main.map((r) => r.id);
  const b = featuredOrder(records, "2026-10-10").main.map((r) => r.id);
  const c = featuredOrder(records, "2026-10-11").main.map((r) => r.id);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("cooldowns relax instead of returning an empty selection for a tiny pool", () => {
  const tiny = records.slice(0, 10);
  assert.equal(featuredOrder(tiny, "2026-10-10", { perDay: 8 }).main.length, 8);
});

test("topics change daily and never repeat yesterday's", () => {
  const T = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  for (const d of days.slice(1)) {
    const y = new Set(featuredTopics(T, shiftDate(d, -1)));
    assert.equal(featuredTopics(T, d).filter((t) => y.has(t)).length, 0, d);
  }
});

test("publication date uses Africa/Accra (UTC)", () => {
  assert.equal(featuredDate(new Date("2026-10-09T23:30:00Z")), "2026-10-09");
  assert.equal(featuredDate(new Date("2026-10-10T00:30:00Z")), "2026-10-10");
});

test("the discovery route no longer orders Featured alphabetically or by a constant topic seed", () => {
  const route = readFileSync(new URL("../app/api/discovery/[action]/route.ts", import.meta.url), "utf8");
  assert.match(route, /featuredOrder\(/);
  const forYou = readFileSync(new URL("../lib/home/for-you.ts", import.meta.url), "utf8");
  assert.match(forYou, /featuredTopics\(TOPICS, day/);
  assert.doesNotMatch(forYou.slice(forYou.indexOf("export async function getExplorePage")), /streamsFor\("", page \* 2 - 1, 36, "explore"\)/);
});
