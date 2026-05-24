"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import type { WorkbenchNoteRow } from "@/lib/workbench-data";
import {
  WORKBENCH_CANVAS_LOCK_TTL_MS,
  WORKBENCH_NOTE_VERSION_LIMIT,
  type WorkbenchCanvasObjectLockRow,
  type WorkbenchNoteVersionRow,
  type WorkbenchProjectCommentRow,
} from "@/lib/workbench-project-collaboration";

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

async function displayNameForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const row = data as { full_name?: string | null; email?: string | null };
  return row.full_name?.trim() || row.email?.trim() || null;
}

export async function logWorkbenchProjectActivity(input: {
  projectId: string;
  noteId?: string | null;
  action: string;
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) return { ok: false };

    const { error: insertError } = await supabase.from("workbench_project_activity").insert({
      project_id: input.projectId,
      user_id: user.id,
      note_id: input.noteId ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });

    return { ok: !insertError };
  } catch {
    return { ok: false };
  }
}

export async function snapshotWorkbenchNoteVersion(note: WorkbenchNoteRow, savedBy: string) {
  if (!note.project_id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("workbench_note_versions").insert({
    note_id: note.id,
    project_id: note.project_id,
    saved_by: savedBy,
    title: note.title,
    content_html: note.content_html,
    content_json: note.content_json,
    plain_text: note.plain_text,
    word_count: note.word_count,
    character_count: note.character_count,
  });

  if (error) return;

  const { data: rows } = await supabase
    .from("workbench_note_versions")
    .select("id")
    .eq("note_id", note.id)
    .order("created_at", { ascending: false });

  const ids = (rows ?? []).map((r) => (r as { id: string }).id);
  if (ids.length <= WORKBENCH_NOTE_VERSION_LIMIT) return;

  const stale = ids.slice(WORKBENCH_NOTE_VERSION_LIMIT);
  if (stale.length) {
    await supabase.from("workbench_note_versions").delete().in("id", stale);
  }
}

export async function listWorkbenchNoteVersions(noteId: string): Promise<{
  ok: boolean;
  error?: string;
  versions?: WorkbenchNoteVersionRow[];
}> {
  const id = noteId?.trim();
  if (!id) return { ok: false, error: "Missing note." };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false, error: error ?? "Sign in required." };

  const { data: note } = await supabase
    .from("workbench_notes")
    .select("id, project_id, user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!note) return { ok: false, error: "Note not found." };

  const { data, error: listError } = await supabase
    .from("workbench_note_versions")
    .select("*")
    .eq("note_id", id)
    .order("created_at", { ascending: false })
    .limit(WORKBENCH_NOTE_VERSION_LIMIT);

  if (listError) return { ok: false, error: listError.message };
  return { ok: true, versions: (data ?? []) as WorkbenchNoteVersionRow[] };
}

export async function restoreWorkbenchNoteVersion(input: {
  noteId: string;
  versionId: string;
}): Promise<{ ok: boolean; error?: string; note?: WorkbenchNoteRow }> {
  const noteId = input.noteId?.trim();
  const versionId = input.versionId?.trim();
  if (!noteId || !versionId) return { ok: false, error: "Missing note or version." };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false, error: error ?? "Sign in required." };

  const { data: version, error: versionError } = await supabase
    .from("workbench_note_versions")
    .select("*")
    .eq("id", versionId)
    .eq("note_id", noteId)
    .maybeSingle();

  if (versionError || !version) {
    return { ok: false, error: versionError?.message ?? "Version not found." };
  }

  const row = version as WorkbenchNoteVersionRow;

  const { data: current } = await supabase
    .from("workbench_notes")
    .select("*")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (current) {
    await snapshotWorkbenchNoteVersion(current as WorkbenchNoteRow, user.id);
  }

  const { data: note, error: updateError } = await supabase
    .from("workbench_notes")
    .update({
      title: row.title,
      content_html: row.content_html,
      content_json: row.content_json,
      plain_text: row.plain_text,
      word_count: row.word_count,
      character_count: row.character_count,
    })
    .eq("id", noteId)
    .select("*")
    .single();

  if (updateError) return { ok: false, error: updateError.message };

  const restored = note as WorkbenchNoteRow;
  if (restored.project_id) {
    void logWorkbenchProjectActivity({
      projectId: restored.project_id,
      noteId: restored.id,
      action: "restored_version",
      summary: `restored a previous version${row.title ? `: ${row.title}` : ""}`,
      targetType: "note_version",
      targetId: versionId,
    });
  }

  revalidatePath(NOTES_PATH);
  return { ok: true, note: restored };
}

