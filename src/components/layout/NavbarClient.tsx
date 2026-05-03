"use client";

// Client navbar — same look as before, plus the new auth slot:
//   - Logged out: "Sign in" link
//   - Logged in: avatar with dropdown (Workspace / Curator tools / Admin / Sign out)
//
// The mobile menu mirrors the same options inline.
//
// Note on link tags: hash-style routes (/#/home, /#/library, etc.) target the
// SPA hash router in /assets/js/app.js, NOT Next pages — they must stay as
// plain <a>. Real Next routes use next/link.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

export default function NavbarClient({
  profile,
}: {
  profile: NavProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeMenu = () => {
      setOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", closeMenu);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("hashchange", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

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

  const handleNavClick = () => setOpen(false);

  const isCuratorOrAbove =
    !!profile && ROLE_RANK[profile.role] >= ROLE_RANK.curator;
  const isAdmin = !!profile && profile.role === "admin";

  return (
    <nav className="nav">
      <div className="nav-inner">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- hash route targeting SPA router in /assets/js/app.js */}
        <a href="/#/home" className="nav-logo" onClick={handleNavClick}>
          DECOLONISING ARCHIVE
        </a>

        <div className="nav-links">
          {/* eslint-disable @next/next/no-html-link-for-pages -- hash routes targeting SPA router */}
          <a href="/#/home" className="nav-link">Home</a>
          <a href="/#/library" className="nav-link">Library</a>
          <a href="/#/sources" className="nav-link">Sources</a>
          <a href="/#/about" className="nav-link">About</a>
          {/* eslint-enable @next/next/no-html-link-for-pages */}
        </div>

        {profile ? (
          <div className="nav-account" ref={menuRef}>
            <button
              type="button"
              className="nav-avatar"
              aria-haspopup="menu"
              aria-expanded={menuOpen ? "true" : "false"}
              onClick={() => setMenuOpen((v) => !v)}
              title={profile.email ?? "Account"}
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
        {/* eslint-disable @next/next/no-html-link-for-pages -- hash routes targeting SPA router */}
        <a href="/#/home" className="nav-link" onClick={handleNavClick}>Home</a>
        <a href="/#/library" className="nav-link" onClick={handleNavClick}>Library</a>
        <a href="/#/sources" className="nav-link" onClick={handleNavClick}>Sources</a>
        <a href="/#/about" className="nav-link" onClick={handleNavClick}>About</a>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
        {profile ? (
          <>
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
    </nav>
  );
}
