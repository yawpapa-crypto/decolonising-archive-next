"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import ReviewActionMenu from "./ReviewActionMenu";
import ReviewPageHeader from "./ReviewPageHeader";
import { formatReviewDate, reviewStatusLabel, reviewTypeLabel } from "./review-shared";

export default function ReviewListClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const [tab, setTab] = useState<"current" | "archived">("current");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const counts = useMemo(() => {
    const current = snapshot.projects.filter((project) => project.status !== "archived").length;
    return { current, archived: snapshot.projects.length - current };
  }, [snapshot.projects]);

  const filtered = useMemo(() => {
    const rows = snapshot.projects.filter((project) =>
      tab === "archived" ? project.status === "archived" : project.status !== "archived",
    );
    return [...rows].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [snapshot.projects, sort, tab]);

  return (
    <section className="workbench-review-index workbench-review-page">
      <ReviewPageHeader
        eyebrow="Reviews"
        title="Your reviews"
        description="Structured evidence workflows for systematic and scoping reviews."
        action={
          <Link href="/my/workbench/reviews/new" className="workbench-review-primary">
            Start a new review
          </Link>
        }
      />

      {snapshot.errors.length ? (
        <p className="workbench-review-flash is-error" role="alert">
          {snapshot.errors.join(" · ")}
        </p>
      ) : null}

      <div className="workbench-review-list-toolbar">
        <div className="workbench-review-segmented" role="tablist" aria-label="Review archive filter">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "current"}
            className={tab === "current" ? "is-active" : undefined}
            onClick={() => setTab("current")}
          >
            Current ({counts.current})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "archived"}
            className={tab === "archived" ? "is-active" : undefined}
            onClick={() => setTab("archived")}
          >
            Archived ({counts.archived})
          </button>
        </div>
        <label className="workbench-review-sort-select">
          <span className="sr-only">Sort reviews</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")} aria-label="Sort reviews">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="workbench-review-card workbench-review-list-card">
        {filtered.length ? (
          <ul className="workbench-review-project-list">
            {filtered.map((project) => (
              <li key={project.id}>
                <Link href={`/my/workbench/reviews/${project.id}`} className="workbench-review-project-row">
                  <div className="workbench-review-project-copy">
                    <time dateTime={project.updatedAt}>Updated {formatReviewDate(project.updatedAt)}</time>
                    <strong>{project.title}</strong>
                    <span className="workbench-review-project-meta">
                      {reviewTypeLabel(project.reviewType)}
                      <em>{reviewStatusLabel(project.status)}</em>
                    </span>
                    {!project.isOwner ? <span className="workbench-review-project-badge">Shared</span> : null}
                  </div>
                  <span className="workbench-review-project-open" aria-hidden>
                    Open
                  </span>
                </Link>
                <ReviewActionMenu project={project} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="workbench-review-empty">
            <strong>{tab === "archived" ? "No archived reviews" : "No reviews yet"}</strong>
            <p>
              {tab === "archived"
                ? "Archived reviews appear here when you archive a project."
                : "Create a review to import references, screen studies, and extract data."}
            </p>
            {tab === "current" ? (
              <Link href="/my/workbench/reviews/new" className="workbench-review-primary">
                Start a new review
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
