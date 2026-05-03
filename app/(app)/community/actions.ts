"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

const CONTRIBUTION_TYPES = new Set([
  "source_suggestion",
  "record_correction",
  "community_note",
  "contextual_reflection",
  "rights_concern",
  "broken_link",
  "event_resource",
  "shared_reading_list",
  "other",
]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(message: string): never {
  redirect(`/community?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/community?submitted=1&updated=${encodeURIComponent(message)}`);
}

export async function createCommunityContribution(formData: FormData) {
  const profile = await requireMember("/community");
  const contributionType = text(formData, "content_type") || "source_suggestion";
  const title = text(formData, "title");
  const description = text(formData, "description");
  const sourceUrl = text(formData, "source_url");
  const relatedRecordId = text(formData, "related_record_id");
  const relatedReadingListId = text(formData, "related_reading_list_id");
  const acknowledged = formData.get("acknowledgement") === "on";

  if (!CONTRIBUTION_TYPES.has(contributionType)) {
    fail("Choose a valid contribution type.");
  }

  if (!acknowledged) {
    fail("Please confirm that this contribution should go to curator review.");
  }

  const supabase = await createClient();

  if (contributionType === "shared_reading_list") {
    if (!relatedReadingListId) {
      fail("Choose a reading list to share.");
    }

    const { data: list, error: listError } = await supabase
      .from("reading_lists")
      .select("id, title, description, is_public")
      .eq("id", relatedReadingListId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (listError) fail(listError.message);
    if (!list) fail("Reading list not found.");
    if (!list.is_public) {
      fail("This list is currently private. Change it to members-only or public before sharing.");
    }

    const { error } = await supabase.from("submitted_content").insert({
      user_id: profile.id,
      title: title || `Shared reading list: ${list.title}`,
      content_type: "shared_reading_list",
      description:
        description ||
        list.description ||
        "Shared reading list submitted for curator review.",
      source_url: null,
      related_record_id: null,
      related_reading_list_id: list.id,
      visibility: "public",
      review_status: "submitted",
    });

    if (error) fail(error.message);
    revalidatePath("/community");
    done("Reading list sent for curator review.");
  }

  if (!title || !description) {
    fail("Contribution needs a title and description.");
  }

  const { error } = await supabase.from("submitted_content").insert({
    user_id: profile.id,
    title,
    content_type: contributionType,
    description,
    source_url: sourceUrl || null,
    related_record_id: relatedRecordId || null,
    related_reading_list_id: null,
    visibility: null,
    review_status: "submitted",
  });

  if (error) fail(error.message);
  revalidatePath("/community");
  done("Contribution sent for curator review.");
}
