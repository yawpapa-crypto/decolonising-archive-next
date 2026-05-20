/**
 * Local smoke test for OpenAlex + scholarly index search.
 * Run: node scripts/test-openalex-local.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const envPath = resolve(ROOT, ".env.local");

function loadEnv() {
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("Missing .env.local at", envPath);
    process.exit(1);
  }
}

loadEnv();

const query = "African design";

console.log("=== OpenAlex local test ===\n");
console.log("OPENALEX_API_KEY configured:", Boolean(process.env.OPENALEX_API_KEY?.trim()));
console.log("OPENALEX_MAILTO configured:", Boolean(process.env.OPENALEX_MAILTO?.trim()));

const url = new URL("https://api.openalex.org/works");
url.searchParams.set("search", query);
url.searchParams.set("per_page", "3");
const apiKey = process.env.OPENALEX_API_KEY?.trim();
const mailto = process.env.OPENALEX_MAILTO?.trim();
if (apiKey) url.searchParams.set("api_key", apiKey);
if (mailto) url.searchParams.set("mailto", mailto);

const safeUrl = new URL(url.toString());
if (safeUrl.searchParams.has("api_key")) safeUrl.searchParams.set("api_key", "***");

console.log("\nRequest URL (key redacted):", safeUrl.toString());

const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
console.log("HTTP status:", res.status);

const body = await res.json();
if (!res.ok || body.error) {
  console.error("FAIL:", body.error || body.message || res.statusText);
  process.exit(1);
}

const results = body.results ?? [];
console.log("OpenAlex hits:", results.length);
for (const item of results.slice(0, 3)) {
  console.log(" -", item.display_name?.slice(0, 72));
}

console.log("\n=== Full scholarly index (server modules) ===\n");

process.env.NODE_ENV = "development";
const { searchOpenAlexWorks, searchScholarlySources } = await import("../lib/scholarly-search.ts");

const openAlex = await searchOpenAlexWorks(query, 5);
console.log("searchOpenAlexWorks:", openAlex.length, "results");
if (openAlex[0]) {
  console.log(" sample:", openAlex[0].title.slice(0, 60), `(${openAlex[0].source})`);
}

const batch = await searchScholarlySources(query, 15);
console.log("searchScholarlySources:", batch.results.length, "total");
console.log("sourcesUsed:", batch.sourcesUsed);
console.log("warnings:", batch.warnings.length ? batch.warnings : "(none)");

const openAlexCount = batch.results.filter((r) => r.source === "OpenAlex").length;
if (openAlex.length === 0 || openAlexCount === 0) {
  console.error("\nFAIL: Expected OpenAlex results in scholarly search.");
  process.exit(1);
}

console.log("\nPASS: OpenAlex integration works locally.");
