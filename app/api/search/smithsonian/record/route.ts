import { NextRequest, NextResponse } from "next/server";
import { fetchSmithsonianRecordByEdanId } from "@/lib/search/smithsonian";
import { smithsonianRecordToLibraryLive } from "@/lib/smithsonian-library-live";

export const runtime = "nodejs";

/** Fetch one Smithsonian EDAN item for in-app record pages (`/records/live-smithsonian-*`). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") || searchParams.get("edanId") || "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id parameter" }, { status: 400 });
  }

  const record = await fetchSmithsonianRecordByEdanId(id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    result: smithsonianRecordToLibraryLive(record),
  });
}
