import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

export const metadata = { title: "Feedback Reports | Admin" };

const STATUS_OPTIONS = ["new", "reviewing", "resolved", "dismissed"] as const;
const TYPE_OPTIONS = ["bug", "suggestion", "content", "accessibility", "other"] as const;

type SearchParams = Promise<{ type?: string; status?: string }>;

export default async function AdminFeedbackPage(props: { searchParams: SearchParams }) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const filterType = searchParams.type ?? "";
  const filterStatus = searchParams.status ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("feedback_reports")
    .select("id, type, status, priority, message, page_url, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterType) query = query.eq("type", filterType);
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
          <p className="admin-kicker">Moderation</p>
          <h1>Feedback Reports</h1>
          <p className="admin-subtext">Bug reports, suggestions, and content flags from users.</p>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="admin-filter-bar" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label>
          <span style={{ fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Type</span>
          <select name="type" defaultValue={filterType}>
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
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
        <a href="/admin/feedback" className="admin-button admin-button-secondary" style={{ alignSelf: "flex-end" }}>
          Clear
        </a>
      </form>

      {error && <p className="admin-error">Error loading reports: {error.message}</p>}

      {!reports || reports.length === 0 ? (
        <p className="admin-subtext">No feedback reports found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Message</th>
                <th>Page</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.created_at)}</td>
                  <td>
                    <span className="admin-header-chip">{r.type}</span>
                  </td>
                  <td>
                    <span className="admin-header-chip">{r.status}</span>
                  </td>
                  <td>{r.priority}</td>
                  <td style={{ maxWidth: "30rem" }}>
                    <span title={r.message}>
                      {r.message.length > 160 ? r.message.slice(0, 157) + "…" : r.message}
                    </span>
                  </td>
                  <td style={{ maxWidth: "14rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.page_url ? (
                      <a href={r.page_url} target="_blank" rel="noopener noreferrer" title={r.page_url}>
                        {r.page_url.replace(/^https?:\/\/[^/]+/, "")}
                      </a>
                    ) : (
                      <span className="admin-subtext">—</span>
                    )}
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
