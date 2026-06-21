import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { isGuardResponse, requireAdminApi } from "@/src/lib/security/auth-guards";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .single();

    if (error) {
      console.error("/api/site-content GET supabase error", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, content: data?.content ?? {} });
  } catch (e) {
    console.error("/api/site-content GET unexpected error", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (isGuardResponse(guard)) return guard;
  try {
    const body = await request.json();

    const { error } = await supabase
      .from("site_content")
      .upsert({
        id: "main",
        content: body,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("/api/site-content POST supabase error", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/site-content POST unexpected error", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
