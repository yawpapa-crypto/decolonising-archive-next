"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import "@/app/styles/admin-moderation-premium.css";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/analytics", label: "Analytics" },
];

function navActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminAppShellProps = {
  children: ReactNode;
  userName: string;
};

export default function AdminAppShell({ children, userName }: AdminAppShellProps) {
  const pathname = usePathname() || "";
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div
      className={`dashboard-shell dashboard-shell--admin ${mobileNav ? "dashboard-shell-nav-open" : ""}`}
    >
      <div
        className="admin-mobile-scrim"
        aria-hidden={!mobileNav}
        onClick={() => setMobileNav(false)}
      />

      <aside className="admin-sidebar dashboard-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-inner">
          <div className="admin-brand">ARED</div>
          <p className="admin-sidebar-kicker">Decolonising Archive</p>

          <nav className="admin-nav">
            {filteredNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link ${navActive(pathname, item.href) ? "is-active" : ""}`}
                onClick={() => setMobileNav(false)}
              >
                {item.label}
              </Link>
            ))}
            {filteredNav.length === 0 ? (
              <p className="admin-nav-empty">No sections match your search.</p>
            ) : null}
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-user">
              <div className="admin-sidebar-avatar" aria-hidden>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="admin-sidebar-user-text">
                <span className="admin-sidebar-user-name">{userName}</span>
                <span className="admin-sidebar-user-role">Admin</span>
              </div>
            </div>
            <Link className="admin-nav-link" href="/workspace" onClick={() => setMobileNav(false)}>
              Member workspace
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="admin-nav-link admin-nav-signout">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="admin-main-wrap">
        <header className="admin-top-bar">
          <button
            type="button"
            className="admin-top-menu"
            aria-label="Open navigation menu"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>

          <label className="admin-global-search">
            <Search size={18} strokeWidth={1.65} className="admin-global-search-icon" aria-hidden />
            <input
              type="search"
              name="admin-global-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin sections, pages, records…"
              autoComplete="off"
              className="admin-global-search-input"
            />
            {search ? (
              <button
                type="button"
                className="admin-global-search-clear"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            ) : null}
          </label>

          <button
            type="button"
            className="admin-top-menu admin-top-menu-close"
            aria-label="Close navigation menu"
            onClick={() => setMobileNav(false)}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>

        <main className="admin-main">
          <div className="admin-main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
