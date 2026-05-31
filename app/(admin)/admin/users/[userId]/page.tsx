import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/lib/auth";
import { getAdminUserDetail } from "@/lib/admin-user-detail";

type Params = Promise<{ userId: string }>;
type RawRow = Record<string, unknown>;

function fmt(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function str(row: RawRow, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v : "";
}

function displayName(profile: RawRow | null): string {
  if (!profile) return "Unknown";
  return (
    (profile.display_name as string | null) ||
    (profile.full_name as string | null) ||
    (profile.email as string | null) ||
    "Member"
  );
}

function initials(profile: RawRow | null): string {
  const name = displayName(profile);
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MetaBadge({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 4);
    if (entries.length === 0) return null;
    return (
      <span className="admin-meta-badge">
        {entries.map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </span>
    );
  }
  return <span className="admin-meta-badge">{String(value)}</span>;
}

export default async function AdminUserDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { userId } = await params;

  if (!userId || userId.length < 8) notFound();

  const detail = await getAdminUserDetail(userId);

  if (!detail.profile && !detail.authLastSignIn) notFound();

  const profile = detail.profile;
  const name = displayName(profile);

  return (
    <div className="admin-dashboard">
      <div className="admin-breadcrumb">
        <Link href="/admin/users">← Users</Link>
        <span>/</span>
        <span>{name}</span>
      </div>

      {/* Header */}
      <header className="admin-user-detail-header">
        <div className="admin-user-detail-avatar" aria-hidden="true">
          {(profile?.avatar_url as string | null) ? (
            <img src={profile!.avatar_url as string} alt={name} width={56} height={56} />
          ) : (
            <span>{initials(profile)}</span>
          )}
        </div>
        <div>
          <h1>{name}</h1>
          {profile?.email ? <p className="admin-muted">{profile.email as string}</p> : null}
          <p className="admin-muted">
            <span className="admin-status-pill">{str(profile ?? {}, "role") || "member"}</span>
            &nbsp;·&nbsp;Joined {fmt(str(profile ?? {}, "created_at"))}
          </p>
        </div>
        <div className="admin-user-detail-actions">
          <Link href={`/admin/users`} className="admin-button admin-button-secondary">
            Back to users
          </Link>
          <Link
            href={`/admin/users?q=${encodeURIComponent((profile?.email as string) ?? userId)}`}
            className="admin-button admin-button-secondary"
          >
            Manage role
          </Link>
        </div>
      </header>

      {/* Account detail */}
      <section className="admin-surface">
        <div className="admin-panel-label">Account</div>
        <dl className="admin-detail-list">
          <dt>User ID</dt>
          <dd><code>{userId}</code></dd>
          <dt>Email</dt>
          <dd>{(profile?.email as string | null) || "—"}</dd>
          <dt>Role</dt>
          <dd>{str(profile ?? {}, "role") || "member"}</dd>
          <dt>Affiliation</dt>
          <dd>{str(profile ?? {}, "affiliation") || "—"}</dd>
          <dt>Last login</dt>
          <dd>{fmt(str(profile ?? {}, "last_login_at") || detail.authLastSignIn)}</dd>
          <dt>Last seen</dt>
          <dd>{fmt(str(profile ?? {}, "last_seen_at"))}</dd>
          <dt>Profile visibility</dt>
          <dd>{str(profile ?? {}, "profile_visibility") || "private"}</dd>
        </dl>
      </section>

      {/* Summary stats */}
      <section className="admin-overview-grid">
        <StatCard label="Searches" value={detail.stats.totalSearches} />
        <StatCard label="Sessions" value={detail.stats.totalSessions} />
        <StatCard label="Events" value={detail.stats.totalEvents} />
        <StatCard label="Errors" value={detail.stats.totalErrors} />
        <StatCard label="Saved records" value={detail.stats.savedRecords} />
        <StatCard label="Reading lists" value={detail.stats.readingLists} />
        <StatCard label="Community posts" value={detail.stats.communityPosts} />
        <StatCard label="Comments" value={detail.stats.communityComments} />
      </section>

      {/* Feature usage */}
      {detail.featureUsage.length > 0 ? (
        <section className="admin-surface">
          <div className="admin-panel-label">Feature usage</div>
          <h2 className="admin-section-title">Area breakdown</h2>
          <ul className="admin-list">
            {detail.featureUsage.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="admin-grid-two">
        {/* Recent activity */}
        <article className="admin-surface">
          <div className="admin-panel-label">Activity</div>
          <h2 className="admin-section-title">Recent events</h2>
          {detail.recentActivity.length === 0 ? (
            <p className="admin-muted">No events logged yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Area</th>
                    <th>Event</th>
                    <th>Path</th>
                    <th>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentActivity.map((event) => (
                    <tr key={str(event, "id")}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmt(str(event, "created_at"))}</td>
                      <td>{str(event, "area") || "platform"}</td>
                      <td>{str(event, "event_type")}</td>
                      <td>{str(event, "path") || "—"}</td>
                      <td><MetaBadge value={event.metadata} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {/* Recent searches */}
        <article className="admin-surface">
          <div className="admin-panel-label">Searches</div>
          <h2 className="admin-section-title">Search history</h2>
          {detail.recentSearches.length === 0 ? (
            <p className="admin-muted">No searches logged yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Results</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentSearches.map((search) => (
                    <tr key={str(search, "id")}>
                      <td>{str(search, "query")}</td>
                      <td>{(search.result_count as number | null) ?? 0}</td>
                      <td>{str(search, "status")}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmt(str(search, "created_at"))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="admin-grid-two">
        {/* Sessions */}
        <article className="admin-surface">
          <div className="admin-panel-label">Sessions</div>
          <h2 className="admin-section-title">Recent sessions</h2>
          {detail.recentSessions.length === 0 ? (
            <p className="admin-muted">No sessions logged yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Last seen</th>
                    <th>Duration</th>
                    <th>First path</th>
                    <th>Last path</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentSessions.map((session) => (
                    <tr key={str(session, "id")}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmt(str(session, "started_at"))}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmt(str(session, "last_seen_at"))}</td>
                      <td>
                        {Math.round(((session.duration_seconds as number | null) ?? 0) / 60)} min
                      </td>
                      <td>{str(session, "path_first") || "—"}</td>
                      <td>{str(session, "path_last") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {/* Errors */}
        <article className="admin-surface">
          <div className="admin-panel-label">Errors</div>
          <h2 className="admin-section-title">Error history</h2>
          {detail.recentErrors.length === 0 ? (
            <p className="admin-muted">No errors logged for this user.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Area</th>
                    <th>Message</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentErrors.map((error) => (
                    <tr key={str(error, "id")}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmt(str(error, "created_at"))}</td>
                      <td>{str(error, "area") || "—"}</td>
                      <td>{str(error, "message")}</td>
                      <td>{str(error, "code") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
