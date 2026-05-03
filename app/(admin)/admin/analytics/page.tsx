import AdminChartsShowcase from "@/src/components/admin/AdminChartsShowcase";

type TopSearch = {
  term: string;
  count: number;
  last_searched_at: string;
};

async function getTopSearches(): Promise<TopSearch[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/top-searches`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

export default async function AdminAnalyticsPage() {
  const results = await getTopSearches();

  return (
    <div className="admin-dashboard">
      <header className="admin-page-intro-card">
        <p className="admin-kicker">Analytics</p>
        <h1>Usage &amp; discovery</h1>
        <p className="admin-subtext">
          Top searches from the public site and chart templates for richer reporting.
        </p>
      </header>

      <AdminChartsShowcase />

      <section className="admin-analytics-table-section">
        <div className="admin-panel-label">Top searches</div>
        <h2 className="admin-section-title">Terms in the last window</h2>

        {results.length === 0 ? (
          <p className="admin-muted">No search data yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th scope="col">Term</th>
                  <th scope="col">Count</th>
                  <th scope="col">Last searched</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.term}>
                    <td>{item.term}</td>
                    <td>{item.count}</td>
                    <td>{new Date(item.last_searched_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
