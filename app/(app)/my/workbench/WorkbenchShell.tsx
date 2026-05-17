"use client";

import "@/app/workbench-board-immersive.css";
import "@/app/styles/editorial/editorial.css";
import "@/app/workbench.css";
import "@/app/styles/archive/notes-figma.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/my/workbench", label: "Overview" },
  { href: "/my/workbench/projects", label: "Projects" },
  { href: "/my/workbench/tasks", label: "Tasks" },
  { href: "/my/workbench/saved-records", label: "Saved Records" },
  { href: "/my/workbench/reading-lists", label: "Reading Lists" },
  { href: "/my/workbench/notes", label: "Notes" },
  { href: "/my/workbench/intelligence", label: "Research Intelligence" },
  { href: "/my/workbench/collaborators", label: "Collaborators" },
  { href: "/my/workbench/exports", label: "Exports" },
] as const;

export default function WorkbenchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isProjectsIndexRoute = pathname === "/my/workbench/projects";
  const isProjectDetailRoute = pathname.startsWith("/my/workbench/projects/");
  const isNotesRoute = pathname === "/my/workbench/notes" || pathname.startsWith("/my/workbench/notes/");

  const outerClasses = [
    "dashboard-canvas-outer",
    "dashboard-shell--member",
    "workbench-member-canvas",
    isNotesRoute ? "workbench-shell--notes-premium" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shellClasses = [
    "workbench-shell",
    "workbench-shell--stable",
    isNotesRoute ? "workbench-shell--notes-premium" : "",
    isProjectsIndexRoute ? "is-projects-index-route" : "",
    isProjectDetailRoute ? "is-project-detail-route" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={outerClasses}>
      <div className={shellClasses}>
        <aside className="workbench-sidebar" aria-label="Archive Workbench navigation">
          <p className="workbench-sidebar-title">Workbench</p>
          <nav className="workbench-nav">
            {NAV.map((item) => {
              const active =
                item.href === "/my/workbench"
                  ? pathname === "/my/workbench"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "is-active" : undefined}
                >
                  {item.label}
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
