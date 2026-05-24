import "@/app/styles/workbench-collaborators.css";
import { listWorkbenchProjectsSummary } from "@/lib/workbench-data";
import { createClient } from "@/src/lib/supabase/server";
import CollaboratorsPageClient from "./CollaboratorsPageClient";

export default async function WorkbenchCollaboratorsPage() {
  const summary = await listWorkbenchProjectsSummary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const projects = summary.ok ? summary.projects : [];

  const collabLists = await Promise.all(
    projects.map(async (project) => {
      const { data } = await supabase
        .from("workbench_collaborators")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true });
      return { project, rows: data ?? [] };
    }),
  );

  function canManageProject(_projectId: string, ownerId: string) {
    if (!user?.id) return false;
    return ownerId === user.id;
  }

  return (
    <CollaboratorsPageClient
      error={summary.ok ? undefined : summary.error}
      projects={collabLists.map(({ project, rows }) => ({
        id: project.id,
        title: project.title,
        owner_id: project.owner_id,
        updated_at: project.updated_at,
        record_count: project.record_count,
        collaborators: rows,
        canManage: canManageProject(project.id, project.owner_id),
      }))}
    />
  );
}
