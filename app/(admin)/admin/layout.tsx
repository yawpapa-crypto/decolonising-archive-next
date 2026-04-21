import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-inner">
          <div className="admin-brand">Decolonising Archive</div>

          <nav className="admin-nav">
            <a className="admin-nav-link" href="/admin">Dashboard</a>
            <a className="admin-nav-link" href="/admin/pages">Pages</a>
            <a className="admin-nav-link" href="/admin/records">Records</a>
            <a className="admin-nav-link" href="/admin/sources">Sources</a>
            <a className="admin-nav-link" href="/admin/collections">Collections</a>
            <a className="admin-nav-link" href="/admin/settings">Settings</a>
          </nav>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-inner">{children}</div>
      </main>
    </div>
  )
}
