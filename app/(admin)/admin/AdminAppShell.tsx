"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import "@/app/styles/admin-moderation-premium.css";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/community", label: "Community" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "Settings" },
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
  unreadNotifications?: number;
};

export default function AdminAppShell({ children, userName, unreadNotifications = 0 }: AdminAppShellProps) {
  const pathname = usePathname() || "";
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [unreadCount, setUnreadCount] = useState(unreadNotifications);
  const supabaseRef = useRef(createClient());

  // Realtime subscription: update bell count when new admin_notifications arrive
  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;

      channel = supabase
        .channel(`admin-notif-bell:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_notifications",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            setUnreadCount((prev) => prev + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "admin_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            // If a notification is marked read/archived, decrement if it was unread
            const updated = payload.new as { status?: string };
            const previous = payload.old as { status?: string };
            if (previous.status === "unread" && updated.status !== "unread") {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          },
        )
        .subscribe();
    }).catch(() => undefined);

    return () => {
      if (channel) void supabaseRef.current.removeChannel(channel);
    };
  }, []);

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

          <a
            href="/admin/notifications"
            className="admin-top-bell"
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          >
            <Bell size={20} strokeWidth={1.75} aria-hidden />
            {unreadCount > 0 ? (
              <span className="admin-top-bell__count" aria-hidden>{unreadCount}</span>
            ) : null}
          </a>

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
