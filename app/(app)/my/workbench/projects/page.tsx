import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";
import { createWorkbenchProject } from "@/lib/workbench-actions";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";
import { WORKBENCH_PROJECT_TYPES, projectTypeLabel } from "@/lib/workbench-types";

type SearchParams = Promise<{ new?: string; updated?: string; error?: string }>;

export default async function WorkbenchProjectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { ok, error, projects } = await listWorkbenchProjectsSummary();
  const showNew = sp.new === "1";

  return (
    <section className="workbench-dashboard-page workbench-projects-page">
      <header className="workbench-projects-header workbench-projects-header--fixed">
        <div className="workbench-projects-heading-block">
          <p className="workbench-projects-eyebrow">Projects</p>
          <h1>Research projects</h1>
          <p>
            Each project links archive records to workflow stages, reviews, tasks,
            and exports.
          </p>
        </div>

        <a
          href="/my/workbench/projects?new=1"
          className="workbench-button workbench-button-primary workbench-projects-new-button"
        >
          New research project
        </a>
      </header>

      {sp.updated ? (
        <p className="workbench-flash" role="status">
          {sp.updated}
        </p>
      ) : null}
      {sp.error ? (
        <p className="workbench-flash is-error" role="alert">
          {sp.error}
        </p>
      ) : null}

      {!ok ? <p className="workbench-flag">{error}</p> : null}

      {showNew ? (
        <section className="workbench-panel workbench-project-form-card">
          <div className="workbench-project-form-heading">
            <h2>New project</h2>
            <p>
              Create a research board for saved records, review tasks, notes and
              exports.
            </p>
          </div>

          <form className="workbench-project-form" action={createWorkbenchProject}>
            <label className="workbench-field">
              <span>Title</span>
              <input
                name="title"
                required
                placeholder="Project title"
                autoComplete="off"
              />
            </label>

            <label className="workbench-field">
              <span>Type</span>
              <select name="project_type" defaultValue="custom_project">
                {WORKBENCH_PROJECT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="workbench-field workbench-field-wide">
              <span>Description</span>
              <textarea name="description" rows={4} placeholder="Optional" />
            </label>

            <label className="workbench-field">
              <span>Deadline</span>
              <input type="date" name="deadline" />
            </label>

            <label className="workbench-field">
              <span>Visibility</span>
              <select name="visibility" defaultValue="private">
                <option value="private">Private</option>
                <option value="shared">Shared with collaborators</option>
                <option value="public">Public (signed-in members)</option>
              </select>
            </label>

            <label className="workbench-checkbox-field">
              <input type="checkbox" name="with_milestones" />
              <span>
                Add default research milestones (PhD / Masters templates only)
              </span>
            </label>

            <PendingSubmitButton
              className="workbench-button workbench-button-primary workbench-project-submit"
              pendingLabel="Creating…"
            >
              Create project
            </PendingSubmitButton>
          </form>
        </section>
      ) : null}

      <section className="workbench-panel workbench-project-list-card">
        <div className="workbench-project-list-header">
          <h2>Your projects</h2>
          <p>
            Select a project to manage linked records, reviews and tasks.
          </p>
        </div>

        {projects.length ? (
          <div className="workbench-project-grid">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/my/workbench/projects/${p.id}`}
                className="workbench-project-card"
              >
                <div>
                  <h3>{p.title}</h3>
                  <p>
                    {projectTypeLabel(p.project_type)} · {p.record_count} records
                    · {p.status}
                    {p.deadline ? ` · deadline ${p.deadline}` : ""}
                  </p>
                </div>
                <span>Open project →</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="workbench-empty-state workbench-empty empty-state" role="status">
            Create your first project to begin linking archive records.
          </p>
        )}
      </section>
    </section>
  );
}
