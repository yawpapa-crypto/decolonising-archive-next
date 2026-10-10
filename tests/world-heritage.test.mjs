// UNESCO World Heritage layer (lib/heritage/world-heritage.ts). Run from the repo root:
//   npx tsx --test tests/world-heritage.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import * as mod from "../lib/heritage/world-heritage.ts";
// tsx may load this TypeScript module as CommonJS; read the exports either way.
const { heritageDetail, heritageInBounds, heritageSearch, parseBounds } = mod.default ?? mod;

const GHANA = parseBounds("-3.5,4.5,1.5,8");

test("only inscribed World Heritage properties", () => {
  const { features } = heritageInBounds(parseBounds("-180,-85,180,85"), 2, 5000);
  assert.ok(features.length > 1000);
  assert.ok(features.every((f) => /^unesco-wh-\d+$/.test(f.propertyId)));
});

test("Ghana's Forts and Castles: one representative point, components never invented", () => {
  const forts = heritageInBounds(GHANA, 6).features.find((f) => f.propertyId === "unesco-wh-34");
  assert.equal(forts.representativePoint, true);
  const d = heritageDetail("unesco-wh-34");
  assert.equal(d.components.length, 1);
  assert.equal(d.officialUrl, "https://whc.unesco.org/en/list/34");
  assert.equal(d.inscribed, "1979");
});

test("serial properties: verified components replace the property point when zoomed in", () => {
  const berat = parseBounds("19.8,40.0,20.3,40.8");
  assert.ok(heritageInBounds(berat, 3).features.filter((f) => f.propertyId === "unesco-wh-569").every((f) => f.kind === "property"));
  const inn = heritageInBounds(berat, 10).features.filter((f) => f.propertyId === "unesco-wh-569");
  assert.ok(inn.length >= 1 && inn.every((f) => f.kind === "component"));
});

test("listing citation uses only UNESCO's fields", () => {
  const d = heritageDetail("unesco-wh-34");
  assert.match(d.citation.apa, /^UNESCO World Heritage Centre\. \(1979\)\. Forts and Castles/);
  assert.match(d.citation.apa, /https:\/\/whc\.unesco\.org\/en\/list\/34$/);
});

test("search matches multi-word and translated names; component ids resolve to the parent", () => {
  assert.equal(heritageSearch("forts and castles")[0]?.id, "unesco-wh-34");
  assert.equal(heritageDetail("unesco-wh-569-component-569bis-002")?.id, "unesco-wh-569");
});

test("bounding boxes are validated", () => {
  assert.equal(parseBounds("1,2"), null);
  assert.equal(parseBounds("0,50,10,40"), null);
  assert.ok(parseBounds("170,-10,-170,10"));
});
