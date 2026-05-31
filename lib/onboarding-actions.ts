"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  return user?.id ?? null;
}

export async function markBetaNoticeSeen(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("profiles")
      .update({ beta_notice_seen: true })
      .eq("id", user.id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

export async function markOnboardingCompleted(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

export async function markOnboardingDismissed(): Promise<{ ok: boolean }> {
  // Dismissal is session-level only (localStorage). This action is a no-op
  // server-side — it exists so the client can call it uniformly without caring
  // whether persistence is DB or local.
  return { ok: true };
}

/**
 * Fetch lightweight step-completion signals from the DB.
 * Returns booleans the client uses alongside localStorage fallbacks.
 */
export async function fetchOnboardingProgress(): Promise<{
  hasSaved: boolean;
  hasWorkbench: boolean;
  profileComplete: boolean;
}> {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { hasSaved: false, hasWorkbench: false, profileComplete: false };

    const [bookmarksRes, notesRes, profileRes] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("workbench_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null),
      supabase
        .from("profiles")
        .select("display_name, short_bio, affiliation")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const hasSaved = (bookmarksRes.count ?? 0) > 0;
    const hasWorkbench = (notesRes.count ?? 0) > 0;

    const p = profileRes.data as { display_name?: string | null; short_bio?: string | null; affiliation?: string | null } | null;
    const profileComplete = Boolean(
      p?.display_name?.trim() && (p?.short_bio?.trim() || p?.affiliation?.trim()),
    );

    return { hasSaved, hasWorkbench, profileComplete };
  } catch {
    return { hasSaved: false, hasWorkbench: false, profileComplete: false };
  }
}
