import Link from "next/link";
import { readRecords } from "@/lib/records";
import { getWorkbenchProjectBundle, snapshotRecordRights } from "@/lib/workbench-data";
import { getMemberWorkspaceData } from "@/src/lib/member-workspace";
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
  const bundle = await getWorkbenchProjectBundle(projectId);
  const { readingLists } = await getMemberWorkspaceData(`/my/workbench/projects/${projectId}`);

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
  const published = (await readRecords()).filter((r) => r.published);
  const archiveById: WorkbenchArchiveLite[] = published.map((r) => ({
    id: r.id,
    title: r.title,
    creator: r.creator ?? "",
    source: r.source ?? "",
    snapshot: snapshotRecordRights(r),
  }));

  return (
    <>
      <nav>
        <Link href="/my/workbench/projects" className="workbench-link">
          ← All projects
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
        readingLists={readingLists}
        archiveById={archiveById}
        flashUpdated={sp.updated}
        flashError={sp.error}
      />
    </>
  );
}
