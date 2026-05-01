"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurator } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

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
  const status = text(formData, "status") || "draft";

  if (!title) fail("Dossier title is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("curator_dossiers").insert({
    curator_id: profile.id,
    title,
    summary: summary || null,
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

  if (!title || !note) fail("Archive note needs a title and note text.");

  const supabase = await createClient();
  const { error } = await supabase.from("archive_notes").insert({
    curator_id: profile.id,
    record_id: recordId || null,
    title,
    note,
    status: "draft",
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

  if (!recordId) fail("Choose a record to feature.");

  const supabase = await createClient();
  const { error } = await supabase.from("featured_records").upsert(
    {
      curator_id: profile.id,
      record_id: recordId,
      placement,
      reason: reason || null,
      is_active: true,
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

  if (!title || !theme) fail("Pathway title and theme are required.");

  const supabase = await createClient();
  const { error } = await supabase.from("themed_pathways").insert({
    curator_id: profile.id,
    title,
    theme,
    description: description || null,
    status: "draft",
  });

  if (error) fail(error.message);
  revalidatePath("/curator");
  done("Themed pathway created.");
}

export async function reviewSubmittedContent(formData: FormData) {
  const profile = await requireCurator();
  const id = text(formData, "id");
  const reviewStatus = text(formData, "review_status");
  const reviewerNote = text(formData, "reviewer_note");

  if (!id || !reviewStatus) fail("Review status is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("submitted_content")
    .update({
      review_status: reviewStatus,
      reviewer_id: profile.id,
      reviewer_note: reviewerNote || null,
    })
    .eq("id", id);

  if (error) fail(error.message);
  revalidatePath("/curator");
  done("Submitted content reviewed.");
}
