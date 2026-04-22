import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("records")
    .select("id, content")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const records = (data || []).map((row) => row.content);
  return NextResponse.json({ ok: true, records });
}

export async function POST(request: Request) {
  const body = await request.json();
  const records = body.records || body;

  if (!Array.isArray(records)) {
    return NextResponse.json({ ok: false, error: "Invalid records payload" }, { status: 400 });
  }

  const payload = records.map((record: any) => ({
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

  return NextResponse.json({ ok: true });
}
