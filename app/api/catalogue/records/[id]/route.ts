import { NextResponse } from "next/server";
import {
  catalogueDataExists,
  getCatalogueRecord,
  getEvidenceForRecord,
  getVerificationForRecord,
} from "@/lib/catalogue/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!catalogueDataExists()) {
    return NextResponse.json({ error: "Catalogue not imported" }, { status: 503 });
  }

  const { id } = await context.params;
  const record = getCatalogueRecord(id);
  if (!record || !record.publicVisibility) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({
    record,
    verification: getVerificationForRecord(id),
    evidence: getEvidenceForRecord(id),
  });
}
