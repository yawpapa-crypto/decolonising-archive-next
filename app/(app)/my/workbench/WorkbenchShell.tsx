"use client";

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
  { href: "/my/workbench/collaborators", label: "Collaborators" },
  { href: "/my/workbench/exports", label: "Exports" },
] as const;

export default function WorkbenchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isProjectsIndexRoute = pathname === "/my/workbench/projects";
  const isProjectDetailRoute = pathname.startsWith("/my/workbench/projects/");

  return (
    <div className="dashboard-canvas-outer dashboard-shell--member workbench-member-canvas">
      <div
        className={[
          "workbench-shell",
          "workbench-shell--stable",
          isProjectsIndexRoute ? "is-projects-index-route" : "",
          isProjectDetailRoute ? "is-project-detail-route" : "",
        ].filter(Boolean).join(" ")}
      >
        <aside className="workbench-sidebar" aria-label="Archive Workbench">
          <p className="workbench-sidebar-title">Archive Workbench</p>
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
