"use client";

import "@/app/styles/editorial/editorial.css";
import "@/app/workbench.css";
import "@/app/styles/workbench-review-module.css";
import "@/app/styles/workbench-sidebar-icons.css";
import "@/app/styles/workbench-overview-polish.css";
import "@/app/styles/workbench-projects-polish.css";
import {
  Bookmark,
  Brain,
  CheckSquare,
  ClipboardCheck,
  Download,
  Home,
  LayoutGrid,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Pin,
  PinOff,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const SIDEBAR_COLLAPSED_KEY = "workbench-sidebar-collapsed";
const SIDEBAR_PINNED_KEY = "workbench-sidebar-pinned";
const SIDEBAR_PREFS_VERSION_KEY = "workbench-sidebar-prefs-version";
const SIDEBAR_PREFS_VERSION = "6";

const ICON_SIZE = 18;
const ICON_STROKE = 1.8;
const CONTROL_ICON_SIZE = 16;

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/my/workbench", label: "Overview", Icon: Home },
  { href: "/my/workbench/projects", label: "Projects", Icon: LayoutGrid },
  { href: "/my/workbench/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/my/workbench/saved-records", label: "Saved Records", Icon: Bookmark },
  { href: "/my/workbench/reading-lists", label: "Reading Lists", Icon: List },
  { href: "/my/workbench/notes", label: "Notes", Icon: PencilLine },
  { href: "/my/workbench/reviews", label: "Reviews", Icon: ClipboardCheck },
  { href: "/my/workbench/intelligence", label: "Research Intelligence", Icon: Brain },
  { href: "/my/workbench/collaborators", label: "Collaborators", Icon: Users },
  { href: "/my/workbench/exports", label: "Exports", Icon: Download },
];

export default function WorkbenchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(SIDEBAR_PREFS_VERSION_KEY);
      if (storedVersion !== SIDEBAR_PREFS_VERSION) {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "0");
        localStorage.setItem(SIDEBAR_PREFS_VERSION_KEY, SIDEBAR_PREFS_VERSION);
        setSidebarCollapsed(false);
        setSidebarPinned(localStorage.getItem(SIDEBAR_PINNED_KEY) === "1");
      } else {
        setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
        setSidebarPinned(localStorage.getItem(SIDEBAR_PINNED_KEY) === "1");
      }
    } catch {
      /* ignore storage errors */
    }
    setPrefsReady(true);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleSidebarPinned = useCallback(() => {
    setSidebarPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_PINNED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isProjectsIndexRoute = pathname === "/my/workbench/projects";
  const isProjectDetailRoute = pathname.startsWith("/my/workbench/projects/");
  const isNotesRoute = pathname === "/my/workbench/notes" || pathname.startsWith("/my/workbench/notes/");
  const isIntelligenceRoute =
    pathname === "/my/workbench/intelligence" || pathname.startsWith("/my/workbench/intelligence/");
  const isReviewsRoute =
    pathname === "/my/workbench/reviews" || pathname.startsWith("/my/workbench/reviews/");

  const outerClasses = [
    "platform-ui",
    "dashboard-canvas-outer",
    "dashboard-shell--member",
    "workbench-member-canvas",
    isNotesRoute ? "workbench-shell--notes-premium" : "",
    isIntelligenceRoute ? "workbench-member-canvas--intelligence" : "",
    isReviewsRoute ? "workbench-member-canvas--reviews" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shellClasses = [
    "workbench-shell",
    "workbench-shell--stable",
    "workbench-shell--premium",
    isNotesRoute ? "workbench-shell--notes-premium" : "",
    isIntelligenceRoute ? "workbench-shell--intelligence" : "",
    isReviewsRoute ? "workbench-shell--reviews" : "",
    isProjectsIndexRoute ? "is-projects-index-route" : "",
    isProjectDetailRoute ? "is-project-detail-route" : "",
    prefsReady ? "is-sidebar-ready" : "",
    sidebarCollapsed && prefsReady ? "is-sidebar-collapsed" : "",
    sidebarPinned && prefsReady ? "is-sidebar-pinned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={outerClasses}>
      <div className={shellClasses}>
        <aside
          className="workbench-sidebar"
          data-wb-sidebar="2"
          aria-label="Archive Workbench navigation"
          data-sidebar-prefs-ready={prefsReady ? "true" : "false"}
        >
          <div className="workbench-sidebar-head">
            <p className="workbench-sidebar-title">Workbench</p>
            <div className="workbench-sidebar-controls">
              <button
                type="button"
                className={`workbench-sidebar-control${sidebarPinned ? " is-active" : ""}`}
                onClick={toggleSidebarPinned}
                aria-pressed={sidebarPinned}
                aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar while scrolling"}
                title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar while scrolling"}
              >
                {sidebarPinned ? (
                  <PinOff size={CONTROL_ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
                ) : (
                  <Pin size={CONTROL_ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="workbench-sidebar-control"
                onClick={toggleSidebarCollapsed}
                aria-expanded={!sidebarCollapsed}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen size={CONTROL_ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
                ) : (
                  <PanelLeftClose size={CONTROL_ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
                )}
              </button>
            </div>
          </div>
          <nav className="workbench-nav">
            {NAV.map((item) => {
              const active =
                item.href === "/my/workbench"
                  ? pathname === "/my/workbench"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const { Icon } = item;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-no-loader="true"
                  className={[
                    "workbench-sidebar-item",
                    active ? "workbench-sidebar-item--active is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="workbench-sidebar-glyph" aria-hidden="true">
                    <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                  </span>
                  <span className="workbench-sidebar-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="workbench-main">{children}</div>
      </div>
    </div>
  );
}
