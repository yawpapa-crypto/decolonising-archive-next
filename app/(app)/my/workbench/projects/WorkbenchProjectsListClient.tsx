"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WorkbenchProjectRow } from "@/lib/workbench-data";
import {
  PROJECT_STATUS,
  WORKBENCH_PROJECT_TYPES,
  projectStatusLabel,
  projectTypeLabel,
} from "@/lib/workbench-types";

export type WorkbenchProjectSummary = WorkbenchProjectRow & { record_count: number };

type SortMode =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "deadline_asc"
  | "records_desc";

type Props = {
  projects: WorkbenchProjectSummary[];
};

export default function WorkbenchProjectsListClient({ projects }: Props) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortMode>("updated_desc");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let rows = [...projects];

    if (typeFilter !== "all") {
      rows = rows.filter((p) => p.project_type === typeFilter);
    }
    if (statusFilter !== "all") {
      rows = rows.filter((p) => p.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false) ||
          projectTypeLabel(p.project_type).toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      switch (sort) {
        case "updated_asc":
          return a.updated_at.localeCompare(b.updated_at);
        case "title_asc":
          return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        case "title_desc":
          return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
        case "deadline_asc":
          return String(a.deadline || "9999-99-99").localeCompare(
            String(b.deadline || "9999-99-99"),
          );
        case "records_desc":
          return b.record_count - a.record_count;
        case "updated_desc":
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });

    return rows;
  }, [projects, typeFilter, statusFilter, sort, query]);

  const hasActiveFilters =
    typeFilter !== "all" || statusFilter !== "all" || query.trim().length > 0;

  function clearFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setQuery("");
  }

  if (!projects.length) {
    return (
      <div className="workbench-projects-empty" role="status">
        <h3>No projects yet</h3>
        <p>Link archive records, reviews, and tasks in one research board.</p>
        <Link
          href="/my/workbench/projects?new=1"
          className="workbench-button workbench-button-primary workbench-projects-new-button"
        >
          New project
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="workbench-projects-toolbar">
        <input
          type="search"
          className="workbench-projects-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects…"
          aria-label="Search projects"
        />

        <select
          className="workbench-projects-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {WORKBENCH_PROJECT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          className="workbench-projects-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUS.map((status) => (
            <option key={status} value={status}>
              {projectStatusLabel(status)}
            </option>
          ))}
        </select>

        <select
          className="workbench-projects-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort projects"
        >
          <option value="updated_desc">Recently updated</option>
          <option value="updated_asc">Oldest updated</option>
          <option value="title_asc">Title A–Z</option>
          <option value="title_desc">Title Z–A</option>
          <option value="deadline_asc">Deadline soonest</option>
          <option value="records_desc">Most records</option>
        </select>

        <p className="workbench-projects-results-meta" aria-live="polite">
          {filtered.length}/{projects.length}
        </p>

        {hasActiveFilters ? (
          <button
            type="button"
            className="workbench-projects-clear"
            onClick={clearFilters}
          >
            Clear
          </button>
        ) : null}
      </div>

      {filtered.length ? (
        <ul className="workbench-project-list">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link href={`/my/workbench/projects/${p.id}`} className="workbench-project-card">
                <div className="workbench-project-card-main">
                  <div className="workbench-project-card-badges">
                    <span className="workbench-project-card-category">
                      {projectTypeLabel(p.project_type)}
                    </span>
                    <span className="workbench-project-card-status">
                      {projectStatusLabel(p.status)}
                    </span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>
                    {p.record_count} record{p.record_count === 1 ? "" : "s"}
                    {p.deadline ? ` · Due ${p.deadline}` : ""}
                  </p>
                </div>
                <span className="workbench-project-card-action" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="workbench-projects-empty workbench-projects-empty--filtered" role="status">
          <p>No projects match these filters.</p>
          <button
            type="button"
            className="workbench-button workbench-button-secondary"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
