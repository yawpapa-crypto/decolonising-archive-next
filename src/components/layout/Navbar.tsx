// Server-side navbar wrapper. Reads the current profile from Supabase, then
// hands a plain serialisable shape to the client navbar so the avatar menu
// can render without re-fetching.

import { getCurrentProfile } from "@/src/lib/auth";
import NavbarClient, { type NavProfile } from "./NavbarClient";

export default async function Navbar() {
  const profile = await getCurrentProfile();

  const navProfile: NavProfile | null = profile
    ? {
        email: profile.email,
        full_name: profile.full_name,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      }
    : null;

  return <NavbarClient profile={navProfile} />;
}
