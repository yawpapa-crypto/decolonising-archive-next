"use client";

// Client navbar — same look as before, plus the new auth slot:
//   - Logged out: "Sign in" link
//   - Logged in: avatar with dropdown (Workspace / Curator tools / Admin / Sign out)
//
// The mobile menu mirrors the same options inline.
//
// Public archive top nav uses plain <a> plus hardNavigateToArchive() so
// dashboard/member sessions always perform a full document load. Legacy
// app.js archive routing only handles clicks inside #app (see app.js).

import Link from "next/link";
import {
  refreshBodyScrollLockPadding,
  setBodyScrollLock,
} from "@/lib/body-scroll-lock";
import { Bell, Bookmark, Layers, ListChecks } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { MemberNavSummary } from "@/src/lib/member-nav";

/** Next.js client areas: force full document load into the legacy archive shell. */
function isNonArchiveShellPath(pathname: string) {
  return (
    pathname.startsWith("/my") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/curator") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/community")
  );
}

function hardNavigateToArchive(
  event: ReactMouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (typeof window === "undefined") return;
  if (isNonArchiveShellPath(window.location.pathname)) {
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(href);
  }
}

export type NavProfile = {
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "member" | "curator" | "admin";
};

const ROLE_RANK = { member: 1, curator: 2, admin: 3 } as const;

function displayName(profile: NavProfile): string {
  return (
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email ||
    "Account"
  );
}

function initials(profile: NavProfile): string {
  const source = displayName(profile) || "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : (parts[0]?.slice(0, 2) ?? "?");
  return letters.toUpperCase();
}

function bookmarksAriaLabel(count: number) {
  return count > 0
    ? `Open bookmarks, ${count} saved records`
    : "Open bookmarks";
}

function readingListsAriaLabel(count: number) {
  return count > 0
    ? `Open reading lists, ${count} ${count === 1 ? "list" : "lists"}`
    : "Open reading lists";
}

function notificationsAriaLabel(count: number) {
  return count > 0
    ? `Open notifications, ${count} new`
    : "Open notifications";
}

