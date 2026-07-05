import { NextResponse } from "next/server";
import { getCatalogueRecord } from "@/lib/catalogue/store";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing record id" }, { status: 400 });
  }

  const record = getCatalogueRecord(id);
  if (!record?.publicVisibility) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json(resolveServerRecordImage(record));
}
