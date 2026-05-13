"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  CircleHelp,
  LayoutDashboard,
  ListChecks,
  Menu,
  Search,
  Send,
  Settings,
  User,
  X,
} from "lucide-react";

const ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "saved-searches", label: "Saved Searches", icon: Search },
  { id: "reading-lists", label: "Reading Lists", icon: ListChecks },
  { id: "submissions", label: "Submissions", icon: Send },
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "help", label: "Help Centre", icon: CircleHelp },
  { id: "settings", label: "Settings", icon: Settings },
];

type WorkspaceMobileNavProps = {
  currentSection: string;
  accountName: string;
  accountAvatarUrl?: string | null;
  roleLabel: string;
};

export default function WorkspaceMobileNav({
  currentSection,
  accountName,
  accountAvatarUrl = null,
  roleLabel,
}: WorkspaceMobileNavProps) {
  const [open, setOpen] = useState(false);
  const current = ITEMS.find((item) => item.id === currentSection) ?? ITEMS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.body.classList.add("workspace-drawer-open");
    return () => {
      document.removeEventListener("keydown", close);
      document.body.classList.remove("workspace-drawer-open");
    };
  }, [open]);

  return (
    <>
      <div className="workspace-mobile-bar">
        <button
          type="button"
          className="workspace-mobile-menu-btn"
          aria-label="Open workspace navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={18} />
        </button>
        <div>
          <span>Workspace</span>
          <strong>{current.label}</strong>
        </div>
        <span className="workspace-mobile-avatar">
          {accountAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={accountAvatarUrl} alt="" className="workspace-mobile-avatar-img" />
          ) : (
            accountName.charAt(0).toUpperCase()
          )}
        </span>
      </div>

      {open ? (
        <div className="workspace-drawer-layer" aria-label="Workspace navigation drawer">
          <button
            type="button"
            className="workspace-drawer-scrim"
            aria-label="Close workspace navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="workspace-drawer" aria-label="Workspace navigation">
            <div className="workspace-drawer-head">
              <div>
                <strong>{accountName}</strong>
                <span>{roleLabel}</span>
              </div>
              <button
                type="button"
                className="workspace-mobile-menu-btn"
                aria-label="Close workspace navigation"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <nav className="workspace-drawer-nav">
              <Link
                href="/my/workbench"
                className="workspace-sidebar-item"
                onClick={() => setOpen(false)}
              >
                <span>Archive Workbench</span>
              </Link>
              {ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={`/workspace?section=${item.id}`}
                  className={`workspace-sidebar-item ${currentSection === item.id ? "is-active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <form action="/auth/signout" method="post" className="workspace-drawer-signout">
              <button type="submit" className="workspace-link">
                Sign out
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
