#!/usr/bin/env node
// scripts/check-migrations.js
/* eslint-disable @typescript-eslint/no-require-imports */
// Checks migration files for common issues: duplicate timestamps, missing IF NOT EXISTS,
// missing RLS enables, and missing notify pgrst.

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "../supabase/migrations");

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let warnings = 0;
let errors = 0;

// Check for duplicate timestamps in timestamp-format migrations
const timestamps = {};
for (const file of files) {
  const match = file.match(/^(\d{14})_/);
  if (match) {
    const ts = match[1];
    if (timestamps[ts]) {
      console.error(`ERROR: Duplicate timestamp ${ts} in ${file} and ${timestamps[ts]}`);
      errors++;
    } else {
      timestamps[ts] = file;
    }
  }
}

// Check each file's content
for (const file of files) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Check for create table without IF NOT EXISTS
  const createTableMatches = content.match(/create\s+table\s+(?!if\s+not\s+exists)/gi);
  if (createTableMatches) {
    console.warn(`WARN [${file}]: CREATE TABLE without IF NOT EXISTS (${createTableMatches.length} instance(s))`);
    warnings++;
  }

  // Check for tables without RLS
  const hasCreateTable = /create\s+table\s+if\s+not\s+exists/i.test(content);
  const hasRLS = /enable\s+row\s+level\s+security/i.test(content);
  if (hasCreateTable && !hasRLS) {
    console.warn(`WARN [${file}]: Table created but no RLS enabled`);
    warnings++;
  }

  // Check for notify pgrst
  const hasNotify = /notify\s+pgrst/i.test(content);
  if (hasCreateTable && !hasNotify) {
    console.warn(`WARN [${file}]: No 'notify pgrst' found — PostgREST may not reload schema`);
    warnings++;
  }
}

console.log(`\nMigration check complete: ${files.length} files, ${errors} error(s), ${warnings} warning(s).`);

if (errors > 0) {
  process.exit(1);
}
