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

const match = source.match(/const COLLECTIONS = (\[[\s\S]*?\]);/);

if (!match) {
  console.error("Could not find COLLECTIONS in public/assets/js/app.js");
  process.exit(1);
}

let collections;
try {
  collections = Function(`"use strict"; return (${match[1]});`)();
} catch (error) {
  console.error("Failed to parse COLLECTIONS:", error);
  process.exit(1);
}

if (!Array.isArray(collections)) {
  console.error("Parsed COLLECTIONS is not an array.");
  process.exit(1);
}

const payload = collections.map((item) => ({
  id: item.id,
  content: item,
  updated_at: new Date().toISOString(),
}));

const { error } = await supabase.from("collections").upsert(payload);

if (error) {
  console.error("Supabase upsert failed:", error);
  process.exit(1);
}

console.log(`Seeded ${payload.length} collections.`);
