import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";

export default async function WorkbenchExportsPage() {
  const { ok, error, projects } = await listWorkbenchProjectsSummary();

  return (
    <>
      <p className="workbench-kicker">Exports</p>
      <h1 className="workbench-page-title">Export citations & data</h1>
      <p className="workbench-lede">
        Plain text citations, markdown annotated bibliography, CSV, and JSON exports are
        generated per project from linked records and archive metadata.
      </p>
      {!ok ? <p className="workbench-flag">{error}</p> : null}
      <section className="workbench-panel">
        <h2>Choose a project</h2>
        <ul className="workbench-list">
          {projects.map((p) => (
            <li key={p.id}>
              <strong>{p.title}</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <a
                  className="workbench-link"
                  href={`/api/workbench/export?projectId=${p.id}&format=txt`}
                >
                  Citations (.txt)
                </a>
                <a
                  className="workbench-link"
                  href={`/api/workbench/export?projectId=${p.id}&format=md`}
                >
                  Bibliography (.md)
                </a>
                <a
                  className="workbench-link"
                  href={`/api/workbench/export?projectId=${p.id}&format=csv`}
                >
                  CSV
                </a>
                <a
                  className="workbench-link"
                  href={`/api/workbench/export?projectId=${p.id}&format=json`}
                >
                  JSON
                </a>
                <Link className="workbench-link" href={`/my/workbench/projects/${p.id}`}>
                  Open project
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {!projects.length ? <p>Create a project to enable exports.</p> : null}
      </section>
    </>
  );
}
