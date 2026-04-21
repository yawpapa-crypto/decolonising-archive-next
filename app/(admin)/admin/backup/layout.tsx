export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-inner">
          <div className="admin-brand">Decolonising Archive</div>

          <nav className="admin-nav">
            <a href="/admin" className="admin-nav-link">Dashboard</a>
            <a href="/admin/pages" className="admin-nav-link">Pages</a>
            <a href="/admin/records" className="admin-nav-link">Records</a>
            <a href="/admin/sources" className="admin-nav-link">Sources</a>
            <a href="/admin/collections" className="admin-nav-link">Collections</a>
          </nav>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
