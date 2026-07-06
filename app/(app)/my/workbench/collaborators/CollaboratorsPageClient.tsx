"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { WorkbenchCollaboratorRow } from "@/lib/workbench-data";
import WorkbenchCollaboratorPanel from "../WorkbenchCollaboratorPanel";

export type CollaboratorProject = {
  id: string;
  title: string;
  owner_id: string;
  updated_at: string;
  record_count: number;
  collaborators: WorkbenchCollaboratorRow[];
  canManage: boolean;
};

type ViewMode = "cards" | "compact";
type FilterMode = "all" | "with-collaborators" | "without-collaborators" | "pending";

const VIEW_STORAGE_KEY = "workbench-collaborators-view";

const ROLE_GUIDE = [
  {
    role: "Editor",
    description: "Can edit records, tasks, and invite others.",
  },
  {
    role: "Reviewer",
    description: "Can update review states and comment on progress.",
  },
  {
    role: "Viewer",
    description: "Read-only access to project content.",
  },
];

function displayStatus(row: WorkbenchCollaboratorRow) {
  if (row.status === "removed") return "removed";
  if (row.user_id || row.status === "accepted") return "accepted";
  return row.status || "pending";
}

function visibleCollaborators(rows: WorkbenchCollaboratorRow[]) {
  return rows.filter((row) => displayStatus(row) !== "removed");
}

function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

type CollaboratorsPageClientProps = {
  projects: CollaboratorProject[];
  error?: string;
};

