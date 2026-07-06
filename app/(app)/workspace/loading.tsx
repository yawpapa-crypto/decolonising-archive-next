import PageShell from "@/src/components/layout/PageShell";

export default function WorkspaceLoading() {
  return (
    <PageShell>
      <main className="dashboard-shell dashboard-shell--member workspace-app-shell member-dashboard">
        <aside className="workspace-app-sidebar workspace-loading-sidebar">
          <div className="skeleton-line skeleton-brand" />
          <div className="skeleton-nav-stack">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="skeleton-nav-item" key={index} />
            ))}
          </div>
          <div className="skeleton-account-block" />
        </aside>

        <section className="workspace-app-main dashboard-main">
          <header className="admin-header admin-header-card member-workspace-page-header">
            <div className="admin-header-main">
              <div className="skeleton-line skeleton-eyebrow" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-copy" />
            </div>
          </header>

          <div className="workspace-app-content">
            <div className="admin-dashboard member-workspace-canvas">
              <section className="admin-overview-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="admin-stat-card admin-stat-modern" key={index}>
                    <div className="skeleton-line skeleton-small" />
                    <div className="skeleton-line skeleton-number" />
                    <div className="skeleton-line skeleton-small" />
                  </div>
                ))}
              </section>

              <section className="workspace-tool-grid">
                {Array.from({ length: 3 }).map((_, index) => (
                  <article className="tool-panel workspace-panel admin-surface" key={index}>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-copy" />
                    <div className="skeleton-input" />
                    <div className="skeleton-button skeleton-wide-button" />
                  </article>
                ))}
              </section>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
