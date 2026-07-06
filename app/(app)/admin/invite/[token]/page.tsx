import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { acceptAdminInvite } from "./actions";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type Invite = {
  token: string;
  email: string | null;
  role: "admin" | "curator";
  label: string | null;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

function inviteIsExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

function invalidReason(invite: Invite | null) {
  if (!invite) return "This admin invite is invalid or has expired.";
  if (invite.revoked_at) return "This admin invite has been revoked.";
  if (invite.used_at) return "This admin invite has already been used.";
  if (inviteIsExpired(invite.expires_at)) {
    return "This admin invite is invalid or has expired.";
  }
  return "";
}

export default async function AdminInvitePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const sp = await searchParams;
  let invite: Invite | null = null;
  let loadError = "";

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    loadError = "Something went wrong. Please try again.";
  } else {
    const admin = createAdminClient();
    const result = await admin
      .from("admin_invites")
      .select("token, email, role, label, used_at, revoked_at, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (result.error) loadError = "This admin invite is invalid or has expired.";
    invite = (result.data ?? null) as Invite | null;
  }

  const reason = loadError || invalidReason(invite);

  return (
    <PageShell>
      <main className="auth-page admin-auth-page">
        <div className="auth-card admin-auth-card">
          <p className="auth-eyebrow">Admin invite</p>
          <h1 className="auth-title">
            {invite?.role === "curator" ? "Create curator account" : "Create admin account"}
          </h1>
          <p className="auth-sub">
            This invite creates a controlled Decolonising Archive access account.
            It cannot be used after expiry or after one successful signup.
          </p>

          {sp.error ? <p className="auth-error">{sp.error}</p> : null}
          {reason ? (
            <>
              <p className="auth-error">{reason}</p>
              <p className="auth-footer">
                <Link href="/admin/signin">Back to admin sign in</Link>
              </p>
            </>
          ) : (
            <form action={acceptAdminInvite} className="auth-form">
              <input type="hidden" name="token" value={token} />
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  defaultValue={invite?.email ?? ""}
                  readOnly={Boolean(invite?.email)}
                  required
                />
              </label>
              <label className="auth-field">
                <span>Full name</span>
                <input name="full_name" autoComplete="name" required />
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
              <button type="submit" className="auth-submit">
                Create account
              </button>
            </form>
          )}
        </div>
      </main>
    </PageShell>
  );
}
