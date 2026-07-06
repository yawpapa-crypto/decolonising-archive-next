import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";

export default async function WorkbenchExportsPage() {
  const { ok, error, projects } = await listWorkbenchProjectsSummary();

  return (
    <section className="workbench-dashboard-page workbench-projects-page workbench-exports-page-clean">
      <header className="workbench-dashboard-header workbench-projects-header">
        <p className="workbench-projects-eyebrow">Exports</p>
        <div className="workbench-projects-header-row">
          <div>
            <h1>Export citations & data</h1>
            <p>
              Plain text citations, markdown annotated bibliography, CSV, and JSON
              exports are generated per project from linked records and archive
              metadata.
            </p>
          </div>
        </div>
      </header>

      {!ok ? <p className="workbench-flag">{error}</p> : null}

      <section className="workbench-panel workbench-exports-card">
        <div className="workbench-project-list-header">
          <h2>Choose a project</h2>
          <p>Pick a project, then download in the format you need.</p>
        </div>

        {projects.length ? (
          <div className="workbench-exports-project-list">
            {projects.map((p) => (
              <article key={p.id} className="workbench-export-project-row">
                <div className="workbench-project-row__head">
                  <h3 className="workbench-project-row__title">{p.title}</h3>
                  <Link
                    className="workbench-button workbench-button-primary workbench-action-btn workbench-action-btn--primary"
                    href={`/my/workbench/projects/${p.id}`}
                  >
                    Open project
                  </Link>
                </div>
                <div className="workbench-export-actions">
                  <a
                    className="workbench-button workbench-button-secondary workbench-action-btn"
                    data-no-loader="true"
                    href={`/api/workbench/export?projectId=${p.id}&format=txt`}
                  >
                    Citations (.txt)
                  </a>
                  <a
                    className="workbench-button workbench-button-secondary workbench-action-btn"
                    data-no-loader="true"
                    href={`/api/workbench/export?projectId=${p.id}&format=md`}
                  >
                    Bibliography (.md)
                  </a>
                  <a
                    className="workbench-button workbench-button-secondary workbench-action-btn"
                    data-no-loader="true"
                    href={`/api/workbench/export?projectId=${p.id}&format=csv`}
                  >
                    CSV
                  </a>
                  <a
                    className="workbench-button workbench-button-secondary workbench-action-btn"
                    data-no-loader="true"
                    href={`/api/workbench/export?projectId=${p.id}&format=json`}
                  >
                    JSON
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="workbench-empty-state workbench-empty empty-state" role="status">
            Create a project to enable exports.
          </p>
        )}
      </section>
    </section>
  );
}