export default function NavbarClient({
  profile,
  navSummary = null,
}: {
  profile: NavProfile | null;
  navSummary?: MemberNavSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeMenu = () => {
      setOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener("popstate", closeMenu);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("popstate", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    setBodyScrollLock("menu", open);
    if (!open) return;
    const onResize = () => refreshBodyScrollLockPadding();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      setBodyScrollLock("menu", false);
    };
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleNavClick = () => {
    setOpen(false);
    setMenuOpen(false);
  };

  const isCuratorOrAbove =
    !!profile && ROLE_RANK[profile.role] >= ROLE_RANK.curator;
  const isAdmin = !!profile && profile.role === "admin";

  const [liveMemberCounts, setLiveMemberCounts] = useState(
    navSummary ?? {
      bookmarksCount: 0,
      readingListsCount: 0,
      notificationsCount: 0,
    },
  );

  useEffect(() => {
    setLiveMemberCounts(
      navSummary ?? {
        bookmarksCount: 0,
        readingListsCount: 0,
        notificationsCount: 0,
      },
    );
  }, [navSummary]);

  useEffect(() => {
    function onMemberNavUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        bookmarksDelta?: number;
        readingListsDelta?: number;
        notificationsDelta?: number;
      }>;

      setLiveMemberCounts((current) => ({
        bookmarksCount: Math.max(
          0,
          current.bookmarksCount + (customEvent.detail?.bookmarksDelta ?? 0),
        ),
        readingListsCount: Math.max(
          0,
          current.readingListsCount + (customEvent.detail?.readingListsDelta ?? 0),
        ),
        notificationsCount: Math.max(
          0,
          current.notificationsCount + (customEvent.detail?.notificationsDelta ?? 0),
        ),
      }));
    }

    window.addEventListener("member-nav:update", onMemberNavUpdate);
    return () => window.removeEventListener("member-nav:update", onMemberNavUpdate);
  }, []);

  const memberCounts = liveMemberCounts;

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a
          href="/home"
          className="nav-logo"
          onClick={(e) => {
            hardNavigateToArchive(e, "/home");
            handleNavClick();
          }}
        >
          DECOLONISING ARCHIVE
        </a>

        <div className="nav-links">
          <a
            href="/home"
            className="nav-link"
            onClick={(e) => hardNavigateToArchive(e, "/home")}
          >
            Home
          </a>
          <a
            href="/library"
            className="nav-link"
            onClick={(e) => hardNavigateToArchive(e, "/library")}
          >
            Library
          </a>
          <a
            href="/sources"
            className="nav-link"
            onClick={(e) => hardNavigateToArchive(e, "/sources")}
          >
            Sources
          </a>
          <a
            href="/about"
            className="nav-link"
            onClick={(e) => hardNavigateToArchive(e, "/about")}
          >
            About
          </a>
        </div>

        {profile ? (
          <div className="nav-end">
            <div
              className="member-quick-nav"
              aria-label="Member quick links"
            >
              <Link
                href="/my/bookmarks"
                className="member-quick-nav-link"
                aria-label={bookmarksAriaLabel(memberCounts.bookmarksCount)}
                title="Bookmarks"
                onClick={handleNavClick}
              >
                <Bookmark
                  className="member-quick-nav-icon"
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="sr-only">Bookmarks</span>
                {memberCounts.bookmarksCount > 0 ? (
                  <span className="member-quick-nav-badge">
                    {memberCounts.bookmarksCount > 99
                      ? "99+"
                      : memberCounts.bookmarksCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/my/lists"
                className="member-quick-nav-link"
                aria-label={readingListsAriaLabel(memberCounts.readingListsCount)}
                title="Reading lists"
                onClick={handleNavClick}
              >
                <ListChecks
                  className="member-quick-nav-icon"
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="sr-only">Reading lists</span>
                {memberCounts.readingListsCount > 0 ? (
                  <span className="member-quick-nav-badge">
                    {memberCounts.readingListsCount > 99
                      ? "99+"
                      : memberCounts.readingListsCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/my/workbench"
                className="member-quick-nav-link"
                aria-label="Archive Workbench"
                title="Archive Workbench"
                onClick={handleNavClick}
              >
                <Layers
                  className="member-quick-nav-icon"
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="sr-only">Archive Workbench</span>
              </Link>
              <Link
                href="/workspace?section=notifications"
                className="member-quick-nav-link"
                aria-label={notificationsAriaLabel(memberCounts.notificationsCount)}
                title="Notifications"
                onClick={handleNavClick}
              >
                <Bell
                  className="member-quick-nav-icon"
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="sr-only">Notifications</span>
                {memberCounts.notificationsCount > 0 ? (
                  <span className="member-quick-nav-badge">
                    {memberCounts.notificationsCount > 99
                      ? "99+"
                      : memberCounts.notificationsCount}
                  </span>
                ) : null}
              </Link>
            </div>

            <Link
              href="/workspace"
              className="member-account-chip"
              title={`Workspace — ${displayName(profile)}`}
              onClick={handleNavClick}
            >
              <span className="member-account-chip-name">
                {displayName(profile)}
              </span>
              <span className="sr-only">Workspace</span>
            </Link>

            <div className="nav-account" ref={menuRef}>
              <button
                type="button"
                className="nav-avatar"
                aria-haspopup="menu"
                aria-expanded={menuOpen ? "true" : "false"}
                aria-label={`Account menu for ${displayName(profile)}`}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="nav-avatar-img" />
                ) : (
                  initials(profile)
                )}
              </button>
              {menuOpen ? (
                <div className="nav-avatar-menu" role="menu">
                  <div className="nav-avatar-meta">
                    <strong>{displayName(profile)}</strong>
                    <span className={`role-badge role-${profile.role}`}>
                      {profile.role === "admin"
                        ? "Admin"
                        : profile.role === "curator"
                          ? "Curator"
                          : "Member"}
                    </span>
                  </div>
                  <Link
                    href="/workspace"
                    className="nav-avatar-link"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Member workspace
                  </Link>
                  <Link
                    href="/my/workbench"
                    className="nav-avatar-link"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Archive Workbench
                  </Link>
                  {isCuratorOrAbove ? (
                    <Link
                      href="/curator"
                      className="nav-avatar-link"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Curator tools
                    </Link>
                  ) : null}
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="nav-avatar-link"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin dashboard
                    </Link>
                  ) : null}
                  <form
                    action="/auth/signout"
                    method="post"
                    className="nav-avatar-signout"
                  >
                    <button type="submit" role="menuitem">
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <Link href="/signin" className="nav-cta">
            Sign in
          </Link>
        )}

        <button
          id="hamburger"
          className="hamburger"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      <div id="navMobile" className={`nav-mobile${open ? " open" : ""}`}>
        <div className="nav-mobile-header">
          <span>Menu</span>
          <button
            type="button"
            className="nav-mobile-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <a
          href="/home"
          className="nav-link"
          onClick={(e) => {
            hardNavigateToArchive(e, "/home");
            handleNavClick();
          }}
        >
          Home
        </a>
        <a
          href="/library"
          className="nav-link"
          onClick={(e) => {
            hardNavigateToArchive(e, "/library");
            handleNavClick();
          }}
        >
          Library
        </a>
        <a
          href="/sources"
          className="nav-link"
          onClick={(e) => {
            hardNavigateToArchive(e, "/sources");
            handleNavClick();
          }}
        >
          Sources
        </a>
        <a
          href="/about"
          className="nav-link"
          onClick={(e) => {
            hardNavigateToArchive(e, "/about");
            handleNavClick();
          }}
        >
          About
        </a>
        {profile ? (
          <>
            <div
              className="nav-mobile-member"
              role="group"
              aria-label="Member shortcuts"
            >
              <Link
                href="/my/bookmarks"
                className="nav-link nav-mobile-member-link"
                onClick={handleNavClick}
                aria-label={bookmarksAriaLabel(memberCounts.bookmarksCount)}
              >
                <span>Bookmarks</span>
                {memberCounts.bookmarksCount > 0 ? (
                  <span className="member-quick-nav-badge" aria-hidden>
                    {memberCounts.bookmarksCount > 99
                      ? "99+"
                      : memberCounts.bookmarksCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/my/lists"
                className="nav-link nav-mobile-member-link"
                onClick={handleNavClick}
                aria-label={readingListsAriaLabel(memberCounts.readingListsCount)}
              >
                <span>Reading lists</span>
                {memberCounts.readingListsCount > 0 ? (
                  <span className="member-quick-nav-badge" aria-hidden>
                    {memberCounts.readingListsCount > 99
                      ? "99+"
                      : memberCounts.readingListsCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/my/workbench"
                className="nav-link nav-mobile-member-link"
                onClick={handleNavClick}
                aria-label="Archive Workbench"
              >
                <span>Workbench</span>
              </Link>
              <Link
                href="/workspace?section=notifications"
                className="nav-link nav-mobile-member-link"
                onClick={handleNavClick}
                aria-label={notificationsAriaLabel(memberCounts.notificationsCount)}
              >
                <span>Notifications</span>
                {memberCounts.notificationsCount > 0 ? (
                  <span className="member-quick-nav-badge" aria-hidden>
                    {memberCounts.notificationsCount > 99
                      ? "99+"
                      : memberCounts.notificationsCount}
                  </span>
                ) : null}
              </Link>
            </div>
            <Link href="/workspace" className="nav-link" onClick={handleNavClick}>
              Workspace
            </Link>
            {isCuratorOrAbove ? (
              <Link href="/curator" className="nav-link" onClick={handleNavClick}>
                Curator tools
              </Link>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" className="nav-link" onClick={handleNavClick}>
                Admin
              </Link>
            ) : null}
            <form action="/auth/signout" method="post">
              <button type="submit" className="nav-link nav-mobile-signout">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/signin" className="nav-link" onClick={handleNavClick}>
              Sign in
            </Link>
            <Link href="/signup" className="nav-link" onClick={handleNavClick}>
              Create account
            </Link>
          </>
        )}
      </div>
      {profile ? (
        <nav className="member-mobile-bottom-nav" aria-label="Member quick navigation">
          <a
            href="/library"
            className="member-mobile-bottom-nav__item"
            aria-label="Open library"
            onClick={(e) => {
              hardNavigateToArchive(e, "/library");
              setOpen(false);
              setMenuOpen(false);
            }}
          >
            <span className="member-mobile-bottom-nav__icon" aria-hidden="true">⌕</span>
            <span>Library</span>
          </a>

          <Link
            href="/my/bookmarks"
            className="member-mobile-bottom-nav__item"
            aria-label={bookmarksAriaLabel(memberCounts.bookmarksCount)}
          >
            <Bookmark className="member-mobile-bottom-nav__svg" aria-hidden="true" />
            {memberCounts.bookmarksCount > 0 ? (
              <span className="member-mobile-bottom-nav__badge" aria-hidden="true">
                {memberCounts.bookmarksCount > 99 ? "99+" : memberCounts.bookmarksCount}
              </span>
            ) : null}
            <span>Saved</span>
          </Link>

          <Link
            href="/my/lists"
            className="member-mobile-bottom-nav__item"
            aria-label={readingListsAriaLabel(memberCounts.readingListsCount)}
          >
            <ListChecks className="member-mobile-bottom-nav__svg" aria-hidden="true" />
            {memberCounts.readingListsCount > 0 ? (
              <span className="member-mobile-bottom-nav__badge" aria-hidden="true">
                {memberCounts.readingListsCount > 99 ? "99+" : memberCounts.readingListsCount}
              </span>
            ) : null}
            <span>Lists</span>
          </Link>

          <Link
            href="/workspace?section=notifications"
            className="member-mobile-bottom-nav__item"
            aria-label={notificationsAriaLabel(memberCounts.notificationsCount)}
          >
            <Bell className="member-mobile-bottom-nav__svg" aria-hidden="true" />
            {memberCounts.notificationsCount > 0 ? (
              <span className="member-mobile-bottom-nav__badge" aria-hidden="true">
                {memberCounts.notificationsCount > 99 ? "99+" : memberCounts.notificationsCount}
              </span>
            ) : null}
            <span>Alerts</span>
          </Link>

          <button
            type="button"
            className="member-mobile-bottom-nav__item"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <span className="member-mobile-bottom-nav__icon" aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>
        </nav>
      ) : null}

    </nav>
  );
}
