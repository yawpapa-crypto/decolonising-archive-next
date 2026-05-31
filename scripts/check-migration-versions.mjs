import { readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));
const versions = new Map();

for (const file of files) {
  const version = file.match(/^(\d+)/)?.[1];
  if (!version) continue;
  const matches = versions.get(version) ?? [];
  matches.push(file);
  versions.set(version, matches);
}

const duplicates = [...versions.entries()].filter(([, matches]) => matches.length > 1);

if (duplicates.length) {
  console.error("Duplicate Supabase migration versions found:");
  for (const [version, matches] of duplicates) {
    console.error(`- ${version}: ${matches.join(", ")}`);
  }
  process.exit(1);
}

console.log(`Migration versions OK (${files.length} SQL files checked).`);
