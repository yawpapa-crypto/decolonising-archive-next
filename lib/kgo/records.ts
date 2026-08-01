import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { normalizeArchiveRecord, type ArchiveRecord } from "@/lib/archive-metadata";
import { enrichRecordSameAs } from "@/lib/kgo/sameAs";
import { readRecords } from "@/lib/records";

export type LocalBankRecord = Record<string, unknown> & {
  id: string;
  title?: string;
  summary?: string;
  abstract?: string;
  creator?: string;
  region?: string;
  country?: string;
  community?: string;
  period?: string;
  concepts?: string[];
  tags?: string[];
  source?: string;
  type?: string;
  cat?: string;
  collection?: string;
  rights?: string;
  provenance?: string;
  sourceUrl?: string;
};

const localBankPath = path.join(process.cwd(), "data/kgo/local-bank-records.json");

function readLocalBankUncached(): LocalBankRecord[] {
  try {
    const raw = fs.readFileSync(localBankPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalBankRecord[]) : [];
  } catch {
    return [];
  }
}

export const readLocalBankRecords = cache(readLocalBankUncached);

export const getPublicArchiveRecords = cache(async (): Promise<ArchiveRecord[]> => {
  const fromJson = await readRecords();
  const localBank = readLocalBankRecords().map((record) => normalizeArchiveRecord(record));
  const byId = new Map<string, ArchiveRecord>();
  [...localBank, ...fromJson].forEach((record) => {
    if (!record?.id) return;
    byId.set(record.id, enrichRecordSameAs(record));
  });
  return Array.from(byId.values());
});

export async function getPublicArchiveRecord(id: string): Promise<ArchiveRecord | null> {
  const records = await getPublicArchiveRecords();
  return records.find((record) => record.id === id) || null;
}

export function recordDescription(record: ArchiveRecord): string {
  const text =
    record.summary ||
    record.abstract ||
    record.description ||
    [record.title, record.creator, record.sourceName].filter(Boolean).join(" · ");
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 300);
}
