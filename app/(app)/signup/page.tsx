// Sign-up page — Member accounts only.
// Curator and Admin roles are assigned by an Admin after the account exists.

import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentUser } from "@/src/lib/auth";
import { signUpMember } from "./actions";

type SearchParams = Promise<{
  next?: string;
  error?: string;
  sent?: string;
  email?: string;
}>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/workspace";

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <PageShell>
      <main className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Decolonising Archive</p>
          <h1 className="auth-title">Create a Member account</h1>
          <p className="auth-sub">
            Members can bookmark records, save searches, build reading lists,
            and export their saved materials. Curator and Admin access is
            assigned by an Admin and cannot be self-selected.
          </p>

          {sp.error ? <p className="auth-error">{sp.error}</p> : null}

          {sp.sent ? (
            <p className="auth-notice">
              Check{" "}
              <strong>{sp.email ?? "your inbox"}</strong> for a confirmation
              link. Once you confirm, you can sign in.
            </p>
          ) : (
            <form action={signUpMember} className="auth-form">
              <label className="auth-field">
                <span>Full name (optional)</span>
                <input
                  type="text"
                  name="full_name"
                  autoComplete="name"
                />
              </label>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <small className="auth-hint">At least 8 characters.</small>
              </label>
              <button type="submit" className="auth-submit">
                Create account
              </button>
            </form>
          )}

          <p className="auth-footer">
            Already have an account?{" "}
            <Link href={`/signin?next=${encodeURIComponent(next)}`}>
              Sign in
            </Link>
            .
          </p>
        </div>
      </main>
    </PageShell>
  );
}
