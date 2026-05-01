import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentUser } from "@/src/lib/auth";
import { signInWithMagicLink, signInWithPassword } from "../signin/actions";

type SearchParams = Promise<{
  error?: string;
  sent?: string;
  email?: string;
}>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <PageShell>
      <main className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Admin</p>
          <h1 className="auth-title">Admin sign in</h1>
          <p className="auth-sub">
            Sign in with an account that has the Admin role to manage archive
            content, users, and moderation.
          </p>

          {sp.error ? <p className="auth-error">{sp.error}</p> : null}
          {sp.sent ? (
            <p className="auth-notice">
              We sent a magic link to{" "}
              <strong>{sp.email ?? "your email"}</strong>. Open it on this
              device to continue to admin.
            </p>
          ) : null}

          <form action={signInWithPassword} className="auth-form">
            <input type="hidden" name="next" value="/admin" />
            <input type="hidden" name="statusPath" value="/admin-login" />
            <label className="auth-field">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="auth-submit">
              Sign in to admin
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form action={signInWithMagicLink} className="auth-form">
            <input type="hidden" name="next" value="/admin" />
            <input type="hidden" name="statusPath" value="/admin-login" />
            <label className="auth-field">
              <span>Email me an admin magic link</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <button type="submit" className="auth-submit auth-submit-secondary">
              Send magic link
            </button>
          </form>

          <p className="auth-footer">
            Need a member account first? <Link href="/signup">Create one</Link>.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
