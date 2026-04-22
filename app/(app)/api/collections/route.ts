import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("collections")
    .select("id, content")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const collections = (data || []).map((row) => row.content);
  return NextResponse.json({ ok: true, collections });
}

export async function POST(request: Request) {
  const body = await request.json();
  const collections = body.collections || body;

  if (!Array.isArray(collections)) {
    return NextResponse.json({ ok: false, error: "Invalid collections payload" }, { status: 400 });
  }

  const payload = collections.map((collection: any) => ({
    id: collection.id,
    content: collection,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("collections")
    .upsert(payload);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
