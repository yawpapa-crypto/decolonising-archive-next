import { NextResponse } from "next/server";
import { resolveNewVisuals } from "@/lib/visual/resolve-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly visual resolver (Vercel Cron, see vercel.json). Vercel sends
 * Authorization: Bearer $CRON_SECRET. Locally (dev) it runs without a secret.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const dev = process.env.NODE_ENV !== "production";
  if (!dev && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await resolveNewVisuals()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "resolve failed" }, { status: 500 });
  }
}
