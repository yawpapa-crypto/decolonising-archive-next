import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";
import { createClient } from "@/src/lib/supabase/server";

export default async function WorkbenchCollaboratorsPage() {
  const summary = await listWorkbenchProjectsSummary();
  const supabase = await createClient();
  const projects = summary.ok ? summary.projects : [];

  const collabLists = await Promise.all(
    projects.map(async (p) => {
      const { data } = await supabase
        .from("workbench_collaborators")
        .select("*")
        .eq("project_id", p.id)
        .order("created_at", { ascending: true });
      return { project: p, rows: data ?? [] };
    }),
  );

  return (
    <>
      <p className="workbench-kicker">Collaborators</p>
      <h1 className="workbench-page-title">Invitations & access</h1>
      <p className="workbench-lede">
        Collaborators are managed per project. Editors can change records and tasks;
        reviewers can update review states; viewers have read-only access.
      </p>
      {!summary.ok ? <p className="workbench-flag">{summary.error}</p> : null}
      <section className="workbench-panel">
        {collabLists.map(({ project, rows }) => (
          <div key={project.id} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>
              <Link className="workbench-link" href={`/my/workbench/projects/${project.id}`}>
                {project.title}
              </Link>
            </h2>
            {rows.length ? (
              <ul className="workbench-list">
                {rows.map((c: { id: string; invited_email: string | null; user_id: string | null; role: string }) => (
                  <li key={c.id}>
                    {c.invited_email ?? c.user_id ?? "—"} · {c.role}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: "#525252" }}>No collaborators recorded.</p>
            )}
          </div>
        ))}
        {!projects.length ? <p>Create a project to invite collaborators.</p> : null}
      </section>
    </>
  );
}
