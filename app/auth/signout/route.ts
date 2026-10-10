// Sign out endpoint. POST to it from the navbar avatar menu.
// We use POST (not GET) so the link can't be triggered by a stray prefetch.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();

  const to = new URL(request.url).searchParams.get("to");
  const url = new URL(to === "signin" ? "/signin?switch=1&next=/home-next/for-you" : "/", request.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  // Belt and braces: make sure no Supabase session cookie survives the redirect.
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  }
  return res;
}
