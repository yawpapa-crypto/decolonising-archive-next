import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

type Entity = { id: string; [key: string]: unknown };

export async function GET() {
  const { data, error } = await supabase
    .from("sources")
    .select("id, content")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const sources = (data || []).map((row) => row.content);
  return NextResponse.json({ ok: true, sources });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { sources?: unknown } | unknown;
  const sources = Array.isArray(body)
    ? body
    : (body as { sources?: unknown })?.sources;

  if (!Array.isArray(sources)) {
    return NextResponse.json({ ok: false, error: "Invalid sources payload" }, { status: 400 });
  }

  const payload = (sources as Entity[]).map((source) => ({
    id: source.id,
    content: source,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("sources")
    .upsert(payload);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