export async function acquireWorkbenchCanvasObjectLock(input: {
  noteId: string;
  objectId: string;
}): Promise<{ ok: boolean; error?: string; lock?: WorkbenchCanvasObjectLockRow }> {
  const noteId = input.noteId?.trim();
  const objectId = input.objectId?.trim();
  if (!noteId || !objectId) return { ok: false, error: "Missing lock target." };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false, error: error ?? "Sign in required." };

  const now = Date.now();
  const expiresAt = new Date(now + WORKBENCH_CANVAS_LOCK_TTL_MS).toISOString();
  const displayName = await displayNameForUser(supabase, user.id);

  const { data: existing } = await supabase
    .from("workbench_canvas_object_locks")
    .select("*")
    .eq("note_id", noteId)
    .eq("object_id", objectId)
    .maybeSingle();

  if (existing) {
    const lock = existing as WorkbenchCanvasObjectLockRow;
    const active = Date.parse(lock.expires_at) > now;
    if (active && lock.user_id !== user.id) {
      return { ok: false, error: "Object is being edited by someone else." };
    }
    if (active && lock.user_id === user.id) {
      return { ok: true, lock };
    }
  }

  const { data, error: upsertError } = await supabase
    .from("workbench_canvas_object_locks")
    .upsert(
      {
        note_id: noteId,
        object_id: objectId,
        user_id: user.id,
        display_name: displayName,
        locked_at: new Date(now).toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "note_id,object_id" },
    )
    .select("*")
    .single();

  if (upsertError) return { ok: false, error: upsertError.message };
  return { ok: true, lock: data as WorkbenchCanvasObjectLockRow };
}

export async function releaseWorkbenchCanvasObjectLock(input: {
  noteId: string;
  objectId: string;
}): Promise<{ ok: boolean }> {
  const noteId = input.noteId?.trim();
  const objectId = input.objectId?.trim();
  if (!noteId || !objectId) return { ok: false };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false };

  await supabase
    .from("workbench_canvas_object_locks")
    .delete()
    .eq("note_id", noteId)
    .eq("object_id", objectId)
    .eq("user_id", user.id);

  return { ok: true };
}

export async function listWorkbenchProjectComments(projectId: string): Promise<{
  ok: boolean;
  error?: string;
  comments?: WorkbenchProjectCommentRow[];
}> {
  const id = projectId?.trim();
  if (!id) return { ok: false, error: "Missing project." };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false, error: error ?? "Sign in required." };

  const { data, error: listError } = await supabase
    .from("workbench_project_comments")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (listError) return { ok: false, error: listError.message };
  return { ok: true, comments: (data ?? []) as WorkbenchProjectCommentRow[] };
}

export async function addWorkbenchProjectComment(input: {
  projectId: string;
  noteId?: string | null;
  body: string;
  anchorType?: string | null;
  anchorId?: string | null;
}): Promise<{ ok: boolean; error?: string; comment?: WorkbenchProjectCommentRow }> {
  const projectId = input.projectId?.trim();
  const body = input.body?.trim();
  if (!projectId || !body) return { ok: false, error: "Comment cannot be empty." };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false, error: error ?? "Sign in required." };

  const { data, error: insertError } = await supabase
    .from("workbench_project_comments")
    .insert({
      project_id: projectId,
      note_id: input.noteId ?? null,
      user_id: user.id,
      body,
      anchor_type: input.anchorType ?? null,
      anchor_id: input.anchorId ?? null,
    })
    .select("*")
    .single();

  if (insertError) return { ok: false, error: insertError.message };

  void logWorkbenchProjectActivity({
    projectId,
    noteId: input.noteId ?? null,
    action: "comment_added",
    summary: "added a comment",
    targetType: "comment",
    targetId: (data as WorkbenchProjectCommentRow).id,
  });

  return { ok: true, comment: data as WorkbenchProjectCommentRow };
}

export async function fetchWorkbenchNoteRow(noteId: string): Promise<{
  ok: boolean;
  error?: string;
  note?: WorkbenchNoteRow;
}> {
  const id = noteId?.trim();
  if (!id) return { ok: false, error: "Missing note." };

  const { supabase, user, error } = await getAuthedSupabase();
  if (error || !user) return { ok: false, error: error ?? "Sign in required." };

  const { data, error: fetchError } = await supabase
    .from("workbench_notes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!data) return { ok: false, error: "Note not found." };
  return { ok: true, note: data as WorkbenchNoteRow };
}
