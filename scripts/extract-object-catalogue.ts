/**
 * Extract individually documented Ghana-related objects from museum APIs.
 *
 * Run: npx tsx scripts/extract-object-catalogue.ts
 *
 * Uses cached responses in data/catalogue/cache/ — safe to resume.
 * Target: object-level records from Met, Cleveland, and future BM/institutional sources.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { collectMetObjectIds, fetchAllMetObjects, loadAllCachedMetObjects } from "../lib/catalogue/extraction/met-museum";
import { metObjectToRecord } from "../lib/catalogue/extraction/met-mapper";
import { fetchClevelandGhanaRecords } from "../lib/catalogue/extraction/cleveland-art";
import { mergeDuplicates, renumberRecords } from "../lib/catalogue/extraction/duplicate-detection";
import { writeCatalogueOutputs } from "../lib/catalogue/extraction/csv-writer";
import type { ExtractionLogEntry } from "../lib/catalogue/extraction/types";

const DATA_DIR = join(process.cwd(), "data", "catalogue");
const TARGET = parseInt(process.env.ARED_CATALOGUE_TARGET ?? "2000", 10);

async function main() {
  const logs: ExtractionLogEntry[] = [];
  const excluded: { record_id: string; reason: string }[] = [];
  const now = () => new Date().toISOString();

  console.log("=== ARED object-level catalogue extraction ===");
  console.log(`Target: ${TARGET} individually documented records`);

  // ── Met Museum ───────────────────────────────────────────────────────────
  console.log("\n[1/2] Metropolitan Museum of Art…");
  const metIds = await collectMetObjectIds();
  console.log(`Met unique object IDs to fetch: ${metIds.length}`);

  await fetchAllMetObjects(metIds, (done, total) => {
    if (done % 50 === 0 || done === total) process.stdout.write(`  fetched ${done}/${total}\r`);
  });

  const metObjects = loadAllCachedMetObjects();
  console.log(`\nMet cached objects available: ${metObjects.length}`);

  const metRecords = [];
  let metRejected = 0;
  for (let i = 0; i < metObjects.length; i++) {
    const rec = metObjectToRecord(metObjects[i]!, i + 1);
    if (rec) metRecords.push(rec);
    else {
      metRejected++;
      excluded.push({
        record_id: `met:${metObjects[i]!.objectID}`,
        reason: "failed Ghana relevance filter",
      });
    }
  }

  logs.push({
    institution: "Metropolitan Museum of Art",
    search_terms: "Ghana; Akan; Adinkra; kente; Fante; Asafo; goldweight; West Africa textile; etc.",
    pages_examined: metIds.length,
    records_extracted: metRecords.length,
    records_rejected: metRejected,
    duplicates_merged: 0,
    inaccessible: metIds.length - metObjects.length,
    notes: "Object-level extraction from Met Collection API with Ghana relevance filter.",
    timestamp: now(),
  });

  // ── Cleveland Museum ───────────────────────────────────────────────────────
  console.log("\n[2/2] Cleveland Museum of Art…");
  let cleRecords: Awaited<ReturnType<typeof fetchClevelandGhanaRecords>> = [];
  try {
    cleRecords = await fetchClevelandGhanaRecords();
    logs.push({
      institution: "Cleveland Museum of Art",
      search_terms: "culture=Ghana",
      pages_examined: Math.ceil(cleRecords.length / 100),
      records_extracted: cleRecords.length,
      records_rejected: 0,
      duplicates_merged: 0,
      inaccessible: 0,
      notes: "Open Access API",
      timestamp: now(),
    });
    console.log(`Cleveland records: ${cleRecords.length}`);
  } catch (e) {
    console.log(`Cleveland skipped: ${e instanceof Error ? e.message : e}`);
  }

  const { merged, duplicates } = mergeDuplicates([...metRecords, ...cleRecords]);
  const final = renumberRecords(merged);

  writeCatalogueOutputs(DATA_DIR, final, logs, duplicates, excluded);

  const summary = {
    extractedAt: now(),
    target: TARGET,
    totalRecords: final.length,
    targetMet: final.length >= TARGET,
    byInstitution: Object.fromEntries(
      [...new Set(final.map((r) => r.institution_or_collection))].map((i) => [
        i,
        final.filter((r) => r.institution_or_collection === i).length,
      ]),
    ),
    byVisualSystem: Object.fromEntries(
      [...new Set(final.map((r) => r.visual_system_label))].map((v) => [
        v,
        final.filter((r) => r.visual_system_label === v).length,
      ]),
    ),
    byPeriod: Object.fromEntries(
      [...new Set(final.map((r) => r.period_label))].map((p) => [
        p,
        final.filter((r) => r.period_label === p).length,
      ]),
    ),
    duplicatesMerged: duplicates.length,
    excluded: excluded.length,
    nextSteps:
      final.length < TARGET
        ? [
            "Add British Museum SPARQL/dump extractor (goldweights, textiles)",
            "Add Smithsonian NMAfA with API key",
            "Add Ghana Museums, PRAA, university repositories",
            "Extract individual Asafo flags from Fowler/Brooklyn/Horniman catalogues",
          ]
        : [],
  };

  writeFileSync(join(DATA_DIR, "extraction-summary.json"), JSON.stringify(summary, null, 2) + "\n");

  console.log("\n=== Extraction complete ===");
  console.log(`Verified object records: ${final.length}`);
  console.log(`Target (${TARGET}): ${final.length >= TARGET ? "MET" : "NOT YET — run additional extractors"}`);
  console.log("→ data/catalogue/research-catalogue-final.csv");

  if (final.length < TARGET) {
    console.log("\nAdditional institutional extractors required to reach target.");
    console.log("Cached Met responses saved — re-run to resume without re-fetching.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
