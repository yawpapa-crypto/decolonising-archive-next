"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { WorkbenchReviewProject, WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import { reviewStatusLabel, reviewTypeLabel } from "./review-shared";

const REVIEW_NAV = [
  { href: (id: string) => `/my/workbench/reviews/${id}`, label: "Summary", segment: "summary" },
  { href: (id: string) => `/my/workbench/reviews/${id}/import`, label: "Import", segment: "import" },
  { href: (id: string) => `/my/workbench/reviews/${id}/screening`, label: "Screening", segment: "screening" },
  { href: (id: string) => `/my/workbench/reviews/${id}/full-text`, label: "Full text", segment: "full-text" },
  { href: (id: string) => `/my/workbench/reviews/${id}/extraction`, label: "Extraction", segment: "extraction" },
] as const;

function navBadge(segment: (typeof REVIEW_NAV)[number]["segment"], snapshot: WorkbenchReviewSnapshot) {
  const counts = snapshot.stageCounts;
  if (segment === "screening" && counts.awaitingScreening > 0) return counts.awaitingScreening;
  if (segment === "screening" && counts.conflicts > 0) return counts.conflicts;
  if (segment === "full-text" && counts.fullTextQueue > counts.fullTextDone) {
    return counts.fullTextQueue - counts.fullTextDone;
  }
  if (segment === "import" && counts.importTotal === 0) return "!";
  return null;
}

type ReviewProjectShellProps = {
  project: WorkbenchReviewProject;
  snapshot: WorkbenchReviewSnapshot;
  activeSegment: (typeof REVIEW_NAV)[number]["segment"];
  children: ReactNode;
  onExport?: () => void;
};

export default function ReviewProjectShell({
  project,
  snapshot,
  activeSegment,
  children,
  onExport,
}: ReviewProjectShellProps) {
  const pathname = usePathname();
  const conflictCount = snapshot.stageCounts.conflicts;

  return (
    <div className="workbench-review-shell workbench-review-page">
      <header className="workbench-review-summary">
        <Link href="/my/workbench/reviews" className="workbench-review-back">
          ← All reviews
        </Link>
        <div className="workbench-review-summary-head">
          <div className="workbench-review-summary-copy">
            <p className="workbench-review-eyebrow">Evidence review</p>
            <h1>{project.title}</h1>
            <div className="workbench-review-chips">
              <span className="workbench-review-chip">{reviewTypeLabel(project.reviewType)}</span>
              <span className={`workbench-review-chip is-${project.status}`}>
                {reviewStatusLabel(project.status)}
              </span>
              {!project.isOwner ? <span className="workbench-review-chip">Shared with you</span> : null}
              <span className="workbench-review-chip">{snapshot.screenings.length} records</span>
              {conflictCount > 0 ? (
                <span className="workbench-review-chip is-alert">{conflictCount} conflicts</span>
              ) : null}
            </div>
          </div>
          <div className="workbench-review-summary-actions">
            <Link href={`/my/workbench/reviews/${project.id}/settings`} className="workbench-review-ghost">
              Settings
            </Link>
            <Link href={`/my/workbench/reviews/${project.id}/reporting`} className="workbench-review-ghost">
              PRISMA
            </Link>
            {onExport ? (
              <button type="button" className="workbench-review-ghost" onClick={onExport}>
                Export
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {snapshot.errors.length ? (
        <p className="workbench-review-flash is-error" role="alert">
          {snapshot.errors.join(" · ")}
        </p>
      ) : null}

      <nav className="workbench-review-nav" aria-label="Review workflow">
        {REVIEW_NAV.map((item) => {
          const href = item.href(project.id);
          const active = activeSegment === item.segment || pathname === href;
          const badge = navBadge(item.segment, snapshot);
          return (
            <Link key={item.segment} href={href} data-no-loader="true" className={active ? "is-active" : undefined}>
              {item.label}
              {badge ? <span className="workbench-review-nav-badge">{badge}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="workbench-review-shell-body">{children}</div>
    </div>
  );
}
