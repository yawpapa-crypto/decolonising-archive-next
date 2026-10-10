import { onboardingConfig } from "@/lib/onboarding/config";
import { accountState } from "@/lib/onboarding/account-state";
import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/src/lib/supabase/server";
import { interestGroups, sanitizeInterests } from "@/lib/onboarding/taxonomy";
import { readState, usernameFree } from "@/lib/onboarding/profile";
import { CONTEXTS, MIN_INTERESTS, countInterests, normaliseUsername, validateUsername } from "@/lib/onboarding/shared";

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

async function who() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Profile columns from the onboarding migration may be absent. The account metadata still resumes the wizard. */
async function remember(supabase: Awaited<ReturnType<typeof createClient>>, data: Record<string, unknown>) {
  const { error } = await supabase.auth.updateUser({ data });
  return error;
}

/** Current onboarding state plus the real taxonomy groups. */
export async function GET() {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "Accounts are temporarily unavailable. Please try again later." }, { status: 503 });
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Sign in first.", 401);
    const state = await readState(supabase, user.id);
    return NextResponse.json({ ok: true, state: { ...state, age: user.user_metadata?.age ?? null }, accountState: accountState(user, state), config: onboardingConfig, groups: interestGroups() });
  } catch {
    return fail("Could not load your profile.", 500);
  }
}

/** One endpoint, four small actions. Each saves immediately so an interrupted session resumes where it stopped. */
export async function POST(request: Request) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "Accounts are temporarily unavailable. Please try again later." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Your session ended. Sign in to continue.", 401);

    if (action === "name") {
      const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
      if (name.length < 2) return fail("Enter your full name.", 400);
      // Tolerant on purpose: a missing optional column must never stop someone signing up.
      let { error } = await supabase.from("profiles").update({ full_name: name, display_name: name, onboarding_step: 1 }).eq("id", user.id);
      if (error) ({ error } = await supabase.from("profiles").update({ full_name: name, display_name: name }).eq("id", user.id));
      if (error) ({ error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id));
      const metaError = await remember(supabase, { full_name: name, onboarding_step: 1 });
      if (error && metaError) return fail("Your name could not be saved. Try again.", 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "age") {
      const age = body.age == null ? null : Number(body.age);
      if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return fail("Enter an age between 1 and 120, or skip.", 400);
      const { error } = await supabase.auth.updateUser({ data: { age, onboarding_step: 2 } });
      if (error) return fail("Your age could not be saved. Try again.", 500);
      await supabase.from("profiles").update({ onboarding_step: 2 }).eq("id", user.id); // progress marker only; ignore if the column is absent
      return NextResponse.json({ ok: true });
    }

    if (action === "context") {
      const raw = String(body.context ?? "");
      const context = (CONTEXTS as readonly string[]).includes(raw) ? raw : "";
      const state = await readState(supabase, user.id);
      const interests = { ...state.interests, context: context || undefined };
      const { error } = await supabase.from("profiles").update({ interests, onboarding_step: 2 }).eq("id", user.id);
      if (error && await remember(supabase, { interests, onboarding_step: 2 })) return fail("Your choices could not be saved. Try again.", 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "username") {
      const username = normaliseUsername(String(body.username ?? ""));
      const problem = validateUsername(username);
      if (problem) return fail(problem, 400);
      const free = await usernameFree(supabase, username);
      if (free === false) return fail("That username is taken.", 409);
      let { error } = await supabase.from("profiles").update({ username, onboarding_step: 3 }).eq("id", user.id);
      if (error && (error as { code?: string }).code !== "23505") ({ error } = await supabase.from("profiles").update({ username }).eq("id", user.id));
      if (error) {
        // The unique index is the final judge: two people can pass the check at once.
        if ((error as { code?: string }).code === "23505") return fail("That username was just taken. Choose another.", 409);
        return fail("Your username could not be saved. Try again.", 500);
      }
      await remember(supabase, { username, onboarding_step: 3 });
      return NextResponse.json({ ok: true, username });
    }

    if (action === "interests" || action === "complete") {
      const state = await readState(supabase, user.id);
      const clean = sanitizeInterests(body.interests);
      clean.context = clean.context ?? state.interests.context;
      if (action === "complete" && body.skip !== true && countInterests(clean) < MIN_INTERESTS) {
        return fail(`Choose at least ${MIN_INTERESTS} interests, or skip for now.`, 400);
      }
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { interests: clean, interests_updated_at: now };
      if (action === "complete") {
        patch.onboarding_step = 4;
        patch.onboarding_completed_at = state.completedAt ?? now;
      }
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      const progress: Record<string, unknown> = { interests: clean, onboarding_step: action === "complete" || state.completedAt ? 4 : Math.max(3, state.step) };
      if (action === "complete") progress.onboarding_completed_at = state.completedAt ?? now;
      // Always mirror onto the account. The interests columns are not on every database yet, and a
      // failed profile write used to report success without recording that onboarding had finished.
      if (error || action === "complete") {
        const metaError = await remember(supabase, progress);
        if (error && metaError) return fail("Your choices could not be saved. Try again.", 500);
      }
      return NextResponse.json({ ok: true, interests: clean });
    }

    return fail("Unknown action.", 400);
  } catch {
    return fail("Something went wrong. Your choices are still on this screen.", 500);
  }
}
