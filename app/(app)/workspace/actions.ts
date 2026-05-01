"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(message: string): never {
  redirect(`/workspace?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/workspace?updated=${encodeURIComponent(message)}`);
}

export async function createBookmark(formData: FormData) {
  const profile = await requireMember();
  const recordId = text(formData, "record_id");
  const note = text(formData, "note");

  if (!recordId) fail("Choose a record to bookmark.");

  const supabase = await createClient();
  const { error } = await supabase.from("bookmarks").upsert(
    {
      user_id: profile.id,
      record_id: recordId,
      note: note || null,
    },
    { onConflict: "user_id,record_id" },
  );

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Bookmark saved.");
}

export async function deleteBookmark(formData: FormData) {
  const profile = await requireMember();
  const id = text(formData, "id");
  if (!id) fail("Bookmark not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Bookmark removed.");
}

export async function createSavedSearch(formData: FormData) {
  const profile = await requireMember();
  const query = text(formData, "query");
  const label = text(formData, "label") || query;

  if (!query) fail("Enter a search query to save.");

  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").insert({
    user_id: profile.id,
    label,
    query,
    filters: {},
  });

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Search saved.");
}

export async function deleteSavedSearch(formData: FormData) {
  const profile = await requireMember();
  const id = text(formData, "id");
  if (!id) fail("Saved search not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Saved search removed.");
}

export async function createReadingList(formData: FormData) {
  const profile = await requireMember();
  const title = text(formData, "title");
  const description = text(formData, "description");
  const isPublic = formData.get("is_public") === "on";

  if (!title) fail("Give the reading list a title.");

  const supabase = await createClient();
  const { error } = await supabase.from("reading_lists").insert({
    user_id: profile.id,
    title,
    description: description || null,
    is_public: isPublic,
  });

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Reading list created.");
}

export async function addRecordToReadingList(formData: FormData) {
  const profile = await requireMember();
  const readingListId = text(formData, "reading_list_id");
  const recordId = text(formData, "record_id");

  if (!readingListId || !recordId) {
    fail("Choose a reading list and record.");
  }

  const supabase = await createClient();
  const { data: list, error: listError } = await supabase
    .from("reading_lists")
    .select("id")
    .eq("id", readingListId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (listError) fail(listError.message);
  if (!list) fail("Reading list not found.");

  const { count } = await supabase
    .from("reading_list_items")
    .select("id", { count: "exact", head: true })
    .eq("reading_list_id", readingListId);

  const { error } = await supabase.from("reading_list_items").upsert(
    {
      reading_list_id: readingListId,
      record_id: recordId,
      position: count ?? 0,
    },
    { onConflict: "reading_list_id,record_id" },
  );

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Record added to reading list.");
}

export async function submitContent(formData: FormData) {
  const profile = await requireMember();
  const title = text(formData, "title");
  const contentType = text(formData, "content_type") || "record";
  const description = text(formData, "description");
  const sourceUrl = text(formData, "source_url");

  if (!title || !description) {
    fail("Submitted content needs a title and description.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("submitted_content").insert({
    user_id: profile.id,
    title,
    content_type: contentType,
    description,
    source_url: sourceUrl || null,
  });

  if (error) fail(error.message);
  revalidatePath("/workspace");
  done("Content submitted for curator review.");
}

export async function saveProfileDetails(formData: FormData) {
  const profile = await requireMember();
  const fullName = text(formData, "full_name");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", profile.id);

  if (error) fail(error.message);

  // TODO: Persist extended member profile fields (institution, interests, website, bio)
  // once a dedicated profile-details schema/table is introduced.
  revalidatePath("/workspace");
  done("Profile updated.");
}

export async function submitSupportRequest(formData: FormData) {
  await requireMember();
  const category = text(formData, "category");
  const subject = text(formData, "subject");
  const message = text(formData, "message");

  if (!category || !subject || !message) {
    fail("Support request needs category, subject, and message.");
  }

  // TODO: Persist support requests when a support_requests table/API is available.
  done("Support request captured. We'll wire delivery next.");
}
