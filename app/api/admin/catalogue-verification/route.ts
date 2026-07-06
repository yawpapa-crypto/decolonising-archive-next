import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  catalogueDataExists,
  loadCatalogueRecords,
  loadCatalogueVerification,
  loadVerificationTasks,
} from "@/lib/catalogue/store";
import { isSeedRecord } from "@/lib/catalogue/csv-parser";
import { parseCsv } from "@/lib/catalogue/csv-parser";

export const dynamic = "force-dynamic";

function loadVerificationErrors() {
  const path = join(process.cwd(), "data", "catalogue", "verification-errors.csv");
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, "utf8"));
  return rows.map((r) => ({
    recordId: r.record_id,
    errorType: r.error_type,
    field: r.field,
    detail: r.detail,
    url: r.url,
  }));
}

export async function GET() {
  if (!catalogueDataExists()) {
    return NextResponse.json({ records: [] }, { status: 503 });
  }

  const records = loadCatalogueRecords();
  const verification = loadCatalogueVerification();
  const vMap = new Map(verification.map((v) => [v.catalogueRecordId, v]));
  const errors = loadVerificationErrors();
  const tasks = loadVerificationTasks().filter((t) => t.status === "open");

  const payload = records.map((r) => ({
    ...r,
    verification: vMap.get(r.id) ?? null,
    isSeed: isSeedRecord(r.id),
  }));

  return NextResponse.json({
    records: payload,
    seedCount: payload.filter((r) => isSeedRecord(r.id)).length,
    errors,
    openTasks: tasks,
  });
}
