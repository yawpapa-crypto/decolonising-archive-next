"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import type { MemberProfileRecord, ProfileVisibility } from "@/src/lib/member-profile-types";

const BIO_MAX_LEN = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeWebsite(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const s = raw.trim();
  if (!s) return { ok: true, value: null };
  try {
    const href = s.includes("://") ? s : `https://${s}`;
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "Website must use http or https." };
    }
    return { ok: true, value: u.toString() };
  } catch {
    return { ok: false, error: "Enter a valid website URL." };
  }
}

function visibilityFrom(raw: string): ProfileVisibility | null {
  if (raw === "private" || raw === "members_only" || raw === "public") return raw;
  return null;
}

export async function getMemberProfileRow(): Promise<MemberProfileRecord | null> {
  const session = await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", session.id).maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    email: session.email ?? (row.email as string | null) ?? null,
    full_name: (row.full_name as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    preferred_name: (row.preferred_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    avatar_path: (row.avatar_path as string | null) ?? null,
    affiliation: (row.affiliation as string | null) ?? null,
    organisation: (row.organisation as string | null) ?? null,
    role_title: (row.role_title as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    short_bio: (row.short_bio as string | null) ?? null,
    research_interests: (row.research_interests as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    address_line_1: (row.address_line_1 as string | null) ?? null,
    address_line_2: (row.address_line_2 as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state_region: (row.state_region as string | null) ?? null,
    postcode: (row.postcode as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    profile_visibility:
      visibilityFrom(String(row.profile_visibility ?? "private")) ?? "private",
    role: String(row.role ?? "member"),
    created_at: row.created_at as string | null,
    updated_at: row.updated_at as string | null,
  };
}

export type ProfileUpdatePayload = {
  full_name?: string | null;
  display_name?: string | null;
  preferred_name?: string | null;
  contact_email?: string | null;
  website?: string | null;
  affiliation?: string | null;
  organisation?: string | null;
  role_title?: string | null;
  short_bio?: string | null;
  research_interests?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state_region?: string | null;
  postcode?: string | null;
  country?: string | null;
  profile_visibility?: ProfileVisibility;
};

export async function updateMemberProfile(
  payload: ProfileUpdatePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireMember();
  if (payload.profile_visibility !== undefined && !visibilityFrom(payload.profile_visibility)) {
    return { ok: false, error: "Invalid visibility value." };
  }

  const contact =
    payload.contact_email !== undefined ? payload.contact_email?.trim() || null : undefined;
  if (contact !== undefined && contact !== null && contact !== "" && !EMAIL_RE.test(contact)) {
    return { ok: false, error: "Contact email does not look valid." };
  }

  let websiteVal: string | null | undefined;
  if (payload.website !== undefined) {
    const w = normalizeWebsite(payload.website ?? "");
    if (!w.ok) return { ok: false, error: w.error };
    websiteVal = w.value;
  }

  const bioRaw = payload.short_bio !== undefined ? payload.short_bio ?? "" : undefined;
  if (bioRaw !== undefined && bioRaw.length > BIO_MAX_LEN) {
    return { ok: false, error: `Bio must be at most ${BIO_MAX_LEN} characters.` };
  }

  const patch: Record<string, unknown> = {};
  if (payload.full_name !== undefined) patch.full_name = payload.full_name?.trim() || null;
  if (payload.display_name !== undefined) patch.display_name = payload.display_name?.trim() || null;
  if (payload.preferred_name !== undefined) patch.preferred_name = payload.preferred_name?.trim() || null;
  if (contact !== undefined) patch.contact_email = contact === "" ? null : contact;
  if (websiteVal !== undefined) patch.website = websiteVal;
  if (payload.affiliation !== undefined) patch.affiliation = payload.affiliation?.trim() || null;
  if (payload.organisation !== undefined) patch.organisation = payload.organisation?.trim() || null;
  if (payload.role_title !== undefined) patch.role_title = payload.role_title?.trim() || null;
  if (bioRaw !== undefined) patch.short_bio = bioRaw.trim() || null;
  if (payload.research_interests !== undefined) {
    patch.research_interests = payload.research_interests?.trim() || null;
  }
  if (payload.address_line_1 !== undefined) patch.address_line_1 = payload.address_line_1?.trim() || null;
  if (payload.address_line_2 !== undefined) patch.address_line_2 = payload.address_line_2?.trim() || null;
  if (payload.city !== undefined) patch.city = payload.city?.trim() || null;
  if (payload.state_region !== undefined) patch.state_region = payload.state_region?.trim() || null;
  if (payload.postcode !== undefined) patch.postcode = payload.postcode?.trim() || null;
  if (payload.country !== undefined) patch.country = payload.country?.trim() || null;
  if (payload.profile_visibility !== undefined) patch.profile_visibility = payload.profile_visibility;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to save." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/workspace");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadProfileAvatar(
  formData: FormData,
): Promise<{ ok: true; avatar_url: string } | { ok: false; error: string }> {
  const profile = await requireMember();
  const file = formData.get("avatar");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return { ok: false, error: "Choose an image file." };
  }
  const f = file as File;
  if (!f.size) return { ok: false, error: "File is empty." };
  if (f.size > 5 * 1024 * 1024) return { ok: false, error: "Image must be 5 MB or smaller." };
  const mime = f.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return { ok: false, error: "Only image files are allowed." };
  }
  const unsafeName = (f.name || "").split(/[/\\]/).pop() || "avatar";
  const extFromName = unsafeName.includes(".") ? unsafeName.split(".").pop()!.toLowerCase() : "";
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/jpeg" || mime === "image/jpg"
        ? "jpg"
        : mime === "image/gif"
          ? "gif"
          : mime === "image/webp"
            ? "webp"
            : extFromName && ["png", "jpg", "jpeg", "gif", "webp"].includes(extFromName)
              ? extFromName === "jpeg"
                ? "jpg"
                : extFromName
              : "jpg";

  const supabase = await createClient();
  const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", profile.id)
    .maybeSingle();
  const oldPath = existing?.avatar_path as string | null | undefined;

  const buf = Buffer.from(await f.arrayBuffer());
  const { error: upErr } = await supabase.storage.from("profile-avatars").upload(path, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) return { ok: false, error: upErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-avatars").getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, avatar_path: path })
    .eq("id", profile.id);

  if (dbErr) {
    await supabase.storage.from("profile-avatars").remove([path]);
    return { ok: false, error: dbErr.message };
  }

  if (oldPath && oldPath !== path) {
    await supabase.storage.from("profile-avatars").remove([oldPath]);
  }

  revalidatePath("/workspace");
  revalidatePath("/", "layout");
  return { ok: true, avatar_url: publicUrl };
}

export async function removeProfileAvatar(): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireMember();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", profile.id)
    .maybeSingle();
  const path = row?.avatar_path as string | null | undefined;
  if (path) {
    await supabase.storage.from("profile-avatars").remove([path]);
  }
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, avatar_path: null })
    .eq("id", profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/workspace");
  revalidatePath("/", "layout");
  return { ok: true };
}
