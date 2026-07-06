// Sign out endpoint. POST to it from the navbar avatar menu.
// We use POST (not GET) so the link can't be triggered by a stray prefetch.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