export default function CollaboratorsPageClient({
  projects,
  error,
}: CollaboratorsPageClientProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "cards" || stored === "compact") setViewMode(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const stats = useMemo(() => {
    let collaborators = 0;
    let pending = 0;
    projects.forEach((project) => {
      const visible = visibleCollaborators(project.collaborators);
      collaborators += visible.length;
      pending += visible.filter((row) => displayStatus(row) === "pending").length;
    });
    return {
      projects: projects.length,
      collaborators,
      pending,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      const visible = visibleCollaborators(project.collaborators);
      const haystack = [
        project.title,
        ...visible.map((row) => row.invited_email || row.user_id || ""),
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;

      if (filter === "with-collaborators") return visible.length > 0;
      if (filter === "without-collaborators") return visible.length === 0;
      if (filter === "pending") {
        return visible.some((row) => displayStatus(row) === "pending");
      }
      return true;
    });
  }, [projects, query, filter]);

  function toggleExpanded(projectId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const hasActiveFilters = query.trim().length > 0 || filter !== "all";

  return (
    <section className="wb-collab-page">
      <header className="wb-collab-header">
        <div className="wb-collab-header__text">
          <p className="wb-collab-eyebrow">Collaborators</p>
          <h1>Invitations &amp; access</h1>
          <p>
            Manage who can view, review, or edit each research project. Invites are
            sent per project so access stays scoped and auditable.
          </p>
        </div>
        <Link href="/my/workbench/projects" className="wb-collab-link-btn">
          View projects
        </Link>
      </header>

      {error ? (
        <p className="wb-collab-banner wb-collab-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="wb-collab-stats" aria-label="Collaboration overview">
        <article className="wb-collab-stat">
          <span className="wb-collab-stat__value">{stats.projects}</span>
          <span className="wb-collab-stat__label">Projects</span>
        </article>
        <article className="wb-collab-stat">
          <span className="wb-collab-stat__value">{stats.collaborators}</span>
          <span className="wb-collab-stat__label">Collaborators</span>
        </article>
        <article className="wb-collab-stat">
          <span className="wb-collab-stat__value">{stats.pending}</span>
          <span className="wb-collab-stat__label">Pending invites</span>
        </article>
      </div>

      <section className="wb-collab-roles" aria-label="Role definitions">
        {ROLE_GUIDE.map((item) => (
          <article key={item.role} className="wb-collab-role-card">
            <strong>{item.role}</strong>
            <span>{item.description}</span>
          </article>
        ))}
      </section>

      <section className="wb-collab-toolbar" aria-label="Find projects">
        <div className="wb-collab-toolbar__row">
          <label className="wb-collab-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search project or collaborator email…"
            />
          </label>

          <div className="wb-collab-view-toggle">
            <span className="wb-collab-view-toggle__label">View</span>
            <div className="wb-collab-view-toggle__group" role="group" aria-label="Layout">
              <button
                type="button"
                className={viewMode === "cards" ? "is-active" : undefined}
                aria-pressed={viewMode === "cards"}
                onClick={() => setViewMode("cards")}
              >
                Cards
              </button>
              <button
                type="button"
                className={viewMode === "compact" ? "is-active" : undefined}
                aria-pressed={viewMode === "compact"}
                onClick={() => setViewMode("compact")}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        <div className="wb-collab-filter-tabs" role="tablist" aria-label="Project filters">
          {(
            [
              ["all", "All projects"],
              ["with-collaborators", "With collaborators"],
              ["without-collaborators", "No collaborators"],
              ["pending", "Pending invites"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "is-active" : undefined}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="wb-collab-toolbar__footer">
          <p className="wb-collab-count" aria-live="polite">
            Showing {filteredProjects.length} of {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"}
            {viewMode === "compact" ? " · Compact view" : " · Card view"}.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="wb-collab-reset"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </section>

      {filteredProjects.length ? (
        <div className={`wb-collab-projects wb-collab-projects--${viewMode}`}>
          {filteredProjects.map((project) => {
            const visible = visibleCollaborators(project.collaborators);
            const pendingCount = visible.filter(
              (row) => displayStatus(row) === "pending",
            ).length;
            const isCompact = viewMode === "compact";
            const isExpanded = !isCompact || expandedIds.has(project.id);

            return (
              <article
                key={project.id}
                className={`wb-collab-project${isExpanded ? " is-expanded" : ""}`}
              >
                <header className="wb-collab-project__head">
                  <div className="wb-collab-project__intro">
                    <h2>
                      <Link href={`/my/workbench/projects/${project.id}`}>
                        {project.title}
                      </Link>
                    </h2>
                    <p>
                      Updated {formatProjectDate(project.updated_at)} ·{" "}
                      {project.record_count}{" "}
                      {project.record_count === 1 ? "record" : "records"}
                    </p>
                  </div>

                  <div className="wb-collab-project__meta">
                    <span className="wb-collab-pill">
                      {visible.length}{" "}
                      {visible.length === 1 ? "collaborator" : "collaborators"}
                    </span>
                    {pendingCount ? (
                      <span className="wb-collab-pill wb-collab-pill--pending">
                        {pendingCount} pending
                      </span>
                    ) : null}
                    <Link
                      href={`/my/workbench/projects/${project.id}`}
                      className="wb-collab-link-btn wb-collab-link-btn--ghost"
                    >
                      Open project
                    </Link>
                    {isCompact ? (
                      <button
                        type="button"
                        className="wb-collab-expand"
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpanded(project.id)}
                      >
                        {isExpanded ? "Hide" : "Manage"}
                      </button>
                    ) : null}
                  </div>
                </header>

                {isExpanded ? (
                  <div className="wb-collab-project__body">
                    <WorkbenchCollaboratorPanel
                      variant="premium"
                      projectId={project.id}
                      collaborators={project.collaborators}
                      canManage={project.canManage}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : projects.length ? (
        <article className="wb-collab-empty" role="status">
          <h2>No projects match</h2>
          <p>Try a different search term or filter.</p>
          <button
            type="button"
            className="wb-collab-btn wb-collab-btn--primary"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </article>
      ) : (
        <article className="wb-collab-empty" role="status">
          <h2>No projects yet</h2>
          <p>Create a research project first, then invite collaborators here.</p>
          <Link href="/my/workbench/projects?new=1" className="wb-collab-btn wb-collab-btn--primary">
            Create project
          </Link>
        </article>
      )}
    </section>
  );
}
