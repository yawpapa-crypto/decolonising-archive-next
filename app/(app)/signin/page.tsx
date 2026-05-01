// Sign-in page. Offers four methods:
//   1. Email + password
//   2. Magic link (passwordless)
//   3. Google OAuth
//   4. GitHub OAuth
//
// Already-signed-in users are bounced to the workspace.

import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentUser } from "@/src/lib/auth";
import { signInWithPassword, signInWithMagicLink } from "./actions";
import OAuthButtons from "./OAuthButtons";

type SearchParams = Promise<{
  next?: string;
  error?: string;
  sent?: string;
  email?: string;
}>;

export default async function SignInPage({
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
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">
            Members get bookmarks, saved searches, and reading lists across the
            archive. Curator and admin tools are unlocked by an admin.
          </p>

          {sp.error ? <p className="auth-error">{sp.error}</p> : null}
          {sp.sent ? (
            <p className="auth-notice">
              We sent a magic link to{" "}
              <strong>{sp.email ?? "your email"}</strong>. Open it on this
              device to finish signing in.
            </p>
          ) : null}

          <form action={signInWithPassword} className="auth-form">
            <input type="hidden" name="next" value={next} />
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
                autoComplete="current-password"
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="auth-submit">
              Sign in
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <form action={signInWithMagicLink} className="auth-form">
            <input type="hidden" name="next" value={next} />
            <label className="auth-field">
              <span>Email me a magic link</span>
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

          <div className="auth-divider"><span>or</span></div>

          <OAuthButtons next={next} />

          <p className="auth-footer">
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`}>
              Create a Member account
            </Link>
            .
          </p>
        </div>
      </main>
    </PageShell>
  );
}
