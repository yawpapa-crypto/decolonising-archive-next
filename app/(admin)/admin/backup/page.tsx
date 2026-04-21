export default function AdminPage() {
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <p className="admin-kicker">Editorial Studio</p>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtext">
            Manage the archive’s pages, records, collections, and source pathways from one place.
          </p>
        </div>

        <div className="admin-actions">
          <a href="/" className="admin-button admin-button-secondary">
            View site
          </a>
          <a href="/admin/pages" className="admin-button">
            Edit pages
          </a>
        </div>
      </div>

      <section className="admin-overview-grid">
        <div className="admin-stat-card">
          <div className="admin-panel-label">Pages</div>
          <div className="admin-stat-number">6</div>
          <div className="admin-stat-text">Editable public-facing pages</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-panel-label">Records</div>
          <div className="admin-stat-number">Library</div>
          <div className="admin-stat-text">Archive records and metadata management</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-panel-label">Sources</div>
          <div className="admin-stat-number">Pathways</div>
          <div className="admin-stat-text">External discovery and institutional links</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-panel-label">Collections</div>
          <div className="admin-stat-number">Themes</div>
          <div className="admin-stat-text">Editorial grouping and discovery structure</div>
        </div>
      </section>

      <section className="admin-grid">
        <a href="/admin/pages" className="admin-panel">
          <div className="admin-panel-label">Pages</div>
          <h2>Front-end pages</h2>
          <p>Edit homepage, about text, footer content, and legal pages.</p>
        </a>

        <a href="/admin/records" className="admin-panel">
          <div className="admin-panel-label">Records</div>
          <h2>Archive records</h2>
          <p>Manage titles, summaries, metadata, links, and publishing structure.</p>
        </a>

        <a href="/admin/sources" className="admin-panel">
          <div className="admin-panel-label">Sources</div>
          <h2>Source pathways</h2>
          <p>Update external source listings, discovery links, and pathway descriptions.</p>
        </a>

        <a href="/admin/collections" className="admin-panel">
          <div className="admin-panel-label">Collections</div>
          <h2>Collections and themes</h2>
          <p>Maintain editorial groupings, featured areas, and discovery structure.</p>
        </a>
      </section>

      <section className="admin-lower-grid">
        <div className="admin-surface">
          <div className="admin-panel-label">Recent activity</div>
          <ul className="admin-list">
            <li>Homepage hero content ready for editing</li>
            <li>Admin shell and page editor now active</li>
            <li>Records, sources, and collections screens ready for buildout</li>
          </ul>
        </div>

        <div className="admin-surface">
          <div className="admin-panel-label">Next priorities</div>
          <ul className="admin-list">
            <li>Live preview updates in Pages editor</li>
            <li>Save and load content from a local data store</li>
            <li>Structured editors for Records, Sources, and Collections</li>
          </ul>
        </div>
      </section>
    </div>
  );
}