"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/src/lib/auth";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import { createClient } from "@/src/lib/supabase/server";
import type { WorkbenchNoteRecordLinkRow, WorkbenchNoteRow } from "@/lib/workbench-data";
import {
  type WorkbenchNoteStatus,
  normalizeNoteStatus,
} from "@/lib/workbench-note-status";
import { htmlToPlainText, normalizeNoteTitle, noteMetricsFromEditor } from "@/lib/workbench-note-utils";

const WB = "/my/workbench";
const NOTES_PATH = `${WB}/notes`;

async function getAuthedSupabase() {
  await requireMember(WB);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Sign in required." as const };
  return { supabase, user, error: null as null };
}

async function assertCanEditNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteId: string,
  userId: string,
): Promise<{ ok: true; note: WorkbenchNoteRow } | { ok: false; error: string }> {
  const { data: note, error } = await supabase
    .from("workbench_notes")
    .select("*")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!note) return { ok: false, error: "Note not found." };

  const row = note as WorkbenchNoteRow;
  if (row.user_id === userId) return { ok: true, note: row };

  if (!row.project_id) {
    return { ok: false, error: "You do not have permission to edit this note." };
  }

  const { data: project } = await supabase
    .from("workbench_projects")
    .select("owner_id")
    .eq("id", row.project_id)
    .maybeSingle();

  if (project?.owner_id === userId) return { ok: true, note: row };

  const { data: membership } = await supabase
    .from("workbench_collaborators")
    .select("role")
    .eq("project_id", row.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership?.role === "editor") return { ok: true, note: row };

  return { ok: false, error: "You do not have permission to edit this note." };
}

async function assertCanReadNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteId: string,
  userId: string,
): Promise<{ ok: true; note: WorkbenchNoteRow } | { ok: false; error: string }> {
  const { data: note, error } = await supabase
    .from("workbench_notes")
    .select("*")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!note) return { ok: false, error: "Note not found." };

  const row = note as WorkbenchNoteRow;
  if (row.user_id === userId) return { ok: true, note: row };

  if (!row.project_id) {
    return { ok: false, error: "You do not have permission to view this note." };
  }

  const { data: project } = await supabase
    .from("workbench_projects")
    .select("id")
    .eq("id", row.project_id)
    .maybeSingle();

  if (!project) return { ok: false, error: "You do not have permission to view this note." };
  return { ok: true, note: row };
}

async function assertCanReadProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("workbench_projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Project not found or access denied." };
  return { ok: true };
}

function revalidateNotePaths(note: WorkbenchNoteRow, previousProjectId?: string | null) {
  revalidatePath(NOTES_PATH);
  if (previousProjectId) revalidatePath(`${WB}/projects/${previousProjectId}`);
  if (note.project_id) revalidatePath(`${WB}/projects/${note.project_id}`);
}

