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
