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
    <section className="workbench-projects-page">
      <header className="workbench-tasks-header workbench-tasks-header--fixed">
        <div className="workbench-tasks-heading-block">
          <p className="workbench-tasks-eyebrow">Tasks</p>
          <h1>All tasks</h1>
          <p>
            Tasks linked to projects and archive records. Due dates surface on
            the overview.
          </p>
        </div>

        <a
          href="/my/workbench"
          className="workbench-button workbench-button-primary workbench-tasks-new-button"
        >
          Create task
        </a>
      </header>

      {sp.updated ? <p className="workbench-flash">{sp.updated}</p> : null}
      {sp.error ? <p className="workbench-flash is-error">{sp.error}</p> : null}
      {!ok ? <p className="workbench-flag">{error}</p> : null}

      <section className="workbench-project-list-card">
        <div className="workbench-project-list-header">
          <h2>Recent tasks</h2>
          <p>Open a project to edit, reassign or close tasks.</p>
        </div>

        {tasks.length ? (
          <ul className="workbench-list">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link className="workbench-link" href={`/my/workbench/projects/${t.project_id}`}>
                  {t.title}
                </Link>
                <div style={{ fontSize: 12, color: "#667085", marginTop: 4 }}>
                  {t.project_title} ·{" "}
                  {TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL]} ·{" "}
                  {TASK_PRIORITY_LABEL[t.priority as keyof typeof TASK_PRIORITY_LABEL]}
                  {t.due_date ? ` · due ${t.due_date}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="workbench-empty empty-state" role="status">
            No tasks yet.
          </p>
        )}
      </section>
    </section>
  );
}
