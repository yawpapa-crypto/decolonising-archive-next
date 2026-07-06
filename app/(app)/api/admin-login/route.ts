import { NextResponse } from "next/server";

/** Legacy password gate — superseded by Supabase admin sign-in at /admin/signin. */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Legacy admin login is disabled. Use /admin/signin with your admin account.",
    },
    { status: 410 },
  );
}
