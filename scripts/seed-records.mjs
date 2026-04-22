import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const appJsPath = path.join(process.cwd(), "public/assets/js/app.js");
const source = fs.readFileSync(appJsPath, "utf8");

const match = source.match(/const BASE_RECORDS = (\[[\s\S]*?\]);/);

if (!match) {
  console.error("Could not find BASE_RECORDS in public/assets/js/app.js");
  process.exit(1);
}

let records;
try {
  records = Function(`"use strict"; return (${match[1]});`)();
} catch (error) {
  console.error("Failed to parse BASE_RECORDS:", error);
  process.exit(1);
}

if (!Array.isArray(records)) {
  console.error("Parsed BASE_RECORDS is not an array.");
  process.exit(1);
}

const payload = records.map((record) => ({
  id: record.id,
  content: record,
  updated_at: new Date().toISOString(),
}));

const chunkSize = 100;

for (let i = 0; i < payload.length; i += chunkSize) {
  const chunk = payload.slice(i, i + chunkSize);
  const { error } = await supabase.from("records").upsert(chunk);

  if (error) {
    console.error("Supabase upsert failed:", error);
    process.exit(1);
  }

  console.log(`Seeded ${Math.min(i + chunk.length, payload.length)} / ${payload.length}`);
}

console.log("Done seeding records.");
