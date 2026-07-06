import type { Profile } from "@/src/lib/auth";
import type { MemberProfileRecord } from "@/src/lib/member-profile-types";

export function buildFallbackMemberProfile(p: Profile): MemberProfileRecord {
  return {
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    display_name: p.display_name ?? null,
    preferred_name: null,
    avatar_url: p.avatar_url ?? null,
    avatar_path: null,
    affiliation: null,
    organisation: null,
    role_title: null,
    website: null,
    short_bio: null,
    research_interests: null,
    contact_email: null,
    address_line_1: null,
    address_line_2: null,
    city: null,
    state_region: null,
    postcode: null,
    country: null,
    profile_visibility: "private",
    role: p.role,
    created_at: p.created_at,
    updated_at: null,
  };
}
