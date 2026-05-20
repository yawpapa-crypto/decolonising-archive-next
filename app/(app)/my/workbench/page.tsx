import WorkbenchOverviewClient, { type WorkbenchRecordOption } from "./WorkbenchOverviewClient";
import {
  listAllWorkbenchAnnotations,
  listAllWorkbenchCollaborators,
  listAllWorkbenchProjectRecords,
  listAllWorkbenchTasks,
  listWorkbenchProjects,
} from "@/lib/workbench-data";
import { getWorkbenchOverviewWorkspace, workspaceRecordTitle } from "@/src/lib/member-workspace";
import { createClient } from "@/src/lib/supabase/server";

type SearchParams = Promise<{ updated?: string; error?: string }>;

function addRecordOption(
  map: Map<string, WorkbenchRecordOption>,
  id: string | null | undefined,
  title: string | null | undefined,
) {
  if (!id || map.has(id)) return;
  map.set(id, { id, title: title || id });
}

export default async function WorkbenchOverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [projectsRes, tasksRes, projectRecordsRes, annotationsRes, collaboratorsRes, workspace] =
    await Promise.all([
      listWorkbenchProjects(),
      listAllWorkbenchTasks(300),
      listAllWorkbenchProjectRecords(300),
      listAllWorkbenchAnnotations(200),
      listAllWorkbenchCollaborators(200),
      getWorkbenchOverviewWorkspace(user?.id ?? null),
    ]);

  const errors = [
    sp.error,
    !projectsRes.ok ? projectsRes.error : "",
    !tasksRes.ok ? tasksRes.error : "",
    !projectRecordsRes.ok ? projectRecordsRes.error : "",
    !annotationsRes.ok ? annotationsRes.error : "",
    !collaboratorsRes.ok ? collaboratorsRes.error : "",
  ].filter(Boolean);

  const recordOptionMap = new Map<string, WorkbenchRecordOption>();
  workspace.bookmarks.forEach((bookmark) => {
    addRecordOption(
      recordOptionMap,
      bookmark.record_id,
      bookmark.record_title || workspaceRecordTitle(workspace.recordsById, bookmark.record_id),
    );
  });
  workspace.readingListItems.forEach((item) => {
    addRecordOption(
      recordOptionMap,
      item.record_id,
      item.record_title || workspaceRecordTitle(workspace.recordsById, item.record_id),
    );
  });
  if (tasksRes.ok) {
    tasksRes.tasks.forEach((task) => {
      task.linked_record_ids?.forEach((id) => {
        addRecordOption(recordOptionMap, id, workspaceRecordTitle(workspace.recordsById, id));
      });
    });
  }
  if (projectRecordsRes.ok) {
    projectRecordsRes.records.forEach((record) => {
      addRecordOption(recordOptionMap, record.record_id, workspaceRecordTitle(workspace.recordsById, record.record_id));
    });
  }

  return (
    <WorkbenchOverviewClient
      projects={projectsRes.ok ? projectsRes.projects : []}
      tasks={tasksRes.ok ? tasksRes.tasks : []}
      projectRecords={projectRecordsRes.ok ? projectRecordsRes.records : []}
      annotations={annotationsRes.ok ? annotationsRes.annotations : []}
      collaborators={collaboratorsRes.ok ? collaboratorsRes.collaborators : []}
      currentUserId={user?.id ?? null}
      recordOptions={Array.from(recordOptionMap.values())}
      savedRecordsCount={workspace.bookmarksCount}
      readingListsCount={workspace.readingListsCount}
      initialNotice={sp.updated}
      initialError={errors.join(" ")}
    />
  );
}
