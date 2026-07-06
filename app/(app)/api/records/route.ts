import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { canPublishRecord, normalizeArchiveRecord } from "@/lib/archive-metadata";
import { isGuardResponse, requireAdminApi } from "@/src/lib/security/auth-guards";

type Entity = { id: string; [key: string]: unknown };

export async function GET() {
  const { data, error } = await supabase
    .from("records")
    .select("id, content")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const records = (data || []).map((row) => normalizeArchiveRecord(row.content));
  return NextResponse.json({ ok: true, records });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (isGuardResponse(guard)) return guard;

  const body = (await request.json()) as { records?: unknown } | unknown;
  const records = Array.isArray(body)
    ? body
    : (body as { records?: unknown })?.records;

  if (!Array.isArray(records)) {
    return NextResponse.json({ ok: false, error: "Invalid records payload" }, { status: 400 });
  }

  const normalizedRecords = (records as Entity[]).map((record) => {
    const normalized = normalizeArchiveRecord(record);
    const publishCheck = canPublishRecord(normalized);
    if (!publishCheck.ok) {
      normalized.published = false;
      if (normalized.status === "Published") normalized.status = "Needs Review";
      normalized.adminNotes = [
        normalized.adminNotes,
        `Missing required publishing metadata: ${publishCheck.missing.join(", ")}`,
      ].filter(Boolean).join("\n");
    }
    return normalized;
  });

  const payload = normalizedRecords.map((record) => ({
    id: record.id,
    content: record,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("records")
    .upsert(payload);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, records: normalizedRecords });
}
