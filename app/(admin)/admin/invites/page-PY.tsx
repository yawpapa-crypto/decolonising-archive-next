import { createClient } from "@/src/lib/supabase/server";
import { createAdminInvite } from "./actions";
import AdminInviteCard from "./AdminInviteCard";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";

type SearchParams = Promise<{
  error?: string;
  updated?: string;
}>;

type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  role: "admin" | "curator";
  label: string | null;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  resent_at: string | null;
  created_at: string;
};

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const raw = configured || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function inviteStatus(invite: InviteRow) {
  if (invite.revoked_at) return "Revoked";
  if (invite.used_at) return "Accepted";
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return "Expired";
  }
  return "Active";
}

function statusClass(status: string) {
  return status.toLowerCase();
}

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("id, token, email, role, label, used_at, revoked_at, expires_at, resent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const invites = (data ?? []) as InviteRow[];
  const baseUrl = siteUrl();

  return (
    <div className="admin-dashboard">
      <header className="admin-header admin-header-card">
        <div className="admin-header-main">
          <p className="admin-kicker">Admin access</p>
          <h1>Invites</h1>
          <p className="admin-subtext">
            Create controlled admin or curator account links. Invites are token-gated
            and cannot be listed publicly.
          </p>
        </div>
      </header>

      {sp.error ? <p className="auth-error">{sp.error}</p> : null}
      {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}
      {error ? <p className="auth-error">{error.message}</p> : null}

      <section className="admin-surface">
        <div className="admin-panel-label">Create invite</div>
        <form action={createAdminInvite} className="admin-form-panel">
          <div className="admin-split-fields">
            <label className="admin-field">
              <span>Email lock optional</span>
              <input type="email" name="email" placeholder="admin@example.com" />
            </label>
            <label className="admin-field">
              <span>Role</span>
              <select name="role" defaultValue="admin">
                <option value="admin">Admin</option>
                <option value="curator">Curator</option>
              </select>
            </label>
          </div>
          <div className="admin-split-fields">
            <label className="admin-field">
              <span>Label</span>
              <input name="label" placeholder="Archivist onboarding" />
            </label>
            <label className="admin-field">
              <span>Expires at</span>
              <input type="date" name="expires_at" />
            </label>
          </div>
          <PendingSubmitButton className="admin-button" pendingLabel="Creating…">
            Create invite
          </PendingSubmitButton>
        </form>
      </section>

      <section className="admin-surface">
        <div className="admin-panel-label">Recent invites</div>
        {invites.length ? (
          <div className="admin-invite-list">
            {invites.map((invite) => {
              const link = `${baseUrl}/admin/invite/${invite.token}`;
              const isAccepted = Boolean(invite.used_at);
              const isRevoked = Boolean(invite.revoked_at);
              const canEdit = !isAccepted && !isRevoked;
              const status = inviteStatus(invite);
              const expiresValue = invite.expires_at
                ? new Date(invite.expires_at).toISOString().slice(0, 10)
                : "";

              return (
                <AdminInviteCard
                  key={invite.id}
                  invite={invite}
                  link={link}
                  status={status}
                  statusClassName={statusClass(status)}
                  expiresLabel={formatDate(invite.expires_at)}
                  resentLabel={invite.resent_at ? formatDate(invite.resent_at) : null}
                  expiresValue={expiresValue}
                  canEdit={canEdit}
                />
              );
            })}
          </div>
        ) : (
          <p className="admin-muted admin-invite-empty">No invites yet.</p>
        )}
      </section>
    </div>
  );
}
