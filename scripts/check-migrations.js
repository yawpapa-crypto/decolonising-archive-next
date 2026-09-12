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
const activePolicies = new Map();

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

  const dropPolicyMatches = content.matchAll(
    /drop\s+policy\s+if\s+exists\s+"([^"]+)"\s+on\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)/gi,
  );
  for (const match of dropPolicyMatches) {
    const [, policyName, tableName] = match;
    activePolicies.delete(`${tableName}:${policyName}`);
  }

  const createPolicyMatches = content.matchAll(
    /create\s+policy\s+"([^"]+)"\s+on\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)([\s\S]*?);/gi,
  );
  for (const match of createPolicyMatches) {
    const [, policyName, tableName, policyBody] = match;
    activePolicies.set(`${tableName}:${policyName}`, {
      file,
      tableName,
      policyName,
      body: policyBody,
    });
  }

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

// Review RLS policies must qualify outer-row columns inside nested subqueries.
// Otherwise names such as project_id can bind to the inner collaborator table,
// widening access from "this project" to "any project the user collaborates on".
const reviewPolicyTables = new Set([
  "workbench_review_extraction_fields",
  "workbench_review_extractions",
  "workbench_review_comments",
]);
const ambiguousReviewPolicyPatterns = [
  /\bp\.id\s*=\s*project_id\b/i,
  /\bc\.project_id\s*=\s*project_id\b/i,
  /\ba\.project_id\s*=\s*project_id\b/i,
  /\ba\.record_id\s*=\s*record_id\b/i,
];

for (const policy of activePolicies.values()) {
  if (!reviewPolicyTables.has(policy.tableName)) continue;
  if (ambiguousReviewPolicyPatterns.some((pattern) => pattern.test(policy.body))) {
    console.error(
      `ERROR [${policy.file}]: active policy "${policy.policyName}" on ${policy.tableName} ` +
        "uses an unqualified review column in a nested predicate",
    );
    errors++;
  }
}

console.log(`\nMigration check complete: ${files.length} files, ${errors} error(s), ${warnings} warning(s).`);

if (errors > 0) {
  process.exit(1);
}
