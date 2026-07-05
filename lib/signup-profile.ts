import "server-only";

import { createAdminClient } from "@/src/lib/supabase/admin";

export type SignupProfileInput = {
  fullName?: string;
  affiliation?: string;
  organisation?: string;
  roleTitle?: string;
  country?: string;
  stateRegion?: string;
  city?: string;
  researchInterests?: string;
  collectionInterest?: string;
  heardAbout?: string;
  phone?: string;
};

export function signupMetadata(input: SignupProfileInput & { newsletterOptIn?: boolean }) {
  return {
    full_name: input.fullName || null,
    affiliation: input.affiliation || null,
    organisation: input.organisation || null,
    role_title: input.roleTitle || null,
    country: input.country || null,
    state_region: input.stateRegion || null,
    city: input.city || null,
    research_interests: input.researchInterests || null,
    collection_interest: input.collectionInterest || null,
    heard_about: input.heardAbout || null,
    phone: input.phone || null,
    newsletter_opt_in: Boolean(input.newsletterOptIn),
    ...(input.newsletterOptIn
      ? { newsletter_subscribed_at: new Date().toISOString(), newsletter_source: "signup" }
      : {}),
  };
}

export async function syncSignupProfile(userId: string, input: SignupProfileInput) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: input.fullName || null,
      affiliation: input.affiliation || null,
      organisation: input.organisation || null,
      role_title: input.roleTitle || null,
      country: input.country || null,
      state_region: input.stateRegion || null,
      city: input.city || null,
      research_interests: input.researchInterests || null,
      contact_email: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[signup] profile sync failed", error.message);
  }
}

export function parseSignupProfile(formData: FormData): SignupProfileInput {
  return {
    fullName: String(formData.get("full_name") ?? "").trim(),
    affiliation: String(formData.get("affiliation") ?? "").trim(),
    organisation: String(formData.get("organisation") ?? "").trim(),
    roleTitle: String(formData.get("role_title") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    stateRegion: String(formData.get("state_region") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    researchInterests: String(formData.get("research_interests") ?? "").trim(),
    collectionInterest: String(formData.get("collection_interest") ?? "").trim(),
    heardAbout: String(formData.get("heard_about") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  };
}
