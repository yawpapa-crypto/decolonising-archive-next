import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  formatWorkspaceDate,
  getMemberWorkspaceData,
} from "@/src/lib/member-workspace";

export default async function MySearchesPage() {
  const { savedSearches } = await getMemberWorkspaceData("/my/searches");

  return (
    <PageShell>
      <main className="workspace-page">
        <header className="workspace-header">
          <p className="workspace-eyebrow">Member workspace</p>
          <div className="workspace-titlebar">
            <h1>Saved searches</h1>
            <Link href="/workspace" className="workspace-link">
              Workspace
            </Link>
          </div>
        </header>

        <section className="workspace-elevated">
          <div className="workspace-list">
            {savedSearches.length ? (
              savedSearches.map((search) => (
                <div className="workspace-list-item horizontal" key={search.id}>
                  <strong>{search.label}</strong>
                  <Link
                    href={`/library?q=${encodeURIComponent(search.query)}`}
                    className="workspace-link"
                  >
                    {search.query}
                  </Link>
                  <span>{formatWorkspaceDate(search.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="workspace-empty">No saved searches yet.</p>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
