import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/src/lib/supabase/server";
import { usernameFree } from "@/lib/onboarding/profile";
import { normaliseUsername, validateUsername } from "@/lib/onboarding/shared";

export const dynamic = "force-dynamic";

function candidates(seed: string): string[] {
  const words = seed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/@.*/, (m) => m)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!words.length) return [];
  const [first, ...rest] = words;
  const last = rest[rest.length - 1] ?? "";
  let h = 0;
  for (const ch of words.join("")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const list = [
    words.join("_"),
    words.join(""),
    last ? `${first}_${last}` : first,
    last ? `${first[0]}${last}` : `${first}_ared`,
    last ? `${first}${last[0]}` : `${first}${(h % 90) + 10}`,
    `${first}${(h % 90) + 10}`,
    `${first}_${(h % 900) + 100}`,
    `${first}.${last}`.replace(/\./g, "_"),
  ];
  return [...new Set(list.map((c) => c.slice(0, 24)))].filter((c) => !validateUsername(c));
}

/** GET ?u=name checks one username. GET ?suggest=Full Name returns up to three that are really free. */
export async function GET(request: Request) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "Accounts are temporarily unavailable. Please try again later." }, { status: 503 });
  const url = new URL(request.url);
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });

    const suggest = url.searchParams.get("suggest");
    if (suggest !== null) {
      const out: string[] = [];
      for (const c of candidates(suggest.slice(0, 80))) {
        if (out.length >= 3) break;
        if ((await usernameFree(supabase, c)) === true) out.push(c);
      }
      return NextResponse.json({ ok: true, suggestions: out });
    }

    const u = normaliseUsername(url.searchParams.get("u") ?? "");
    const problem = validateUsername(u);
    if (problem) return NextResponse.json({ ok: true, valid: false, available: false, username: u, reason: problem });
    const free = await usernameFree(supabase, u);
    // Uniqueness cannot be checked until the database function exists; accept the name rather than blocking sign-up.
    if (free === null) return NextResponse.json({ok:false,error:"Could not check that name right now."},{status:503});
    const available = free;
    return NextResponse.json({ ok: true, valid: true, available, username: u, reason: available ? undefined : "That username is taken." });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not check that name right now." }, { status: 503 });
  }
}
