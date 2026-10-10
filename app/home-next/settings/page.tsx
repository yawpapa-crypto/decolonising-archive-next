import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import AccountShell from "../AccountShell";
import { requestPasswordReset } from "@/app/(app)/signin/actions";
import { updateProfile } from "./actions";
import SettingsForm from "./SettingsForm";
import { getCurrentProfile } from "@/src/lib/auth";
export const metadata = { title: "Profile settings | Decolonising Archive", robots: { index: false, follow: false } };
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; notice?: string; resetSent?: string }> }) {
  const [user, sp, me] = await Promise.all([getCurrentUser(), searchParams, getCurrentProfile().catch(() => null)]);
  if (!user) redirect("/signin?next=/home-next/settings");
  const db = await createClient();
  const { data: profile } = await db.from("profiles").select("profile_visibility").eq("id", user.id).maybeSingle();
  // The admin account speaks as the archive itself.
  const admin = me?.role === "admin";
  const ORG = "Decolonising Archive";
  const name = admin ? ORG : user.user_metadata?.full_name || "";
  const bio = admin ? user.user_metadata?.bio || "Open-access platform aggregating African and Global South design knowledge." : user.user_metadata?.bio || "";
  const website = admin ? user.user_metadata?.website || "https://ared.design" : user.user_metadata?.website || "";
  const visibility = admin ? "public" : profile?.profile_visibility || "private";
  return <AccountShell><main className="account-page"><div className="account-settings">
    <nav className="account-sidebar" aria-label="Account settings"><Link href="/home-next/settings" aria-current="page">Profile</Link><Link href="#account">Account details</Link><Link href="/home-next/preferences">Interests & discovery</Link><Link href="/home-next/profile">Collections</Link><Link href="/home-next/help">Help center</Link></nav>
    <div><h1>Profile</h1><div className="account-actions"><Link href="/home-next/profile" className="ared-btn ared-btn--outline">Back to your profile</Link></div>
    {sp.resetSent && <p role="status">Check your email for a password reset link.</p>}{sp.saved && <p role="status">Your profile has been saved.</p>}{sp.notice && <p role="status">{sp.notice}</p>}{sp.error && <p role="alert">{sp.error}</p>}
    {admin && <div className="st-id"><span className="st-id__av" aria-hidden>D</span><div><strong>{ORG}<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M12 2l2.4 1.7 2.9-.2 1.2 2.7 2.5 1.5-.5 2.9 1.3 2.6-1.9 2.2-.2 2.9-2.8.9-1.8 2.3L12 20.4 9.4 22l-1.8-2.3-2.8-.9-.2-2.9L2.7 13.7 4 11.1l-.5-2.9L6 6.7l1.2-2.7 2.9.2z"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></strong><em>Administrator · posts and curates as the archive</em></div></div>}
    <SettingsForm action={updateProfile} name={name} bio={bio} website={website} visibility={visibility} />
    <section id="account" className="help-article"><h2>Account details</h2><p>{user.email}</p><p>Manage your password through the secure recovery flow.</p><div className="account-actions"><form action={requestPasswordReset}><input type="hidden" name="email" value={user.email || ""} /><input type="hidden" name="statusPath" value="/home-next/settings" /><button className="ared-btn ared-btn--outline">Send password reset email</button></form><form action="/auth/signout" method="post"><button className="ared-btn ared-btn--outline">Sign out</button></form></div></section>
    </div></div></main></AccountShell>;
}
