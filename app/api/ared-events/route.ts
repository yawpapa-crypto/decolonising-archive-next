import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { ARED_EVENTS } from "@/lib/events/vocabulary";
export const dynamic = "force-dynamic";
const TARGET = /^[\w:.\-/%~]{1,160}$/;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const b = await request.json().catch(() => null);
  if (!b || !(ARED_EVENTS as readonly string[]).includes(b.type) || typeof b.target !== "string" || !TARGET.test(b.target) || (b.sessionId && (typeof b.sessionId !== "string" || b.sessionId.length > 64)))
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in to retain events" }, { status: 401 });
    // Search stores no query text. Only the fact that a search happened.
    const target = b.type === "search" ? "search" : b.target;
    const { error } = await sb.rpc("recommendation_event", { p_type: `ared_${b.type}`, p_target: target, p_session: b.sessionId ?? null, p_terms: [] });
    return NextResponse.json({ ok: !error }, { status: error ? 503 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
