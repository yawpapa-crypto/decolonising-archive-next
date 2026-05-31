import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

export const metadata = { title: "Moderation | Admin" };

const STATUS_OPTIONS = ["open", "reviewing", "resolved", "dismissed"] as const;

type SearchParams = Promise<{ status?: string }>;

export default async function AdminModerationPage(props: { searchParams: SearchParams }) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const filterStatus = searchParams.status ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("community_reports")
    .select(
      "id, target_type, target_id, reason, status, created_at, reporter_id"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterStatus) query = query.eq("status", filterStatus);

  const { data: reports, error } = await query;

  function formatDate(d: string) {
    return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(d)
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header admin-header-card">
        <div className="admin-header-main">
          <p className="admin-kicker">Trust &amp; Safety</p>
          <h1>Moderation Queue</h1>
          <p className="admin-subtext">
            Community reports of posts and comments requiring review.
          </p>
        </div>
      </div>

      <form method="get" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label>
          <span style={{ fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Status</span>
          <select name="status" defaultValue={filterStatus}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-button admin-button-secondary" style={{ alignSelf: "flex-end" }}>
          Filter
        </button>
        <a href="/admin/moderation" className="admin-button admin-button-secondary" style={{ alignSelf: "flex-end" }}>
          Clear
        </a>
      </form>

      {error && <p className="admin-error">Error loading reports: {error.message}</p>}

      {!reports || reports.length === 0 ? (
        <p className="admin-subtext">No reports found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Target</th>
                <th>Target ID</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.created_at)}</td>
                  <td>
                    <span className="admin-header-chip">{r.target_type}</span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                    {r.target_id}
                  </td>
                  <td style={{ maxWidth: "24rem" }}>
                    {r.reason.length > 120 ? r.reason.slice(0, 117) + "…" : r.reason}
                  </td>
                  <td>
                    <span className="admin-header-chip">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
