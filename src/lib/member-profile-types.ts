export type ProfileVisibility = "private" | "members_only" | "public";

export type MemberProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  affiliation: string | null;
  organisation: string | null;
  role_title: string | null;
  website: string | null;
  short_bio: string | null;
  research_interests: string | null;
  contact_email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state_region: string | null;
  postcode: string | null;
  country: string | null;
  profile_visibility: ProfileVisibility;
  role: string;
  created_at: string | null;
  updated_at: string | null;
};