export async function createWorkbenchNote(input: {
  projectId?: string | null;
  title?: string;
  contentHtml?: string;
  contentJson?: Record<string, unknown> | null;
  status?: WorkbenchNoteStatus;
}): Promise<{ ok: boolean; error?: string; note?: WorkbenchNoteRow }> {
  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const projectId = input.projectId?.trim() || null;
  if (projectId) {
    const access = await assertCanReadProject(supabase, projectId);
    if (!access.ok) return { ok: false, error: access.error };
  }

  const title = normalizeNoteTitle(input.title ?? "");
  const contentHtml = input.contentHtml ?? "<p></p>";
  const plain = htmlToPlainText(contentHtml);
  const metrics = noteMetricsFromEditor(plain);

  const { data: note, error } = await supabase
    .from("workbench_notes")
    .insert({
      project_id: projectId,
      user_id: user.id,
      title,
      content_html: contentHtml,
      content_json: input.contentJson ?? { type: "doc", content: [{ type: "paragraph" }] },
      plain_text: metrics.plain_text,
      word_count: metrics.word_count,
      character_count: metrics.character_count,
      status: normalizeNoteStatus(input.status),
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  void trackWorkbenchActivity({
    eventType: "note_created",
    entityType: "note",
    entityId: (note as WorkbenchNoteRow).id,
    projectId,
  });

  revalidateNotePaths(note as WorkbenchNoteRow);
  return { ok: true, note: note as WorkbenchNoteRow };
}

export async function updateWorkbenchNote(input: {
  noteId: string;
  title?: string;
  contentHtml?: string;
  contentJson?: Record<string, unknown> | null;
  plainText?: string;
  wordCount?: number;
  characterCount?: number;
  projectId?: string | null;
  status?: WorkbenchNoteStatus;
}): Promise<{ ok: boolean; error?: string; note?: WorkbenchNoteRow }> {
  const noteId = input.noteId?.trim();
  if (!noteId) return { ok: false, error: "Missing note." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanEditNote(supabase, noteId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) {
    patch.title = normalizeNoteTitle(input.title);
  }
  if (input.contentHtml !== undefined) patch.content_html = input.contentHtml;
  if (input.contentJson !== undefined) patch.content_json = input.contentJson;
  if (input.status !== undefined) patch.status = normalizeNoteStatus(input.status);

  if (input.plainText !== undefined) {
    const metrics = noteMetricsFromEditor(input.plainText);
    patch.plain_text = metrics.plain_text;
    patch.word_count = input.wordCount ?? metrics.word_count;
    patch.character_count = input.characterCount ?? metrics.character_count;
  } else if (input.contentHtml !== undefined) {
    const plain = htmlToPlainText(input.contentHtml);
    const metrics = noteMetricsFromEditor(plain);
    patch.plain_text = metrics.plain_text;
    patch.word_count = input.wordCount ?? metrics.word_count;
    patch.character_count = input.characterCount ?? metrics.character_count;
  }

  if (input.projectId !== undefined) {
    const nextProjectId = input.projectId?.trim() || null;
    if (nextProjectId) {
      const access = await assertCanReadProject(supabase, nextProjectId);
      if (!access.ok) return { ok: false, error: access.error };
    }
    patch.project_id = nextProjectId;
  }

  if (!Object.keys(patch).length) {
    return { ok: true, note: permission.note };
  }

  const { data: note, error } = await supabase
    .from("workbench_notes")
    .update(patch)
    .eq("id", noteId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  void trackWorkbenchActivity({
    eventType: "note_updated",
    entityType: "note",
    entityId: noteId,
    projectId: (note as WorkbenchNoteRow).project_id,
  });

  revalidateNotePaths(note as WorkbenchNoteRow, permission.note.project_id);
  return { ok: true, note: note as WorkbenchNoteRow };
}

export async function toggleWorkbenchNotePinned(input: {
  noteId: string;
  pinned: boolean;
}): Promise<{ ok: boolean; error?: string; note?: WorkbenchNoteRow }> {
  const noteId = input.noteId?.trim();
  if (!noteId) return { ok: false, error: "Missing note." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanEditNote(supabase, noteId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { data: note, error } = await supabase
    .from("workbench_notes")
    .update({ pinned: Boolean(input.pinned) })
    .eq("id", noteId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateNotePaths(note as WorkbenchNoteRow, permission.note.project_id);
  return { ok: true, note: note as WorkbenchNoteRow };
}

export async function deleteWorkbenchNote(input: {
  noteId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const noteId = input.noteId?.trim();
  if (!noteId) return { ok: false, error: "Missing note." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanEditNote(supabase, noteId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { error } = await supabase
    .from("workbench_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) return { ok: false, error: error.message };

  revalidateNotePaths(permission.note);
  return { ok: true };
}

export async function linkNoteRecord(input: {
  noteId: string;
  recordId: string;
}): Promise<{ ok: boolean; error?: string; link?: WorkbenchNoteRecordLinkRow }> {
  const noteId = input.noteId?.trim();
  const recordId = input.recordId?.trim();
  if (!noteId || !recordId) return { ok: false, error: "Missing note or record." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanEditNote(supabase, noteId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { data: link, error } = await supabase
    .from("workbench_note_records")
    .upsert({ note_id: noteId, record_id: recordId }, { onConflict: "note_id,record_id" })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(NOTES_PATH);
  return { ok: true, link: link as WorkbenchNoteRecordLinkRow };
}

export async function unlinkNoteRecord(input: {
  noteId: string;
  recordId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const noteId = input.noteId?.trim();
  const recordId = input.recordId?.trim();
  if (!noteId || !recordId) return { ok: false, error: "Missing note or record." };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required." };

  const permission = await assertCanEditNote(supabase, noteId, user.id);
  if (!permission.ok) return { ok: false, error: permission.error };

  const { error } = await supabase
    .from("workbench_note_records")
    .delete()
    .eq("note_id", noteId)
    .eq("record_id", recordId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(NOTES_PATH);
  return { ok: true };
}

export async function listNoteLinkedRecords(noteId: string): Promise<{
  ok: boolean;
  error?: string;
  links: WorkbenchNoteRecordLinkRow[];
}> {
  const id = noteId?.trim();
  if (!id) return { ok: false, error: "Missing note.", links: [] };

  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required.", links: [] };

  const permission = await assertCanReadNote(supabase, id, user.id);
  if (!permission.ok) return { ok: false, error: permission.error, links: [] };

  const { data, error } = await supabase
    .from("workbench_note_records")
    .select("*")
    .eq("note_id", id)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message, links: [] };
  return { ok: true, links: (data ?? []) as WorkbenchNoteRecordLinkRow[] };
}

export async function listWorkbenchNotesAction(options?: {
  projectId?: string;
}): Promise<{ ok: boolean; error?: string; notes: WorkbenchNoteRow[] }> {
  const { supabase, user, error: authError } = await getAuthedSupabase();
  if (authError || !user) return { ok: false, error: authError ?? "Sign in required.", notes: [] };

  let query = supabase
    .from("workbench_notes")
    .select("*")
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, notes: [] };
  return { ok: true, notes: (data ?? []) as WorkbenchNoteRow[] };
}

export async function getWorkbenchNoteAction(noteId: string): Promise<{
  ok: boolean;
  error?: string;
  note: WorkbenchNoteRow | null;
}> {
  const id = noteId?.trim();
  if (!id) return { ok: false, error: "Missing note.", note: null };

  const { supabase, error: authError } = await getAuthedSupabase();
  if (authError) return { ok: false, error: authError, note: null };

  const { data, error } = await supabase
    .from("workbench_notes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, note: null };
  if (!data) return { ok: true, note: null };
  return { ok: true, note: data as WorkbenchNoteRow };
}
