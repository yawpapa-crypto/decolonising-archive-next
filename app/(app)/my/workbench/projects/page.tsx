import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";
import { createWorkbenchProject } from "@/lib/workbench-actions";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";
import { WORKBENCH_PROJECT_TYPES } from "@/lib/workbench-types";
import WorkbenchProjectsListClient from "./WorkbenchProjectsListClient";

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
    <section className="workbench-dashboard-page workbench-projects-page workbench-projects-premium">
      <header className="workbench-projects-header workbench-projects-header--fixed">
        <div className="workbench-projects-heading-block">
          <p className="workbench-projects-eyebrow">Projects</p>
          <h1>Research projects</h1>
        </div>

        <Link
          href="/my/workbench/projects?new=1"
          className="workbench-button workbench-button-primary workbench-projects-new-button"
        >
          New project
        </Link>
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
        <section className="workbench-panel workbench-project-form-card" id="new-project">
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

            <div className="workbench-project-form-actions">
              <PendingSubmitButton
                className="workbench-button workbench-button-primary workbench-project-submit"
                pendingLabel="Creating…"
              >
                Create project
              </PendingSubmitButton>
              <Link
                href="/my/workbench/projects"
                className="workbench-button workbench-button-secondary workbench-project-discard"
              >
                Discard
              </Link>
            </div>
          </form>
        </section>
      ) : null}

      <section className="workbench-panel workbench-project-list-card">
        <WorkbenchProjectsListClient projects={projects} />
      </section>
    </section>
  );
}
