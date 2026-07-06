import { redirect } from "next/navigation";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import PageShell from "@/src/components/layout/PageShell";

export const metadata = { title: "Profile Settings | Decolonising Archive" };

async function updateProfile(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 80) || null;
  const short_bio = String(formData.get("short_bio") ?? "").trim().slice(0, 400) || null;
  const affiliation = String(formData.get("affiliation") ?? "").trim().slice(0, 120) || null;
  const website = String(formData.get("website") ?? "").trim().slice(0, 240) || null;
  const profile_visibility = String(formData.get("profile_visibility") ?? "public");

  const VALID_VISIBILITY = ["public", "community", "private"];
  const safeVisibility = VALID_VISIBILITY.includes(profile_visibility) ? profile_visibility : "public";

  await supabase
    .from("profiles")
    .update({ display_name, short_bio, affiliation, website, profile_visibility: safeVisibility })
    .eq("id", user.id);

  redirect("/my/settings?updated=1");
}

export default async function MySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const profile = await requireMember();
  const params = await searchParams;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, short_bio, affiliation, website, profile_visibility")
    .eq("id", profile.id)
    .maybeSingle();

  const p = row ?? {};

  return (
    <PageShell>
      <main className="legal-page">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Account</p>
          <h1>Profile Settings</h1>

          {params.updated && (
            <p className="admin-success" role="status" style={{ marginBottom: "1.5rem" }}>
              Profile updated.
            </p>
          )}

          <form action={updateProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "36rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Display name</span>
              <input
                name="display_name"
                defaultValue={(p as { display_name?: string | null }).display_name ?? ""}
                maxLength={80}
                placeholder="How you appear to others"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Short bio</span>
              <textarea
                name="short_bio"
                defaultValue={(p as { short_bio?: string | null }).short_bio ?? ""}
                maxLength={400}
                rows={4}
                placeholder="A short description of your work or interests"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Affiliation</span>
              <input
                name="affiliation"
                defaultValue={(p as { affiliation?: string | null }).affiliation ?? ""}
                maxLength={120}
                placeholder="Institution, organisation, or independent"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Website</span>
              <input
                name="website"
                type="url"
                defaultValue={(p as { website?: string | null }).website ?? ""}
                maxLength={240}
                placeholder="https://…"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Profile visibility</span>
              <select
                name="profile_visibility"
                defaultValue={(p as { profile_visibility?: string | null }).profile_visibility ?? "public"}
              >
                <option value="public">Public — visible to everyone</option>
                <option value="community">Community — visible to signed-in members</option>
                <option value="private">Private — only visible to you</option>
              </select>
            </label>

            <button type="submit" className="admin-button" style={{ alignSelf: "flex-start" }}>
              Save changes
            </button>
          </form>
        </div>
      </main>
    </PageShell>
  );
}
