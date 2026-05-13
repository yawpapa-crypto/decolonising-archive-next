import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";
import { createWorkbenchProject } from "@/lib/workbench-actions";
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
    <>
      <p className="workbench-kicker">Projects</p>
      <h1 className="workbench-page-title">Research projects</h1>
      <p className="workbench-lede">
        Each project links archive records to workflow stages, reviews, tasks, and
        exports.
      </p>

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

      {!ok ? (
        <section className="workbench-panel">
          <p className="workbench-flag">{error}</p>
        </section>
      ) : null}

      {showNew ? (
        <section className="workbench-panel">
          <h2>New project</h2>
          <form action={createWorkbenchProject} className="workbench-form-grid">
            <label>
              <span>Title</span>
              <input className="workbench-input" name="title" required placeholder="Project title" />
            </label>
            <label>
              <span>Type</span>
              <select className="workbench-select" name="project_type" defaultValue="custom_project">
                {WORKBENCH_PROJECT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Description</span>
              <textarea className="workbench-textarea" name="description" rows={3} />
            </label>
            <label>
              <span>Deadline (optional)</span>
              <input className="workbench-input" type="date" name="deadline" />
            </label>
            <label>
              <span>Visibility</span>
              <select className="workbench-select" name="visibility" defaultValue="private">
                <option value="private">Private</option>
                <option value="shared">Shared with collaborators</option>
                <option value="public">Public (signed-in members)</option>
              </select>
            </label>
            <label className="workbench-form-grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13 }}>
                <input type="checkbox" name="with_milestones" /> Add default research milestones (PhD / Masters templates only)
              </span>
            </label>
            <button type="submit" className="workbench-btn">
              Create project
            </button>
          </form>
        </section>
      ) : (
        <p>
          <Link className="workbench-btn" href="/my/workbench/projects?new=1">
            New research project
          </Link>
        </p>
      )}

      <section className="workbench-panel" style={{ marginTop: 24 }}>
        <h2>Your projects</h2>
        {projects.length ? (
          <ul className="workbench-list">
            {projects.map((p) => (
              <li key={p.id}>
                <Link className="workbench-link" href={`/my/workbench/projects/${p.id}`}>
                  <strong>{p.title}</strong>
                </Link>
                <div style={{ fontSize: 12, color: "#525252", marginTop: 4 }}>
                  {projectTypeLabel(p.project_type)} · {p.record_count} records ·{" "}
                  {p.status}
                  {p.deadline ? ` · deadline ${p.deadline}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Create your first project to begin linking archive records.</p>
        )}
      </section>
    </>
  );
}
