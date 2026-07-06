import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function loadEnvFile(path = ".env.local") {
  if (!fs.existsSync(path)) return;

  const lines = fs.readFileSync(path, "utf8").split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function stripTrailingDuplicateNumber(id) {
  return id.replace(/-\d+$/, "");
}

function openAlexWorkIdFromRecordId(recordId) {
  const base = stripTrailingDuplicateNumber(recordId);
  const match = base.match(/openalex-org-(w\d+)$/i);
  return match ? match[1].toUpperCase() : null;
}

function doiFromCrossrefRecordId(recordId) {
  const base = stripTrailingDuplicateNumber(recordId);

  if (!base.startsWith("live-crossref-")) return null;

  const slug = base.replace(/^live-crossref-/, "");

  // Handles common Crossref DOI slugs such as:
  // 10-5040-9781978722620-ch-001
  // into:
  // 10.5040/9781978722620.ch-001
  const parts = slug.split("-");

  if (parts.length < 3 || parts[0] !== "10") return null;

  const prefix = `10.${parts[1]}`;
  const rest = parts.slice(2);

  let suffix = rest.join(".");

  // Common book chapter pattern: 9781978722620.ch.001 -> 9781978722620.ch-001
  suffix = suffix.replace(/\.ch\.(\d+)$/i, ".ch-$1");

  return `${prefix}/${suffix}`;
}

async function fetchOpenAlexDetails(recordId) {
  const workId = openAlexWorkIdFromRecordId(recordId);
  if (!workId) return null;

  const url = `https://api.openalex.org/works/${workId}`;

  const response = await fetch(url);

  if (!response.ok) {
    console.warn(`OpenAlex failed for ${recordId}: ${response.status}`);
    return {
      record_source: "OpenAlex",
      record_source_url: `https://openalex.org/${workId}`,
    };
  }

  const data = await response.json();

  return {
    record_title: data.display_name || data.title || null,
    record_source: "OpenAlex",
    record_source_url: data.id || `https://openalex.org/${workId}`,
    record_type: data.type || null,
    record_year: data.publication_year ? String(data.publication_year) : null,
    record_metadata: {
      openalex_id: data.id || null,
      doi: data.doi || null,
      publication_year: data.publication_year || null,
      type: data.type || null,
      primary_location: data.primary_location || null,
      authorships: Array.isArray(data.authorships)
        ? data.authorships.slice(0, 8).map((item) => ({
            author_name: item.author?.display_name || null,
            author_id: item.author?.id || null,
          }))
        : [],
    },
  };
}

async function fetchCrossrefDetails(recordId) {
  const doi = doiFromCrossrefRecordId(recordId);
  if (!doi) return null;

  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.warn(`Crossref failed for ${recordId}: ${response.status}`);
    return {
      record_source: "Crossref",
      record_source_url: `https://doi.org/${doi}`,
      record_metadata: { doi },
    };
  }

  const data = await response.json();
  const item = data.message || {};

  return {
    record_title: Array.isArray(item.title) ? item.title[0] : item.title || null,
    record_source: "Crossref",
    record_source_url: item.URL || `https://doi.org/${doi}`,
    record_type: item.type || null,
    record_year: Array.isArray(item.published?.["date-parts"])
      ? String(item.published["date-parts"][0]?.[0] || "")
      : null,
    record_metadata: {
      doi,
      crossref_url: item.URL || null,
      publisher: item.publisher || null,
      type: item.type || null,
      published: item.published || null,
      author: item.author || [],
    },
  };
}

async function getDetails(recordId) {
  if (recordId.includes("openalex")) return fetchOpenAlexDetails(recordId);
  if (recordId.includes("crossref")) return fetchCrossrefDetails(recordId);
  return null;
}

const { data: bookmarks, error } = await supabase
  .from("bookmarks")
  .select("id, record_id, record_title")
  .is("record_title", null)
  .order("created_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Found ${bookmarks.length} bookmarks without titles.`);

for (const bookmark of bookmarks) {
  const details = await getDetails(bookmark.record_id);

  if (!details) {
    console.log(`Skipped ${bookmark.record_id}`);
    continue;
  }

  const update = {
    record_title: details.record_title || null,
    record_source: details.record_source || null,
    record_source_url: details.record_source_url || null,
    record_type: details.record_type || null,
    record_year: details.record_year || null,
    record_metadata: details.record_metadata || null,
  };

  const { error: updateError } = await supabase
    .from("bookmarks")
    .update(update)
    .eq("id", bookmark.id);

  if (updateError) {
    console.warn(`Failed ${bookmark.record_id}: ${updateError.message}`);
  } else {
    console.log(`Updated ${bookmark.record_id}: ${update.record_title || "no title found"}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
}

console.log("Done.");
