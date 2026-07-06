import PageShell from "@/src/components/layout/PageShell";

export default function MyListsLoading() {
  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--member">
        <main className="workspace-page dashboard-canvas">
          <header className="workspace-header dashboard-header">
            <div className="skeleton-line skeleton-eyebrow" />
            <div className="workspace-titlebar">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-link" />
            </div>
          </header>

          <section className="workspace-export-panel">
            <div className="reading-list-export-all">
              <div>
                <div className="skeleton-line skeleton-eyebrow" />
                <div className="skeleton-line skeleton-heading" />
                <div className="skeleton-line skeleton-copy" />
              </div>
              <div className="skeleton-actions">
                <div className="skeleton-button" />
                <div className="skeleton-button" />
                <div className="skeleton-button" />
              </div>
            </div>
          </section>

          <section className="reading-list-toolbar">
            <div>
              <div className="skeleton-line skeleton-eyebrow" />
              <div className="skeleton-line skeleton-heading" />
            </div>
            <div className="reading-list-toolbar-controls">
              <div className="skeleton-input" />
              <div className="skeleton-input skeleton-select" />
            </div>
          </section>

          <section className="workspace-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <article className="workspace-tile" key={index}>
                <div className="workspace-tile-head">
                  <div>
                    <div className="skeleton-line skeleton-card-title" />
                    <div className="skeleton-line skeleton-small" />
                  </div>
                  <div className="skeleton-line skeleton-link" />
                </div>

                <div className="skeleton-form-stack">
                  <div className="skeleton-input" />
                  <div className="skeleton-input" />
                  <div className="skeleton-button skeleton-wide-button" />
                </div>

                <div className="skeleton-line skeleton-copy" />
                <div className="skeleton-line skeleton-copy short" />
              </article>
            ))}
          </section>
        </main>
      </div>
    </PageShell>
  );
}
