// Auth + role helpers for server-side use.
// Pulls the signed-in user from Supabase Auth and joins the `profiles` row
// (which carries the role: member / curator / admin).
//
// Use the require* helpers at the top of any server component or route handler
// that should be gated. They throw redirects to /signin (anonymous) or
// /workspace (signed-in but under-privileged).

import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/src/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Role = "member" | "curator" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string | null;
  onboarding_completed: boolean;
  beta_notice_seen: boolean;
};

function isEmailConfirmed(user: User | null): boolean {
  if (!user) return false;
  const authUser = user as User & { confirmed_at?: string | null };
  return Boolean(authUser.email_confirmed_at ?? authUser.confirmed_at);
}

function verificationRedirect(next: string, email?: string | null): never {
  const params = new URLSearchParams({
    verify: "1",
    next,
  });
  if (email) params.set("email", email);
  redirect(`/signin?${params.toString()}`);
}

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  curator: 2,
  admin: 3,
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  return isEmailConfirmed(user) ? user : null;
}

async function getProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<Profile> {
  // Prefer full row (member profile migration). If 0007 columns are missing,
  // the query fails — fall back to core columns so role (admin/curator) is never
  // replaced with a hard-coded "member" from auth metadata.
  const extended = await supabase
    .from("profiles")
    .select("id, email, full_name, display_name, preferred_name, avatar_url, role, created_at, onboarding_completed, beta_notice_seen")
    .eq("id", user.id)
    .maybeSingle();

  if (!extended.error && extended.data) {
    const row = extended.data as Record<string, unknown>;
    return {
      ...(row as Profile),
      onboarding_completed: Boolean(row.onboarding_completed ?? false),
      beta_notice_seen: Boolean(row.beta_notice_seen ?? false),
    };
  }

  const core = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!core.error && core.data) {
    const row = core.data;
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      display_name: null,
      preferred_name: null,
      avatar_url: null,
      role: row.role as Role,
      created_at: row.created_at,
      onboarding_completed: false,
      beta_notice_seen: false,
    };
  }

  // No profiles row yet (e.g. trigger lag) — last-resort shape; role defaults to member.
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    display_name: null,
    preferred_name: null,
    avatar_url: null,
    role: "member",
    created_at: user.created_at ?? null,
    onboarding_completed: false,
    beta_notice_seen: false,
  };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user || !isEmailConfirmed(user)) return null;
  return getProfileForUser(supabase, user);
}

export function hasRole(profile: Profile | null, min: Role): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[min];
}

export async function requireMember(next = "/workspace"): Promise<Profile> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  if (!isEmailConfirmed(user)) verificationRedirect(next, user.email);
  return getProfileForUser(supabase, user);
}

export async function requireCurator(): Promise<Profile> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) redirect("/auth/sign-in?next=/curator");
  if (!isEmailConfirmed(user)) verificationRedirect("/curator", user.email);
  const profile = await getProfileForUser(supabase, user);
  if (!hasRole(profile, "curator")) redirect("/workspace?denied=curator");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) redirect("/admin/signin?next=/admin");
  if (!isEmailConfirmed(user)) verificationRedirect("/admin", user.email);
  const profile = await getProfileForUser(supabase, user);
  if (!hasRole(profile, "admin")) redirect("/workspace?denied=admin");
  return profile;
}

export { isEmailConfirmed };
