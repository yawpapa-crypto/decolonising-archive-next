import Link from "next/link";
import { listAllWorkbenchAnnotations } from "@/lib/workbench-data";

export default async function WorkbenchNotesPage() {
  const { ok, error, annotations } = await listAllWorkbenchAnnotations(80);

  return (
    <>
      <p className="workbench-kicker">Notes</p>
      <h1 className="workbench-page-title">Project annotations</h1>
      <p className="workbench-lede">
        Research notes attached to archive records inside projects.
      </p>
      {!ok ? <p className="workbench-flag">{error}</p> : null}
      <section className="workbench-panel">
        <ul className="workbench-list">
          {annotations.map((a) => (
            <li key={a.id}>
              <div style={{ fontSize: 14 }}>{a.note}</div>
              <div style={{ fontSize: 12, color: "#525252", marginTop: 6 }}>
                <Link className="workbench-link" href={`/my/workbench/projects/${a.project_id}`}>
                  {a.project_title}
                </Link>
                {" · "}
                {a.record_title}
                {(a.tags ?? []).length ? ` · ${(a.tags ?? []).join(", ")}` : ""}
              </div>
            </li>
          ))}
        </ul>
        {!annotations.length ? <p>No annotations yet.</p> : null}
      </section>
    </>
  );
}
