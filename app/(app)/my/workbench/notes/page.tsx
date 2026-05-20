import dynamic from "next/dynamic";
import {
  listWorkbenchCitationSources,
  listWorkbenchLinkableRecords,
  listWorkbenchNoteRecordsForNotes,
  listWorkbenchNotes,
  listWorkbenchProjects,
} from "@/lib/workbench-data";
import { createClient } from "@/src/lib/supabase/server";
import WorkbenchNotesLoading from "./WorkbenchNotesLoading";

const WorkbenchNotesClient = dynamic(() => import("./WorkbenchNotesClient"), {
  loading: () => <WorkbenchNotesLoading />,
});

export default async function WorkbenchNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [notesRes, projectsRes, linkableRes, citationSourcesRes, editorRowsRes] = await Promise.all([
    listWorkbenchNotes({ limit: 200 }),
    listWorkbenchProjects(),
    listWorkbenchLinkableRecords(),
    listWorkbenchCitationSources(),
    user?.id
      ? supabase
          .from("workbench_collaborators")
          .select("project_id")
          .eq("user_id", user.id)
          .eq("role", "editor")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const notes = notesRes.ok ? notesRes.notes : [];
  const noteIds = notes.map((n) => n.id);
  const linksRes = noteIds.length
    ? await listWorkbenchNoteRecordsForNotes(noteIds)
    : { ok: true as const, links: [] };

  const noteRecordIdsByNote: Record<string, string[]> = {};
  if (linksRes.ok) {
    for (const link of linksRes.links) {
      if (!noteRecordIdsByNote[link.note_id]) {
        noteRecordIdsByNote[link.note_id] = [];
      }
      noteRecordIdsByNote[link.note_id].push(link.record_id);
    }
  }

  const projects = projectsRes.ok ? projectsRes.projects : [];
  const ownerProjectIds = projects.filter((p) => p.owner_id === user?.id).map((p) => p.id);

  const editorProjectIds: string[] = [];
  for (const row of editorRowsRes.data ?? []) {
    editorProjectIds.push((row as { project_id: string }).project_id);
  }

  return (
    <section className="workbench-projects-page workbench-notes-page workbench-notes-page-premium">
      <WorkbenchNotesClient
        notes={notes}
        projects={projects}
        linkableRecords={linkableRes.ok ? linkableRes.records : []}
        citationSources={citationSourcesRes.ok ? citationSourcesRes.sources : []}
        noteRecordIdsByNote={noteRecordIdsByNote}
        currentUserId={user?.id ?? null}
        ownerProjectIds={ownerProjectIds}
        editorProjectIds={editorProjectIds}
        initialError={
          !notesRes.ok
            ? notesRes.error
            : !linkableRes.ok
              ? linkableRes.error
              : !citationSourcesRes.ok
                ? citationSourcesRes.error
              : undefined
        }
      />
    </section>
  );
}
