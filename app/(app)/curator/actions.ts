"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurator } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

export type CuratorActionResult =
  | { ok: true }
  | { ok: false; error: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(message: string): never {
  redirect(`/curator?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/curator?updated=${encodeURIComponent(message)}`);
}

export async function createDossier(formData: FormData) {
  const profile = await requireCurator();
  const title = text(formData, "title");
  const summary = text(formData, "summary");
  const body = text(formData, "body");
  const status = text(formData, "status") || "draft";

  if (!title) fail("Dossier title is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("curator_dossiers").insert({
    curator_id: profile.id,
    title,
    summary: summary || null,
    body: body || null,
    status,
  });

  if (error) fail(error.message);
  revalidatePath("/curator");
  done("Dossier created.");
}

export async function createArchiveNote(formData: FormData) {
  const profile = await requireCurator();
  const title = text(formData, "title");
  const note = text(formData, "note");
  const recordId = text(formData, "record_id");
  const noteType = text(formData, "note_type") || "context";
  const status = text(formData, "status") || "draft";

  if (!title || !note) fail("Archive note needs a title and note text.");

  const supabase = await createClient();
  const { error } = await supabase.from("archive_notes").insert({
    curator_id: profile.id,
    record_id: recordId || null,
    title,
    note,
    note_type: noteType,
    status,
  });

  if (error) fail(error.message);
  revalidatePath("/curator");
  done("Archive note saved.");
}

export async function featureRecord(formData: FormData) {
  const profile = await requireCurator();
  const recordId = text(formData, "record_id");
  const placement = text(formData, "placement") || "homepage";
  const reason = text(formData, "reason");
  const editorialStatus = text(formData, "editorial_status") || "active";
  const isActive = editorialStatus === "active";

  if (!recordId) fail("Choose a record to feature.");

  const supabase = await createClient();
  const { error } = await supabase.from("featured_records").upsert(
    {
      curator_id: profile.id,
      record_id: recordId,
      placement,
      reason: reason || null,
      is_active: isActive,
      editorial_status: editorialStatus,
    },
    { onConflict: "record_id,placement" }
  );

  if (error) fail(error.message);
  revalidatePath("/curator");
  done("Featured record updated.");
}

export async function createPathway(formData: FormData) {
  const profile = await requireCurator();
  const title = text(formData, "title");
  const theme = text(formData, "theme");
  const description = text(formData, "description");
  const status = text(formData, "status") || "draft";

  if (!title || !theme) fail("Pathway title and theme are required.");

  const supabase = await createClient();
  const { error } = await supabase.from("themed_pathways").insert({
    curator_id: profile.id,
    title,
    theme,
    description: description || null,
    status,
  });

  if (error) fail(error.message);
  revalidatePath("/curator");
  done("Themed pathway created.");
}

export async function updateDossier(input: {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  status: string;
}): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("curator_dossiers")
    .update({
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      body: input.body?.trim() || null,
      status: input.status,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function deleteDossier(id: string): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase.from("curator_dossiers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function updateArchiveNote(input: {
  id: string;
  record_id: string | null;
  title: string;
  note: string;
  note_type: string;
  status: string;
}): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("archive_notes")
    .update({
      record_id: input.record_id?.trim() || null,
      title: input.title.trim(),
      note: input.note.trim(),
      note_type: input.note_type,
      status: input.status,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function deleteArchiveNote(id: string): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase.from("archive_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function updateFeaturedRecord(input: {
  id: string;
  record_id: string;
  placement: string;
  reason: string | null;
  editorial_status: string;
}): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const isActive = input.editorial_status === "active";
  const { error } = await supabase
    .from("featured_records")
    .update({
      record_id: input.record_id.trim(),
      placement: input.placement,
      reason: input.reason?.trim() || null,
      editorial_status: input.editorial_status,
      is_active: isActive,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function deleteFeaturedRecord(id: string): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase.from("featured_records").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function updatePathway(input: {
  id: string;
  title: string;
  theme: string;
  description: string | null;
  status: string;
}): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("themed_pathways")
    .update({
      title: input.title.trim(),
      theme: input.theme.trim(),
      description: input.description?.trim() || null,
      status: input.status,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function deletePathway(id: string): Promise<CuratorActionResult> {
  await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase.from("themed_pathways").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}

export async function updateSubmissionReview(input: {
  id: string;
  review_status: string;
  reviewer_note: string | null;
}): Promise<CuratorActionResult> {
  const profile = await requireCurator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("submitted_content")
    .update({
      review_status: input.review_status,
      reviewer_id: profile.id,
      reviewer_note: input.reviewer_note?.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/curator");
  return { ok: true };
}
