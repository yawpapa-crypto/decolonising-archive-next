import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getCurrentProfile } from "@/src/lib/auth";
import { emailConfirmed } from "@/lib/account/delete-guard";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { usernameFree } from "@/lib/onboarding/profile";
import { normaliseUsername, validateUsername } from "@/lib/onboarding/shared";

export const dynamic = "force-dynamic";

/** The signed-in member's profile, for the Settings pop-up. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const md = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    let username = "";
    try {
      const { data: p } = await supabase.from("profiles").select("username, full_name").eq("id", user.id).maybeSingle();
      username = String((p as { username?: string } | null)?.username ?? "");
    } catch { /* column not present yet */ }
    const admin = (await getCurrentProfile().catch(() => null))?.role === "admin";
    return NextResponse.json({ admin, email: user.email ?? "", username, full_name: md.full_name ?? "", bio: md.bio ?? "", website: md.website ?? "" });
  } catch {
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ error: "Your session ended. Sign in again." }, { status: 401 });
    const full_name = String(b.full_name ?? "").trim().slice(0, 120);
    const bio = String(b.bio ?? "").trim().slice(0, 240);
    const website = String(b.website ?? "").trim().slice(0, 500);
    if (website) {
      try { if (!["http:", "https:"].includes(new URL(website).protocol)) throw new Error(); }
      catch { return NextResponse.json({ error: "Use a complete http or https website address." }, { status: 400 }); }
    }
    const username = b.username === undefined ? null : normaliseUsername(String(b.username));
    if (username) {
      const bad = validateUsername(username);
      if (bad) return NextResponse.json({ error: bad }, { status: 400 });
      if ((await usernameFree(supabase, username)) === false) return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    const { error } = await supabase.auth.updateUser({ data: { full_name, bio, website } });
    if (error) return NextResponse.json({ error: "Your profile could not be saved. Try again." }, { status: 500 });
    const patch: Record<string, unknown> = { full_name };
    if (username) patch.username = username;
    const { error: pe } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (pe) {
      if ((pe as { code?: string }).code === "23505") return NextResponse.json({ error: "That username was just taken." }, { status: 409 });
      if (username) return NextResponse.json({ error: "Your username could not be saved yet." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

/** Permanently deletes the signed-in member's account. The member must type their email address. */
export async function DELETE(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { confirm?: string };
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ error: "Your session ended. Sign in again." }, { status: 401 });
    if (!emailConfirmed(b.confirm, user.email)) {
      return NextResponse.json({ error: "Type your email address exactly to confirm." }, { status: 400 });
    }
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: "Your account could not be deleted. Contact us and we will do it for you." }, { status: 500 });
    await supabase.auth.signOut().catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
