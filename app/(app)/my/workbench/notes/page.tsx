import {
  listWorkbenchCitationSources,
  listWorkbenchLinkableRecords,
  listWorkbenchNoteRecordsForNotes,
  listWorkbenchNotes,
  listWorkbenchProjects,
} from "@/lib/workbench-data";
import { acceptPendingWorkbenchInvites } from "@/lib/workbench-collaborator-actions";
import { isActiveCollaboratorStatus } from "@/lib/workbench-collaboration";
import { getWorkbenchUserPreferences } from "@/lib/workbench-activity-actions";
import { createClient, getAuthenticatedUser } from "@/src/lib/supabase/server";
import WorkbenchNotesClientEntry from "./WorkbenchNotesClientEntry";

export default async function WorkbenchNotesPage() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (user?.id) {
    await acceptPendingWorkbenchInvites();
  }

  const userEmail = user?.email?.trim().toLowerCase() ?? "";

  const [notesRes, projectsRes, linkableRes, citationSourcesRes, membershipByUserRes, membershipByEmailRes] =
    await Promise.all([
      listWorkbenchNotes({ limit: 200 }),
      listWorkbenchProjects(),
      listWorkbenchLinkableRecords(),
      listWorkbenchCitationSources(),
      user?.id
        ? supabase.from("workbench_collaborators").select("project_id, role, status").eq("user_id", user.id)
        : Promise.resolve({ data: [], error: null }),
      userEmail
        ? supabase
            .from("workbench_collaborators")
            .select("project_id, role, status")
            .ilike("invited_email", userEmail)
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
  const viewerProjectIds: string[] = [];
  const seen = new Set<string>();

  for (const row of [...(membershipByUserRes.data ?? []), ...(membershipByEmailRes.data ?? [])]) {
    const membership = row as { project_id: string; role: string; status?: string | null };
    if (!isActiveCollaboratorStatus(membership.status)) continue;
    if (seen.has(membership.project_id)) continue;
    seen.add(membership.project_id);
    if (membership.role === "editor") {
      editorProjectIds.push(membership.project_id);
    } else if (membership.role === "viewer" || membership.role === "reviewer") {
      viewerProjectIds.push(membership.project_id);
    }
  }

  const userPreferences = user?.id ? await getWorkbenchUserPreferences() : null;

  let currentUserDisplayName: string | null = user?.email ?? null;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      const row = profile as { full_name?: string | null; email?: string | null };
      currentUserDisplayName = row.full_name?.trim() || row.email?.trim() || currentUserDisplayName;
    }
  }

  return (
    <section className="workbench-projects-page workbench-notes-page workbench-notes-page-premium">
      <WorkbenchNotesClientEntry
        notes={notes}
        projects={projects}
        linkableRecords={linkableRes.ok ? linkableRes.records : []}
        citationSources={citationSourcesRes.ok ? citationSourcesRes.sources : []}
        noteRecordIdsByNote={noteRecordIdsByNote}
        currentUserId={user?.id ?? null}
        currentUserDisplayName={currentUserDisplayName}
        ownerProjectIds={ownerProjectIds}
        editorProjectIds={editorProjectIds}
        viewerProjectIds={viewerProjectIds}
        initialPreferredNoteMode={userPreferences?.preferred_note_mode ?? null}
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
