// Auth + role helpers for server-side use.
// Pulls the signed-in user from Supabase Auth and joins the `profiles` row
// (which carries the role: member / curator / admin).
//
// Use the require* helpers at the top of any server component or route handler
// that should be gated. They throw redirects to /signin (anonymous) or
// /workspace (signed-in but under-privileged).

import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/src/lib/supabase/server";

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

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  curator: 2,
  admin: 3,
};

export async function getCurrentUser() {
  const supabase = await createClient();
  return getAuthenticatedUser(supabase);
}

const DB_QUERY_TIMEOUT_MS =
  process.env.NODE_ENV === "production" ? 4000 : 2500;

/** Race a Supabase query against a timeout; returns null on timeout. */
function withDbTimeout<T>(
  query: PromiseLike<T>,
  ms = DB_QUERY_TIMEOUT_MS,
): Promise<T | null> {
  return Promise.race([
    Promise.resolve(query),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return null;

  // Prefer full row. Both queries are raced against a hard timeout so a slow
  // database never blocks page rendering.
  const extendedResult = await withDbTimeout(
    supabase
      .from("profiles")
      .select("id, email, full_name, display_name, preferred_name, avatar_url, role, created_at, onboarding_completed, beta_notice_seen")
      .eq("id", user.id)
      .maybeSingle(),
  );

  if (extendedResult && !extendedResult.error && extendedResult.data) {
    const row = extendedResult.data as Record<string, unknown>;
    return {
      ...(row as Profile),
      onboarding_completed: Boolean(row.onboarding_completed ?? false),
      beta_notice_seen: Boolean(row.beta_notice_seen ?? false),
    };
  }

  const coreResult = await withDbTimeout(
    supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", user.id)
      .maybeSingle(),
  );

  if (coreResult && !coreResult.error && coreResult.data) {
    const row = coreResult.data;
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

  // No profiles row yet or DB timed out — fall back to auth metadata only.
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

export function hasRole(profile: Profile | null, min: Role): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[min];
}

export async function requireMember(next = "/workspace"): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return profile;
}

export async function requireCurator(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/sign-in?next=/curator");
  if (!hasRole(profile, "curator")) redirect("/workspace?denied=curator");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/admin/signin?next=/admin");
  if (!hasRole(profile, "admin")) redirect("/workspace?denied=admin");
  return profile;
}
