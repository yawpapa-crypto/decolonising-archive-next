type TopSearch = {
  term: string
  count: number
  last_searched_at: string
}

async function getTopSearches(): Promise<TopSearch[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"

  try {
    const res = await fetch(`${baseUrl}/api/top-searches`, {
      cache: "no-store",
    })

    if (!res.ok) return []

    const data = await res.json()
    return Array.isArray(data.results) ? data.results : []
  } catch {
    return []
  }
}

export default async function AdminAnalyticsPage() {
  const results = await getTopSearches()

  return (
    <main style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "24px" }}>Analytics</h1>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>Top Searches</h2>

        {results.length === 0 ? (
          <p>No search data yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "15px",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    Term
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    Count
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    Last searched
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.term}>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {item.term}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {item.count}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {new Date(item.last_searched_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
