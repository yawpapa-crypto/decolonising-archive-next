/**
 * Audit script for scholarly-search pipeline.
 * Run: node scripts/audit-scholarly-search.mjs
 * Loads .env.local without printing secret values.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const envPath = resolve(ROOT, ".env.local");

function loadEnv() {
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
}

loadEnv();

const QUERY = "decolonisation indigenous knowledge systems";
const report = {
  timestamp: new Date().toISOString(),
  query: QUERY,
  env: {},
  core: {},
  openAlex: {},
  gemini: {},
  pipeline: {},
};

function mask(key) {
  if (!key) return { present: false, length: 0 };
  return { present: true, length: key.length, prefix: key.slice(0, 6) + "…" };
}

report.env = {
  GEMINI_API_KEY: mask(process.env.GEMINI_API_KEY),
  AI_API_KEY: mask(process.env.AI_API_KEY),
  AI_MODEL: process.env.AI_MODEL || "(default gemini-2.5-flash)",
  AI_PROVIDER: process.env.AI_PROVIDER || "(unset)",
  CORE_API_KEY: mask(process.env.CORE_API_KEY),
};

// --- CORE ---
try {
  const coreKey = process.env.CORE_API_KEY?.trim();
  const url = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(QUERY)}&limit=3`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${coreKey}`, Accept: "application/json" },
  });
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    json = { raw: body.slice(0, 200) };
  }
  report.core = {
    httpStatus: res.status,
    ok: res.ok,
    resultCount: Array.isArray(json?.results) ? json.results.length : 0,
    totalHits: json?.totalHits ?? json?.total_hits ?? null,
    errorMessage: json?.message ?? json?.error ?? (res.ok ? null : body.slice(0, 180)),
  };
} catch (e) {
  report.core = { error: String(e) };
}

// --- OpenAlex ---
try {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(QUERY)}&per_page=3&mailto=audit@local`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const json = await res.json();
  report.openAlex = {
    httpStatus: res.status,
    ok: res.ok,
    resultCount: Array.isArray(json?.results) ? json.results.length : 0,
    sampleTitle: json?.results?.[0]?.display_name ?? null,
  };
} catch (e) {
  report.openAlex = { error: String(e) };
}

// --- Gemini helpers ---
function buildUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model.replace(/^models\//, "")}:generateContent`;
}

async function geminiCall(label, body, model) {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const res = await fetch(buildUrl(model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const candidate = json?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  return {
    label,
    model,
    httpStatus: res.status,
    ok: res.ok,
    apiError: json?.error?.message ?? json?.error?.status ?? null,
    finishReason: candidate?.finishReason ?? null,
    textLength: text.length,
    textPreview: text.slice(0, 120).replace(/\n/g, " "),
    webSearchQueries: candidate?.groundingMetadata?.webSearchQueries?.length ?? 0,
    hasSuggestionsKey: text.includes('"suggestions"'),
  };
}

const model = (process.env.AI_MODEL || "gemini-2.5-flash").replace(/^models\//, "");
const compactPrompt = `Research question: ${QUERY}\n\nSuggest exactly 3 published scholarly sources. Return compact JSON only:\n{"suggestions":[{"title":"t","creator":"c","year":"2020","rationale":"r"}]}`;

report.gemini.tests = [];

report.gemini.tests.push(
  await geminiCall(
    "basic_json",
    {
      contents: [{ parts: [{ text: 'Reply JSON only: {"ok":true}' }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 64 },
    },
    model,
  ),
);

report.gemini.tests.push(
  await geminiCall(
    "grounded_no_json_mime",
    {
      contents: [{ parts: [{ text: compactPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.35 },
    },
    model,
  ),
);

report.gemini.tests.push(
  await geminiCall(
    "grounded_plus_json_mime_INVALID_COMBO",
    {
      contents: [{ parts: [{ text: compactPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    },
    model,
  ),
);

// Parse test on last successful grounded response if any
const grounded = report.gemini.tests.find((t) => t.label === "grounded_no_json_mime");
if (grounded?.textLength) {
  // re-fetch not needed - count title fields in preview only for audit
  report.gemini.parseNote =
    "Full parse tested separately in app code; check textLength and hasSuggestionsKey above.";
}

report.pipeline = {
  route: "POST /api/workbench/notes/scholarly-search",
  steps: [
    "1. requireMember auth",
    "2. searchScholarlySources(query) -> CORE + OpenAlex in parallel",
    "3. searchGeminiScholarlySuggestions(query) -> up to 2 Gemini calls (grounded, then json fallback if parse empty)",
    "4. Merge: index results + unique Gemini (dedupe by DOI/title vs index)",
  ],
  geminiCallsPerUserSearch: "1-2 (grounded + optional JSON fallback)",
  coreIssueIf401: "CORE_API_KEY invalid — OpenAlex still fills index results",
};

console.log(JSON.stringify(report, null, 2));
