import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { isGuardResponse, requireAdminApi } from "@/src/lib/security/auth-guards";

type SettingsContent = Record<string, unknown>;

function isSettingsContent(value: unknown): value is SettingsContent {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapSettingsContent(value: unknown): unknown {
  let current = value;

  while (
    isSettingsContent(current) &&
    Object.keys(current).length === 1 &&
    isSettingsContent(current.settings)
  ) {
    current = current.settings;
  }

  return current;
}

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("content")
    .eq("id", "main")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: unwrapSettingsContent(data.content) });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (isGuardResponse(guard)) return guard;

  const body = await request.json();
  const settings = unwrapSettingsContent(body);

  if (!isSettingsContent(settings)) {
    return NextResponse.json({ ok: false, error: "Invalid settings payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("settings")
    .upsert({
      id: "main",
      content: settings,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
