import Link from "next/link";
import { Suspense } from "react";
import { accountState } from "@/lib/onboarding/account-state";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/src/lib/security/validate";
import { getCurrentUser } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readState } from "@/lib/onboarding/profile";
import AuthPageShell from "@/components/auth/AuthPageShell";
import EditorialCollage from "@/components/auth/EditorialCollage";
import { resendSignupConfirmation } from "./actions";
import AuthSubmit from "@/components/auth/AuthSubmit";
import SignupFlow from "./SignupFlow";
import "@/app/styles/auth-pages.css";
export const metadata = { title: "Get started | Decolonising Archive", robots: { index: false, follow: false } };
export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; sent?: string; email?: string; updated?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "/for-you");
  const onboarding = `/onboarding?next=${encodeURIComponent(next)}`;
  const user = await getCurrentUser();
  if (user) {
    const supabase = await createClient();
    const state = await readState(supabase, user.id);
    // A finished member who lands here again (a stale link, or the feed bounce) goes to their destination.
    if (accountState(user, state) !== "new" && accountState(user, state) !== "partial") redirect(next);
    redirect(onboarding);
  }
  return <AuthPageShell><main className="signup-layout">
    {sp.sent ? <section className="signup-sequence"><div className="signup-stage"><h1>Check your inbox</h1><p>Follow the confirmation link sent to <strong>{sp.email || "your email"}</strong>, then continue setting up your profile.</p>{sp.error && <p role="alert">{sp.error}</p>}{sp.updated && <p role="status">{sp.updated}</p>}<form action={resendSignupConfirmation}><input type="hidden" name="email" value={sp.email || ""} /><input type="hidden" name="next" value={next} /><AuthSubmit pendingLabel="Sending confirmation…">Resend confirmation email</AuthSubmit></form><Link href={`/signin?next=${encodeURIComponent(onboarding)}`}>Already confirmed? Sign in</Link></div></section> : <SignupFlow next={onboarding} error={sp.error} />}
    <Suspense fallback={<aside className="signup-collage" aria-hidden="true" />}><EditorialCollage variant="signup" /></Suspense>
  </main></AuthPageShell>;
}
