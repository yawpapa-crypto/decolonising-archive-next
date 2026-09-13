import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const recordsModuleUrl = pathToFileURL(path.join(process.cwd(), "lib/kgo/records.ts")).href;

type KgoRecordsModule = {
  getPublicArchiveRecord: (id: string) => Promise<{ id: string } | null>;
  getPublicArchiveRecords: () => Promise<Array<{ id: string }>>;
};

function publishableRecord(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Record ${id}`,
    type: "Book",
    description: "Complete public metadata.",
    source: "Test source",
    sourceUrl: `https://example.com/${id}`,
    dateAccessed: "2026-01-01",
    region: "West Africa",
    language: ["English"],
    rightsStatus: "Open Access",
    accessType: "External Link Only",
    verificationStatus: "Verified",
    published: true,
    status: "Published",
    ...overrides,
  };
}

test("getPublicArchiveRecords only returns records that remain publishable after normalization", async () => {
  const originalCwd = process.cwd();
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kgo-public-records-"));

  try {
    await fs.mkdir(path.join(fixtureRoot, "data/kgo"), { recursive: true });
    await fs.writeFile(
      path.join(fixtureRoot, "data/kgo/local-bank-records.json"),
      JSON.stringify([
        publishableRecord("duplicate-record", { title: "Older public duplicate" }),
        publishableRecord("local-draft", { published: false, status: "Draft" }),
      ]),
    );
    await fs.writeFile(
      path.join(fixtureRoot, "data/records.json"),
      JSON.stringify([
        publishableRecord("published-record"),
        publishableRecord("invalid-published-record", { dateAccessed: "" }),
        publishableRecord("draft-record", { published: false, status: "Draft" }),
        publishableRecord("duplicate-record", { published: false, status: "Draft" }),
      ]),
    );

    process.chdir(fixtureRoot);
    const { getPublicArchiveRecord, getPublicArchiveRecords } = (await import(
      `${recordsModuleUrl}?fixture=${Date.now()}`
    )) as KgoRecordsModule;

    const records = await getPublicArchiveRecords();
    assert.deepEqual(records.map((record) => record.id), ["published-record"]);
    assert.equal(await getPublicArchiveRecord("invalid-published-record"), null);
    assert.equal(await getPublicArchiveRecord("draft-record"), null);
    assert.equal(await getPublicArchiveRecord("duplicate-record"), null);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});
