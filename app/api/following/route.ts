import { NextResponse } from "next/server";
import { followingPage } from "@/lib/following/server";
import { gorseFeedback } from "@/lib/following/gorse";
import { createClient } from "@/src/lib/supabase/server";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      await followingPage(
        new URL(request.url).searchParams.get("cursor") ?? undefined,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const b = await request.json().catch(() => null);
  if (
    !b ||
    !uuid.test(b.id) ||
    !["profile", "collection"].includes(b.kind) ||
    typeof b.follow !== "boolean"
  )
    return NextResponse.json(
      { error: "Invalid follow target" },
      { status: 400 },
    );
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in to follow." }, { status: 401 });
  if (b.kind === "profile" && b.id === user.id)
    return NextResponse.json({ error: "You can't follow your own profile." }, { status: 400 });
  const key = b.kind === "profile" ? "profile_id" : "collection_id";
  const result = b.follow
    ? await db
        .from("curatorial_follows")
        .insert({ user_id: user.id, [key]: b.id })
    : await db
        .from("curatorial_follows")
        .delete()
        .eq("user_id", user.id)
        .eq(key, b.id);
  if (result.error && result.error.code !== "23505")
    return NextResponse.json(
      { error: "That public target is unavailable." },
      { status: 409 },
    );
  if (b.follow) gorseFeedback("follow", user.id, `${b.kind}:${b.id}`);
  return NextResponse.json({ ok: true, following: b.follow });
}
