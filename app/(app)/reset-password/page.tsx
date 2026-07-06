import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentUser } from "@/src/lib/auth";
import { updatePassword } from "./actions";

type SearchParams = Promise<{
  error?: string;
  updated?: string;
}>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  return (
    <PageShell>
      <main className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Decolonising Archive</p>
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-sub">
            Enter a new password for your archive account.
          </p>

          {sp.error ? <p className="auth-error">{sp.error}</p> : null}
          {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}
          {!user ? (
            <p className="auth-error">
              Password reset link has expired. Please request a new one.
            </p>
          ) : null}

          <form action={updatePassword} className="auth-form">
            <label className="auth-field">
              <span>New password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirm_password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="auth-submit" disabled={!user}>
              Update password
            </button>
          </form>

          <p className="auth-footer">
            <Link href="/signin">Back to sign in</Link>
          </p>
        </div>
      </main>
    </PageShell>
  );
}
