import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  formatWorkspaceDate,
  getMemberWorkspaceData,
} from "@/src/lib/member-workspace";
import {
  deleteSavedSearch,
  updateSavedSearch,
} from "@/app/(app)/workspace/actions";
import ConfirmSubmitButton from "@/app/(app)/workspace/ConfirmSubmitButton";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";

export default async function MySearchesPage() {
  const { savedSearches } = await getMemberWorkspaceData("/my/searches");

  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--member">
        <main className="workspace-page dashboard-canvas admin-dashboard">
          <header className="workspace-header admin-header admin-header-card member-my-page-header">
            <div className="admin-header-main">
              <p className="admin-kicker">Member workspace</p>
              <h1>Saved searches</h1>
              <p className="admin-subtext">
                Named queries you can run again from the archive home search.
              </p>
            </div>
            <div className="admin-actions">
              <Link href="/workspace" className="admin-button admin-button-secondary">
                Back to workspace
              </Link>
            </div>
          </header>

        <section className="workspace-elevated admin-surface">
          <div className="workspace-list">
            {savedSearches.length ? (
              savedSearches.map((search) => (
                <div className="workspace-list-item horizontal" key={search.id}>
                  <div>
                    <strong>{search.label}</strong>
                    <span>{formatWorkspaceDate(search.created_at)}</span>
                  </div>
                  <form action={updateSavedSearch} className="workspace-inline-form">
                    <input type="hidden" name="id" value={search.id} />
                    <input type="hidden" name="redirectTo" value="/my/searches" />
                    <input name="label" defaultValue={search.label} placeholder="Label" />
                    <input
                      name="query"
                      defaultValue={search.query}
                      placeholder="Search query"
                      required
                    />
                    <PendingSubmitButton className="workspace-link" pendingLabel="Saving…">
                      Save
                    </PendingSubmitButton>
                  </form>
                  <div className="workspace-actions-inline">
                    <Link
                      href={`/library?q=${encodeURIComponent(search.query)}`}
                      className="workspace-link"
                    >
                      Run search
                    </Link>
                    <form action={deleteSavedSearch}>
                      <input type="hidden" name="id" value={search.id} />
                      <input type="hidden" name="redirectTo" value="/my/searches" />
                      <ConfirmSubmitButton
                        className="workspace-link"
                        message="Delete this saved search?"
                        pendingLabel="Deleting…"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="workspace-empty">No saved searches yet.</p>
            )}
          </div>
        </section>
        </main>
      </div>
    </PageShell>
  );
}
