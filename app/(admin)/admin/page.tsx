import Link from "next/link";
import AdminAppsHubSection from "./AdminAppsHubSection";
import AdminChartsShowcase from "@/src/components/admin/AdminChartsShowcase";
import AdminFileDropzone from "@/src/components/admin/AdminFileDropzone";

export default function AdminPage() {
  return (
    <div className="admin-dashboard">
      <div className="admin-header admin-header-card">
        <div className="admin-header-main">
          <p className="admin-kicker">Workspace</p>
          <h1>Overview</h1>
          <p className="admin-subtext">
            A calm control center for the Decolonising Archive. Manage pages, records, collections,
            and source pathways from one high-contrast, editorial layout.
          </p>
          <div className="admin-header-meta">
            <span className="admin-header-chip">Role: ADMIN</span>
            <span className="admin-header-chip">Live</span>
          </div>
        </div>

        <div className="admin-actions">
          <Link href="/" className="admin-button admin-button-secondary">
            View site
          </Link>
          <Link href="/admin/pages" className="admin-button">
            Edit pages
          </Link>
          <Link href="/admin/users" className="admin-button">
            Moderate users
          </Link>
        </div>
      </div>

      <section className="admin-overview-grid">
        <div className="admin-stat-card admin-stat-modern">
          <div className="admin-panel-label">Pages</div>
          <div className="admin-stat-row">
            <div className="admin-stat-number">6</div>
            <span className="admin-stat-chip">+2 updated</span>
          </div>
          <div className="admin-stat-text">Editable public-facing pages</div>
        </div>

        <div className="admin-stat-card admin-stat-modern">
          <div className="admin-panel-label">Records</div>
          <div className="admin-stat-row">
            <div className="admin-stat-number">Library</div>
            <span className="admin-stat-chip">Healthy</span>
          </div>
          <div className="admin-stat-text">Archive records and metadata management</div>
        </div>

        <div className="admin-stat-card admin-stat-modern">
          <div className="admin-panel-label">Sources</div>
          <div className="admin-stat-row">
            <div className="admin-stat-number">Pathways</div>
            <span className="admin-stat-chip">Synced</span>
          </div>
          <div className="admin-stat-text">External discovery and institutional links</div>
        </div>

        <div className="admin-stat-card admin-stat-modern">
          <div className="admin-panel-label">Users</div>
          <div className="admin-stat-row">
            <div className="admin-stat-number">Roles</div>
            <span className="admin-stat-chip">Live auth</span>
          </div>
          <div className="admin-stat-text">Signup tracking and access moderation</div>
        </div>

        <div className="admin-stat-card admin-stat-modern">
          <div className="admin-panel-label">Collections</div>
          <div className="admin-stat-row">
            <div className="admin-stat-number">Knowledge Areas</div>
            <span className="admin-stat-chip">Curated</span>
          </div>
          <div className="admin-stat-text">Editorial grouping and discovery structure</div>
        </div>
      </section>

      <AdminChartsShowcase />

      <AdminAppsHubSection />

      <section className="admin-upload-section">
        <div className="admin-panel-label">File uploads</div>
        <h2 className="admin-section-title">Drag &amp; drop</h2>
        <p className="admin-muted">
          Drop assets here for a quick local preview. Wire this to Supabase Storage or your CDN when
          you are ready for production uploads.
        </p>
        <AdminFileDropzone accept="image/*,.pdf,.doc,.docx" />
      </section>

      <section className="admin-toolbar admin-toolbar-modern" aria-label="Dashboard utilities">
        <button className="admin-button admin-button-secondary" type="button">
          Export snapshot
        </button>
        <button className="admin-button" type="button">
          Create entry
        </button>
      </section>

      <section className="admin-dashboard-main">
        <article className="admin-surface">
          <div className="admin-panel-label">Overview</div>
          <h2 className="admin-section-title">Editorial performance</h2>
          <p className="admin-muted">
            Publication throughput and source curation remain stable this week. Focus next on
            pages with pending legal copy and records missing citation metadata.
          </p>
        </article>
        <article className="admin-surface">
          <div className="admin-panel-label">Activity queue</div>
          <ul className="admin-list">
            <li>3 record edits waiting review</li>
            <li>2 collection updates awaiting publish</li>
            <li>1 user role escalation pending admin approval</li>
          </ul>
        </article>
      </section>

      <section className="admin-grid">
        <Link href="/admin/pages" className="admin-panel">
          <div className="admin-panel-label">Pages</div>
          <h2>Front-end pages</h2>
          <p>Edit homepage, about text, footer content, and legal pages.</p>
        </Link>

        <Link href="/admin/records" className="admin-panel">
          <div className="admin-panel-label">Records</div>
          <h2>Archive records</h2>
          <p>Manage titles, summaries, metadata, links, and publishing structure.</p>
        </Link>

        <Link href="/admin/sources" className="admin-panel">
          <div className="admin-panel-label">Sources</div>
          <h2>Source pathways</h2>
          <p>Update external source listings, discovery links, and pathway descriptions.</p>
        </Link>

        <Link href="/admin/collections" className="admin-panel">
          <div className="admin-panel-label">Collections</div>
          <h2>Collections and knowledge areas</h2>
          <p>Maintain editorial groupings, featured areas, and discovery structure.</p>
        </Link>

        <Link href="/admin/users" className="admin-panel">
          <div className="admin-panel-label">Users</div>
          <h2>Signup moderation</h2>
          <p>Review members, track workspace use, update roles, and block sign-in.</p>
        </Link>
      </section>

      <section className="admin-lower-grid admin-lower-grid-modern">
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

      <section className="admin-surface admin-summary-surface">
        <div className="admin-panel-label">Dashboard summary</div>
        <p className="admin-muted">
          Editorial and operational controls are now centralized into a card-based workflow:
          metrics at the top, tool modules in the center, and operational context at the bottom.
        </p>
      </section>
    </div>
  );
}
