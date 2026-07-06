import { getMemberReadingLists } from "@/src/lib/member-workspace";
import { readRecords } from "@/lib/records";
import { getWorkbenchProjectBundle, snapshotRecordRights } from "@/lib/workbench-data";
import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import ProjectWorkbenchClient, { type WorkbenchArchiveLite } from "./ProjectWorkbenchClient";

type SearchParams = Promise<{ updated?: string; error?: string; view?: string }>;

export default async function ProjectWorkbenchDetail({
  projectId,
  searchParams,
}: {
  projectId: string;
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [bundle, readingLists, publishedRecords] = await Promise.all([
    getWorkbenchProjectBundle(projectId),
    getMemberReadingLists(user?.id ?? null),
    readRecords().then((records) => records.filter((record) => record.published)),
  ]);

  if (!bundle.ok || !bundle.project) {
    return (
      <section className="workbench-panel">
        <div className="workbench-empty" role="status">
          <strong>No project selected</strong>
          {bundle.error ?? "This project could not be loaded. It may have been removed or you may not have access."}
        </div>
        <Link href="/my/workbench/projects" className="workbench-link">
          ← All projects
        </Link>
      </section>
    );
  }

  const { project, records, tasks, milestones, annotations, collaborators } = bundle;
  const canManageCollaborators =
    Boolean(user?.id) &&
    (project.owner_id === user?.id ||
      collaborators.some((c) => c.user_id === user?.id && c.role === "editor"));

  const archiveById: WorkbenchArchiveLite[] = publishedRecords.map((r) => ({
    id: r.id,
    title: r.title,
    creator: r.creator ?? "",
    source: r.source ?? "",
    snapshot: snapshotRecordRights(r),
  }));

  return (
    <>
      <nav className="workbench-breadcrumb workbench-project-breadcrumb">
        <Link href="/my/workbench/projects" className="workbench-link">
          Back to all projects
        </Link>
      </nav>
      <ProjectWorkbenchClient
        projectId={projectId}
        project={project}
        records={records}
        tasks={tasks}
        milestones={milestones}
        annotations={annotations}
        collaborators={collaborators}
        canManageCollaborators={canManageCollaborators}
        readingLists={readingLists.map((list) => ({ id: list.id, title: list.title }))}
        archiveById={archiveById}
        flashUpdated={sp.updated}
        flashError={sp.error}
      />
    </>
  );
}
