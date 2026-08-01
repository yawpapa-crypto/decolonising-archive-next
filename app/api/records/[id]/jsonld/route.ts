import { NextResponse } from "next/server";
import { getPublicArchiveRecord } from "@/lib/kgo/records";
import { recordJsonLd } from "@/lib/kgo/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const record = await getPublicArchiveRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json(recordJsonLd(record), {
    headers: {
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
