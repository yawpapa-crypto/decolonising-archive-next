import Link from "next/link";
import { listAllWorkbenchTasks } from "@/lib/workbench-data";
import { TASK_STATUS_LABEL, TASK_PRIORITY_LABEL } from "@/lib/workbench-types";

type SearchParams = Promise<{ updated?: string; error?: string }>;

export default async function WorkbenchTasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { ok, error, tasks } = await listAllWorkbenchTasks(120);

  return (
    <>
      <p className="workbench-kicker">Tasks</p>
      <h1 className="workbench-page-title">All tasks</h1>
      <p className="workbench-lede">
        Tasks linked to projects and archive records. Due dates surface on the overview.
      </p>
      {sp.updated ? <p className="workbench-flash">{sp.updated}</p> : null}
      {sp.error ? <p className="workbench-flash is-error">{sp.error}</p> : null}
      {!ok ? <p className="workbench-flag">{error}</p> : null}
      <section className="workbench-panel">
        <ul className="workbench-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link className="workbench-link" href={`/my/workbench/projects/${t.project_id}`}>
                {t.title}
              </Link>
              <div style={{ fontSize: 12, color: "#525252", marginTop: 4 }}>
                {t.project_title} · {TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL]} ·{" "}
                {TASK_PRIORITY_LABEL[t.priority as keyof typeof TASK_PRIORITY_LABEL]}
                {t.due_date ? ` · due ${t.due_date}` : ""}
              </div>
            </li>
          ))}
        </ul>
        {!tasks.length ? <p>No tasks yet.</p> : null}
      </section>
    </>
  );
}
