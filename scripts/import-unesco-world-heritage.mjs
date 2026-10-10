#!/usr/bin/env node
/**
 * Builds ared.design's compact UNESCO World Heritage dataset for the Map layer.
 *
 * Input: the normalised WHC export (records + map features) produced from UNESCO's official
 * `whc001` dataset (see the audit file next to it for source version and checksum).
 * Output: data/unesco/world-heritage.json — only the fields the Map uses, English text,
 * official ids and links, verified component coordinates, and the source provenance.
 *
 * Usage: node scripts/import-unesco-world-heritage.mjs <processed-dir>
 *   e.g. node scripts/import-unesco-world-heritage.mjs ../APP_DA/data/unesco/world-heritage/processed
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
if (!dir) { console.error("Usage: import-unesco-world-heritage.mjs <processed-dir>"); process.exit(1); }
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const records = read("unesco-world-heritage-records.json");
const features = read("unesco-world-heritage-map-features.json");
const audit = read("unesco-world-heritage-audit.json");

const year = (d) => (typeof d === "string" ? d.match(/\d{4}/)?.[0] ?? null : null);
const en = (map, fallback) => (map && (map.en || Object.values(map).find(Boolean))) || fallback || null;

const out = {
  metadata: {
    sourceName: "UNESCO World Heritage List",
    publisher: "UNESCO World Heritage Centre",
    sourceUrlPattern: "https://whc.unesco.org/en/list/{id_no}",
    sourceVersion: audit.metadata?.sourceVersion ?? null,
    sourceChecksum: audit.metadata?.checksum ?? null,
    importedAt: audit.metadata?.importedAt ?? null,
    builtAt: new Date().toISOString(),
    licenceNote: "UNESCO source terms. Images are referenced remotely, never rehosted.",
    scope: "Inscribed World Heritage properties only (no Tentative List, ICH, geoparks or biosphere reserves).",
  },
  records: records.records.filter((r) => r.mapEligible !== false).map((r) => ({
    id: r.id,
    idNo: r.sourceRecordId,
    name: en(r.names, r.title),
    countries: r.statesNames ?? [],
    region: r.unescoRegion ?? null,
    inscribed: year(r.dateInscribed),
    category: r.category,
    criteria: r.criteriaText || null,
    danger: Boolean(r.danger),
    transboundary: Boolean(r.transboundary),
    shortDescription: r.shortDescription || null,
    description: en(r.descriptions, r.shortDescription),
    officialUrl: r.sourceUrl,
    latitude: r.latitude,
    longitude: r.longitude,
    locationPrecision: r.locationPrecision,
    coordinateSource: r.coordinateSource || "UNESCO World Heritage List",
    componentsCount: r.componentsCount ?? 0,
    components: (r.components ?? []).filter((c) => c.valid && !c.duplicateCoordinate).map((c) => ({ name: c.name, reference: c.reference, latitude: c.latitude, longitude: c.longitude })),
    image: r.mainImageUrl ? { url: r.mainImageUrl, author: r.mainImageAuthor || null, copyright: r.mainImageCopyright || null, caption: r.mainImageCaption || null } : null,
    searchNames: [...new Set([r.title, ...Object.values(r.names ?? {})].filter(Boolean))],
  })),
  features: features.features
    .filter((f) => Number.isFinite(f.latitude) && Number.isFinite(f.longitude))
    .map((f) => ({ id: f.id, propertyId: f.kind === "component" ? f.parentId ?? f.id : f.id, kind: f.kind === "component" ? "component" : "property", name: f.kind === "component" ? f.componentName ?? f.title : f.title, latitude: f.latitude, longitude: f.longitude, category: f.category, inscribed: year(f.dateInscribed), danger: Boolean(f.danger) })),
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "data/unesco"), { recursive: true });
const body = JSON.stringify(out);
writeFileSync(join(root, "data/unesco/world-heritage.json"), body);
console.log(`world-heritage.json: ${out.records.length} properties, ${out.features.length} map features, ${(body.length / 1e6).toFixed(1)} MB, sha256 ${createHash("sha256").update(body).digest("hex").slice(0, 12)}`);
