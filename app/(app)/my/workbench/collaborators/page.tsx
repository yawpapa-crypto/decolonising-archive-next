import Link from "next/link";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";
import { createClient } from "@/src/lib/supabase/server";
import WorkbenchCollaboratorPanel from "../WorkbenchCollaboratorPanel";

export default async function WorkbenchCollaboratorsPage() {
  const summary = await listWorkbenchProjectsSummary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const editorProjectIds = new Set<string>();
  if (user?.id) {
    const { data: editorRows } = await supabase
      .from("workbench_collaborators")
      .select("project_id")
      .eq("user_id", user.id)
      .eq("role", "editor");
    for (const row of editorRows ?? []) {
      editorProjectIds.add((row as { project_id: string }).project_id);
    }
  }

  function canManageProject(projectId: string, ownerId: string) {
    if (!user?.id) return false;
    if (ownerId === user.id) return true;
    return editorProjectIds.has(projectId);
  }

  return (
    <section className="workbench-dashboard-page workbench-projects-page workbench-collaborators-page-clean">
      <header className="workbench-dashboard-header workbench-projects-header">
        <p className="workbench-projects-eyebrow">Collaborators</p>
        <div className="workbench-projects-header-row">
          <div>
            <h1>Invitations & access</h1>
            <p>
              Collaborators are managed per project. Editors can change records and
              tasks; reviewers can update review states; viewers have read-only
              access.
            </p>
          </div>
        </div>
      </header>

      {!summary.ok ? <p className="workbench-flag">{summary.error}</p> : null}

      <section className="workbench-panel workbench-collaborators-access-card">
        <header className="workbench-collaborators-card-header">
          <h2>Project access</h2>
        </header>

        {collabLists.length ? (
          <div className="workbench-collaborators-project-list">
            {collabLists.map(({ project, rows }) => (
              <article key={project.id} className="workbench-collab-project-access-row">
                <div className="workbench-project-row__head">
                  <h3 className="workbench-project-row__title">
                    <Link href={`/my/workbench/projects/${project.id}`}>
                      {project.title}
                    </Link>
                  </h3>
                  <Link
                    className="workbench-button workbench-button-secondary"
                    href={`/my/workbench/projects/${project.id}`}
                  >
                    Open project
                  </Link>
                </div>
                <WorkbenchCollaboratorPanel
                  projectId={project.id}
                  collaborators={rows}
                  canManage={canManageProject(project.id, project.owner_id)}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="workbench-empty-state workbench-board-empty" role="status">
            Create a project to invite collaborators.
          </p>
        )}
      </section>
    </section>
  );
}
