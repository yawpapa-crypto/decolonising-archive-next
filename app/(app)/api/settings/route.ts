import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("content")
    .eq("id", "main")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: data.content });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { error } = await supabase
    .from("settings")
    .upsert({
      id: "main",
      content: body,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
