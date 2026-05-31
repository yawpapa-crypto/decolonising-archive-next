// Server-side navbar wrapper. Reads the current profile from Supabase, then
// hands a plain serialisable shape to the client navbar so the avatar menu
// can render without re-fetching.
//
// All Supabase calls are wrapped in try/catch with a hard timeout so a slow
// or unavailable database never blocks the navbar — and therefore never blocks
// any page that uses PageShell.

import { getCurrentProfile } from "@/src/lib/auth";
import { getMemberNavSummary } from "@/src/lib/member-nav";
import NavbarClient, { type NavProfile } from "./NavbarClient";

const NAV_TIMEOUT_MS = 3000;

/** Race a promise against a timeout; resolves to null on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export default async function Navbar() {
  let navProfile: NavProfile | null = null;
  let navSummary: Awaited<ReturnType<typeof getMemberNavSummary>> | null = null;

  try {
    const profile = await withTimeout(getCurrentProfile(), NAV_TIMEOUT_MS);

    if (profile) {
      navProfile = {
        email: profile.email,
        full_name: profile.full_name,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      };

      navSummary = await withTimeout(
        getMemberNavSummary(profile.id),
        NAV_TIMEOUT_MS,
      );
    }
  } catch {
    // Supabase unavailable or slow — render navbar without auth state.
    // The user will appear logged out but the page will still render.
  }

  return <NavbarClient profile={navProfile} navSummary={navSummary} />;
}
