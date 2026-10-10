"use server";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function updateProfile(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/home-next/settings");
  const profile_visibility = ["public", "members_only"].includes(String(form.get("profile_visibility"))) ? String(form.get("profile_visibility")) : "private";
  const full_name = String(form.get("full_name") || "").trim().slice(0, 120);
  const bio = String(form.get("bio") || "").trim().slice(0, 240);
  const website = String(form.get("website") || "").trim().slice(0, 500);
  if (website) {
    try { const url = new URL(website); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch { redirect("/settings?error=Use%20a%20complete%20http%20or%20https%20website%20address."); }
  }
  const { error } = await supabase.auth.updateUser({ data: { full_name, bio, website } });
  if (error) redirect("/settings?error=Your%20profile%20could%20not%20be%20saved.%20Try%20again.");
  // Keep the existing display name used elsewhere in the archive in sync.
  const { error: profileError } = await supabase.from("profiles").update({ full_name, display_name: full_name, short_bio: bio, website, profile_visibility }).eq("id", user.id);
  revalidatePath("/profile");
  redirect(profileError ? "/settings?saved=1&notice=Your%20archive%20display%20name%20could%20not%20be%20synced." : "/settings?saved=1");
}
