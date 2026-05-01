// Admin shell.
// Gated by requireAdmin() — non-admin signed-in users are bounced to
// /workspace?denied=admin (which shows a notice); anonymous users are
// bounced to /signin?next=/admin.

import type { ReactNode } from 'react'
import { requireAdmin } from '@/src/lib/auth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin()

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
            <a className="admin-nav-link" href="/admin/users">Users</a>
            <a className="admin-nav-link" href="/admin/settings">Settings</a>
            <a className="admin-nav-link" href="/admin/analytics">Analytics</a>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-user">
              <span className="role-badge role-admin">Admin</span>
              <span className="admin-sidebar-email">
                {profile.email ?? profile.full_name ?? 'Signed in'}
              </span>
            </div>
            <a className="admin-nav-link" href="/workspace">Member workspace</a>
            <form action="/auth/signout" method="post">
              <button type="submit" className="admin-nav-link admin-nav-signout">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-inner">{children}</div>
      </main>
    </div>
  )
}
