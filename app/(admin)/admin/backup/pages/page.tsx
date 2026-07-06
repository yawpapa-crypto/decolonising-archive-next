export default function AdminPagesPage() {
  return (
    <div className="admin-editor">
      <div className="admin-header">
        <div>
          <p className="admin-kicker">Pages</p>
          <h1>Edit front-end pages</h1>
          <p className="admin-subtext">
            Update key text, page sections, and editorial content for the public-facing site.
          </p>
        </div>

        <div className="admin-actions">
          <a href="/admin" className="admin-button admin-button-secondary">
            Back to dashboard
          </a>
          <button className="admin-button" type="button">
            Save changes
          </button>
        </div>
      </div>

      <div className="admin-editor-grid">
        <section className="admin-form-panel">
          <div className="admin-form-section">
            <div className="admin-panel-label">Page target</div>
            <label className="admin-field">
              <span>Page</span>
              <select defaultValue="home">
                <option value="home">Homepage</option>
                <option value="about">About</option>
                <option value="privacy">Privacy Policy</option>
                <option value="terms">Terms of Use</option>
                <option value="copyright">Copyright &amp; Permissions</option>
                <option value="takedown">Takedown / Rights Contact</option>
              </select>
            </label>
          </div>

          <div className="admin-form-section">
            <div className="admin-panel-label">Hero content</div>

            <label className="admin-field">
              <span>Eyebrow</span>
              <input type="text" defaultValue="Decolonising Archive" />
            </label>

            <label className="admin-field">
              <span>Main heading</span>
              <input type="text" defaultValue="The archive of decolonising knowledge" />
            </label>

            <label className="admin-field">
              <span>Intro text</span>
              <textarea
                rows={6}
                defaultValue="Books, oral histories, artefacts, images, textiles, posters, manuscripts, architectural documentation, and cultural records across Africa, the diaspora, and the Global South."
              />
            </label>
          </div>

          <div className="admin-form-section">
            <div className="admin-panel-label">Section settings</div>

            <label className="admin-field">
              <span>Featured section title</span>
              <input type="text" defaultValue="Featured Records" />
            </label>

            <label className="admin-field">
              <span>Collections section title</span>
              <input type="text" defaultValue="Collections" />
            </label>

            <label className="admin-field">
              <span>Theme section title</span>
              <input type="text" defaultValue="Browse by Theme" />
            </label>
          </div>
        </section>

        <aside className="admin-preview-panel">
          <div className="admin-panel-label">Preview</div>
          <div className="admin-preview-card">
            <p className="admin-preview-eyebrow">Decolonising Archive</p>
            <h2>The archive of decolonising knowledge</h2>
            <p>
              Books, oral histories, artefacts, images, textiles, posters, manuscripts,
              architectural documentation, and cultural records across Africa, the diaspora,
              and the Global South.
            </p>
            <div className="admin-preview-meta">
              <span>Featured Records</span>
              <span>Collections</span>
              <span>Browse by Theme</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
