import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/brevo";
import { createClient, hasSupabaseServerConfig } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  if (!hasSupabaseServerConfig()) return NextResponse.json({ ok: false, error: "Sign-ups are temporarily unavailable." }, { status: 503 });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("android_testers").insert({ email });
    if (error && (error as { code?: string }).code !== "23505") return NextResponse.json({ ok: false, error: "Could not save your email. Try again shortly." }, { status: 500 });
    // Mirror to Brevo (its own list via BREVO_ANDROID_LIST_ID); never added to the newsletter list. Failure must not block the sign-up.
    if (process.env.BREVO_ANDROID_LIST_ID) await subscribeNewsletter({ email, source: "android-testers", listEnv: "BREVO_ANDROID_LIST_ID" }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save your email. Try again shortly." }, { status: 500 });
  }
}
