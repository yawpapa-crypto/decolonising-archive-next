import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

export const metadata = { title: "Source Requests | Admin" };

const STATUS_OPTIONS = ["pending", "reviewing", "accepted", "declined"] as const;

type SearchParams = Promise<{ status?: string }>;

export default async function AdminSourceRequestsPage(props: { searchParams: SearchParams }) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const filterStatus = searchParams.status ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("source_requests")
    .select("id, title, source_url, institution, notes, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterStatus) query = query.eq("status", filterStatus);

  const { data: requests, error } = await query;

  function formatDate(d: string) {
    return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(d));
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header admin-header-card">
        <div className="admin-header-main">
          <p className="admin-kicker">Archive</p>
          <h1>Source Requests</h1>
          <p className="admin-subtext">Suggested sources and collections submitted by users.</p>
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
        <a href="/admin/source-requests" className="admin-button admin-button-secondary" style={{ alignSelf: "flex-end" }}>
          Clear
        </a>
      </form>

      {error && <p className="admin-error">Error loading requests: {error.message}</p>}

      {!requests || requests.length === 0 ? (
        <p className="admin-subtext">No source requests found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Institution</th>
                <th>URL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.created_at)}</td>
                  <td style={{ maxWidth: "20rem" }}>{r.title}</td>
                  <td>{r.institution ?? <span className="admin-subtext">—</span>}</td>
                  <td style={{ maxWidth: "14rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.source_url ? (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                        {r.source_url.replace(/^https?:\/\//, "").slice(0, 50)}
                      </a>
                    ) : (
                      <span className="admin-subtext">—</span>
                    )}
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
