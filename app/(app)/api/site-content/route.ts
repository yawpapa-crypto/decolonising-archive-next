import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { isGuardResponse, requireAdminApi } from "@/src/lib/security/auth-guards";

export async function GET() {
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content: data.content });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (isGuardResponse(guard)) return guard;

  const body = await request.json();

  const { error } = await supabase
    .from("site_content")
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
