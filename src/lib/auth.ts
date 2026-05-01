// Auth + role helpers for server-side use.
// Pulls the signed-in user from Supabase Auth and joins the `profiles` row
// (which carries the role: member / curator / admin).
//
// Use the require* helpers at the top of any server component or route handler
// that should be gated. They throw redirects to /signin (anonymous) or
// /workspace (signed-in but under-privileged).

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export type Role = "member" | "curator" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  created_at: string | null;
};

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  curator: 2,
  admin: 3,
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // Fallback so the app still works if the profile row hasn't been created
    // yet (e.g. trigger hasn't run, or migration not applied).
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      role: "member",
      created_at: user.created_at ?? null,
    };
  }
  return data as Profile;
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
  if (!profile) redirect("/auth/sign-in?next=/admin");
  if (!hasRole(profile, "admin")) redirect("/workspace?denied=admin");
  return profile;
}
