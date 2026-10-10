import { redirect } from "next/navigation";
import Link from "next/link";
import AccountShell from "../AccountShell";
import ProfileCollections from "./ProfileCollections";
import { getCurrentUser } from "@/src/lib/auth";
export const metadata = { title: "Your profile | Decolonising Archive", robots: { index: false, follow: false } };
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/home-next/profile");
  const name = user.user_metadata?.full_name || "Archive member";
  return <AccountShell><main className="account-page">
    <div className="account-identity"><div className="account-avatar" aria-hidden>{name.slice(0, 1).toUpperCase()}</div><div><h1>{name}</h1><p>Your research, connected.</p></div></div>
    <p>{user.user_metadata?.bio || "A space for the knowledge you want to return to."}</p>
    <div className="account-actions"><Link className="ared-btn ared-btn--outline" href="/home-next/settings">Edit profile</Link><Link className="ared-btn ared-btn--outline" href="/home-next/preferences">Your interests</Link></div>
    <ProfileCollections />
  </main></AccountShell>;
}
