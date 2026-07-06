import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/brevo";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email?: unknown }).email ?? "").trim().toLowerCase()
      : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const result = await subscribeNewsletter({ email, source: "footer" });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not subscribe right now." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped ?? false,
    message: result.skipped
      ? "Thanks — we will add you when newsletter delivery is enabled."
      : "You are subscribed. Watch your inbox for updates from Decolonising Archive.",
  });
}
