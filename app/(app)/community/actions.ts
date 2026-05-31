"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivityServer } from "@/lib/admin-analytics";
import { createAdminNotification } from "@/lib/admin-notifications";
import { requireAdmin, requireMember } from "@/src/lib/auth";
import {
  cleanCommunityText,
  communityAuthorName,
  parseCommunityTags,
  type CommunityReportTarget,
  type CommunityPostType,
  type CommunityVisibility,
} from "@/src/lib/community-reading-commons";
import { createClient } from "@/src/lib/supabase/server";

const VISIBILITIES = new Set<CommunityVisibility>(["public", "community", "private"]);
const REPORT_TARGETS = new Set<CommunityReportTarget>(["post", "comment"]);
const POST_TYPES = new Set<CommunityPostType>([
  "reflection",
  "source_note",
  "reading_list",
  "question",
  "teaching_path",
]);
const RATE_LIMIT_WINDOW_MS = 60_000;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function success(path: string, message: string): never {
  redirect(`${path}?updated=${encodeURIComponent(message)}`);
}

function formText(formData: FormData, key: string, maxLength = 12000) {
  return cleanCommunityText(formData.get(key), maxLength);
}

function normaliseVisibility(value: string): CommunityVisibility {
  return VISIBILITIES.has(value as CommunityVisibility) ? (value as CommunityVisibility) : "public";
}

function normalisePostType(value: string): CommunityPostType {
  return POST_TYPES.has(value as CommunityPostType) ? (value as CommunityPostType) : "reflection";
}

async function assertRateLimit(table: "community_posts" | "community_comments", userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  return (count ?? 0) < 4;
}

async function attachTags(postId: string, tagsValue: string) {
  const tags = parseCommunityTags(tagsValue);
  if (!tags.length) return;
  const supabase = await createClient();

  for (const tag of tags) {
    const existing = await supabase
      .from("community_tags")
      .select("id")
      .eq("slug", tag.slug)
      .maybeSingle();
    let tagId = existing.data?.id as string | undefined;

    if (!tagId) {
      const inserted = await supabase
        .from("community_tags")
        .insert({ slug: tag.slug, label: tag.label })
        .select("id")
        .single();
      if (inserted.error?.code === "23505") {
        const retry = await supabase
          .from("community_tags")
          .select("id")
          .eq("slug", tag.slug)
          .single();
        if (retry.error || !retry.data) throw new Error(retry.error?.message ?? "Could not save tag.");
        tagId = retry.data.id as string;
      } else if (inserted.error || !inserted.data) {
        throw new Error(inserted.error?.message ?? "Could not save tag.");
      } else {
        tagId = inserted.data.id as string;
      }
    }

    const { error: joinError } = await supabase
      .from("community_post_tags")
      .upsert({ post_id: postId, tag_id: tagId }, { onConflict: "post_id,tag_id" });
    if (joinError) throw new Error(joinError.message);
  }
}

async function attachSelectedItems(postId: string, userId: string, formData: FormData) {
  const supabase = await createClient();
  const bookmarkId = formText(formData, "bookmark_id", 120);
  const readingListId = formText(formData, "reading_list_id", 120);
  const manualRecordId = formText(formData, "record_id", 240);
  const manualRecordTitle = formText(formData, "record_title", 240);
  const sourceUrl = formText(formData, "source_url", 500);

  if (bookmarkId) {
    const { data: bookmark, error } = await supabase
      .from("bookmarks")
      .select("record_id, record_title, record_source, record_source_url, record_type, record_metadata")
      .eq("id", bookmarkId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (bookmark) {
      const { error: insertError } = await supabase.from("community_post_attachments").insert({
        post_id: postId,
        user_id: userId,
        attachment_type: "saved_record",
        record_id: bookmark.record_id,
        title: bookmark.record_title,
        source_label: bookmark.record_source,
        source_url: bookmark.record_source_url,
        record_type: bookmark.record_type,
        metadata: bookmark.record_metadata ?? {},
      });
      if (insertError) throw new Error(insertError.message);
    }
  } else if (manualRecordId) {
    const { error } = await supabase.from("community_post_attachments").insert({
      post_id: postId,
      user_id: userId,
      attachment_type: sourceUrl ? "external_source" : "saved_record",
      record_id: manualRecordId,
      title: manualRecordTitle || manualRecordId,
      source_url: sourceUrl || null,
      source_label: "Library",
      record_type: "Archive find",
      metadata: {},
    });
    if (error) throw new Error(error.message);
  }

  if (readingListId) {
    const { data: list, error } = await supabase
      .from("reading_lists")
      .select("id, title, description, is_public")
      .eq("id", readingListId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (list) {
      if (!list.is_public) {
        throw new Error("Make the reading list public before publishing it to the Commons.");
      }
      const { error: insertError } = await supabase.from("community_post_attachments").insert({
        post_id: postId,
        user_id: userId,
        attachment_type: "reading_list",
        reading_list_id: list.id,
        title: list.title,
        source_label: list.is_public ? "Public reading list" : "Private reading list",
        record_type: "Reading list",
        metadata: { description: list.description ?? "" },
      });
      if (insertError) throw new Error(insertError.message);
    }
  }
}

export async function createCommunityPost(formData: FormData) {
  const profile = await requireMember("/community");
  const title = formText(formData, "title", 180);
  const body = formText(formData, "body", 12000);
  const visibility = normaliseVisibility(formText(formData, "visibility", 24));
  const postType = normalisePostType(formText(formData, "post_type", 32));
  const status = visibility === "private" ? "draft" : "published";

  if (title.length < 3 || body.length < 3) {
    fail("/community", "Add a title and reflection before sharing.");
  }
  if (!(await assertRateLimit("community_posts", profile.id))) {
    fail("/community", "Please pause for a moment before creating another post.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: profile.id,
      author_name: communityAuthorName(profile),
      title,
      body,
      post_type: postType,
      visibility,
      status,
    })
    .select("id")
    .single();

  if (error || !data) fail("/community", error?.message ?? "Could not create post.");

  try {
    await attachTags(data.id, formText(formData, "tags", 500));
    await attachSelectedItems(data.id, profile.id, formData);
  } catch (error) {
    console.error("[community] attachment failed", error);
    revalidatePath("/community");
    redirect(`/community/posts/${data.id}?updated=${encodeURIComponent("Post created, but one attachment could not be added.")}`);
  }

  await logActivityServer({
    eventType: "community_post_created",
    area: "community",
    action: "create",
    targetType: "community_post",
    targetId: data.id,
    metadata: {
      postType,
      visibility,
      status,
      tagCount: parseCommunityTags(formText(formData, "tags", 500)).length,
      hasSavedRecord: Boolean(formText(formData, "bookmark_id", 120) || formText(formData, "record_id", 240)),
      hasReadingList: Boolean(formText(formData, "reading_list_id", 120)),
    },
  });

  revalidatePath("/community");
  revalidatePath("/community/topics");
  redirect(`/community/posts/${data.id}`);
}

export async function publishCommunityPost(formData: FormData) {
  const profile = await requireMember("/community");
  const postId = formText(formData, "post_id", 120);
  const supabase = await createClient();
  const { error } = await supabase
    .from("community_posts")
    .update({ status: "published", visibility: "public", last_activity_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", profile.id);
  if (error) fail("/my/workbench/community", error.message);
  revalidatePath("/community");
  revalidatePath("/my/workbench/community");
  success("/my/workbench/community", "Post published to the Commons.");
}

export async function unpublishCommunityPost(formData: FormData) {
  const profile = await requireMember("/community");
  const postId = formText(formData, "post_id", 120);
  const supabase = await createClient();
  const { error } = await supabase
    .from("community_posts")
    .update({ status: "draft", visibility: "private" })
    .eq("id", postId)
    .eq("user_id", profile.id);
  if (error) fail("/my/workbench/community", error.message);
  revalidatePath("/community");
  revalidatePath("/my/workbench/community");
  success("/my/workbench/community", "Post moved back to drafts.");
}

export async function deleteCommunityPost(formData: FormData) {
  const profile = await requireMember("/community");
  const postId = formText(formData, "post_id", 120);
  const redirectTo = formText(formData, "redirect_to", 200) || "/my/workbench/community";
  const supabase = await createClient();
  const { error } = await supabase
    .from("community_posts")
    .update({ status: "deleted" })
    .eq("id", postId)
    .eq("user_id", profile.id);
  if (error) fail(redirectTo, error.message);
  revalidatePath("/community");
  revalidatePath("/my/workbench/community");
  success(redirectTo, "Post deleted.");
}

export async function createCommunityComment(formData: FormData) {
  const profile = await requireMember("/community");
  const postId = formText(formData, "post_id", 120);
  const body = formText(formData, "body", 5000);
  const redirectTo = formText(formData, "redirect_to", 240) || `/community/posts/${postId}`;

  if (!body) fail(redirectTo, "Write a comment before posting.");
  if (!(await assertRateLimit("community_comments", profile.id))) {
    fail(redirectTo, "Please pause for a moment before commenting again.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    user_id: profile.id,
    author_name: communityAuthorName(profile),
    body,
    status: "published",
  });
  if (error) fail(redirectTo, error.message);

  await supabase
    .from("community_posts")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", postId);
  const { count } = await supabase
    .from("community_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("status", "published");
  await supabase.from("community_posts").update({ comment_count: count ?? 0 }).eq("id", postId);

  await logActivityServer({
    eventType: "community_comment_created",
    area: "community",
    action: "comment",
    targetType: "community_post",
    targetId: postId,
    metadata: { characterCount: body.length },
  });

  revalidatePath(redirectTo);
  revalidatePath("/community");
  success(redirectTo, "Comment added.");
}

export async function toggleCommunityReaction(formData: FormData) {
  const profile = await requireMember("/community");
  const postId = formText(formData, "post_id", 120);
  const redirectTo = formText(formData, "redirect_to", 240) || "/community";
  if (!postId) fail(redirectTo, "Could not find the post to react to.");

  const supabase = await createClient();
  const existing = await supabase
    .from("community_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .eq("reaction_type", "useful")
    .maybeSingle();

  if (existing.error) fail(redirectTo, existing.error.message);

  if (existing.data?.id) {
    const { error } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("id", existing.data.id)
      .eq("user_id", profile.id);
    if (error) fail(redirectTo, error.message);
  } else {
    const { error } = await supabase.from("community_post_reactions").insert({
      post_id: postId,
      user_id: profile.id,
      reaction_type: "useful",
    });
    if (error) fail(redirectTo, error.message);
  }

  await supabase
    .from("community_posts")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", postId);

  await logActivityServer({
    eventType: "community_reaction_added",
    area: "community",
    action: existing.data?.id ? "remove_reaction" : "add_reaction",
    targetType: "community_post",
    targetId: postId,
    metadata: { reactionType: "useful" },
  });

  revalidatePath("/community");
  revalidatePath(`/community/posts/${postId}`);
  redirect(redirectTo);
}

export async function toggleCommunitySave(formData: FormData) {
  const profile = await requireMember("/community");
  const postId = formText(formData, "post_id", 120);
  const redirectTo = formText(formData, "redirect_to", 240) || "/community";
  if (!postId) fail(redirectTo, "Could not find the post to save.");

  const supabase = await createClient();
  const existing = await supabase
    .from("community_post_saves")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing.error) fail(redirectTo, existing.error.message);

  if (existing.data?.id) {
    const { error } = await supabase
      .from("community_post_saves")
      .delete()
      .eq("id", existing.data.id)
      .eq("user_id", profile.id);
    if (error) fail(redirectTo, error.message);
  } else {
    const { error } = await supabase.from("community_post_saves").insert({
      post_id: postId,
      user_id: profile.id,
    });
    if (error) fail(redirectTo, error.message);
  }

  await logActivityServer({
    eventType: "community_post_saved",
    area: "community",
    action: existing.data?.id ? "unsave" : "save",
    targetType: "community_post",
    targetId: postId,
  });

  revalidatePath("/community");
  revalidatePath(`/community/posts/${postId}`);
  redirect(redirectTo);
}

export async function updateCommunityComment(formData: FormData) {
  const profile = await requireMember("/community");
  const commentId = formText(formData, "comment_id", 120);
  const postId = formText(formData, "post_id", 120);
  const body = formText(formData, "body", 5000);
  const redirectTo = `/community/posts/${postId}`;
  if (!body) fail(redirectTo, "Comment cannot be empty.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("community_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("user_id", profile.id);
  if (error) fail(redirectTo, error.message);
  revalidatePath(redirectTo);
  success(redirectTo, "Comment updated.");
}

export async function deleteCommunityComment(formData: FormData) {
  const profile = await requireMember("/community");
  const commentId = formText(formData, "comment_id", 120);
  const postId = formText(formData, "post_id", 120);
  const redirectTo = `/community/posts/${postId}`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("community_comments")
    .update({ status: "deleted" })
    .eq("id", commentId)
    .eq("user_id", profile.id);
  if (error) fail(redirectTo, error.message);
  const { count } = await supabase
    .from("community_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("status", "published");
  await supabase.from("community_posts").update({ comment_count: count ?? 0 }).eq("id", postId);
  revalidatePath(redirectTo);
  revalidatePath("/community");
  success(redirectTo, "Comment deleted.");
}

export async function reportCommunityContent(formData: FormData) {
  const profile = await requireMember("/community");
  const targetType = formText(formData, "target_type", 24) as CommunityReportTarget;
  const targetId = formText(formData, "target_id", 120);
  const reason = formText(formData, "reason", 160);
  const details = formText(formData, "details", 1000);
  const redirectTo = formText(formData, "redirect_to", 240) || "/community";

  if (!REPORT_TARGETS.has(targetType) || !targetId || reason.length < 3) {
    fail(redirectTo, "Choose a reason before sending a report.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("community_reports").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_id: profile.id,
    reason,
    details: details || null,
  });
  if (error) fail(redirectTo, error.message);

  // Notify admins — cultural concern and takedown are urgent
  const isUrgent = reason.toLowerCase().includes("cultural") || reason.toLowerCase().includes("takedown");
  void createAdminNotification({
    type: isUrgent ? "cultural_concern_reported" : "community_post_reported",
    title: isUrgent ? "Cultural concern or takedown request reported" : "Community content reported",
    body: `${targetType} reported. Reason: ${reason.slice(0, 120)}`,
    severity: isUrgent ? "urgent" : "warning",
    targetType: targetType,
    targetId: targetId,
    metadata: { reason: reason.slice(0, 200) },
  });

  success(redirectTo, "Report sent for moderation.");
}

export async function adminModerateCommunityContent(formData: FormData) {
  await requireAdmin();
  const targetType = formText(formData, "target_type", 24) as CommunityReportTarget;
  const targetId = formText(formData, "target_id", 120);
  const reportId = formText(formData, "report_id", 120);
  const action = formText(formData, "moderation_action", 24);
  const note = formText(formData, "moderator_note", 1000);
  const supabase = await createClient();

  if (!REPORT_TARGETS.has(targetType) || !targetId) {
    fail("/admin/community", "Invalid moderation target.");
  }

  const table = targetType === "post" ? "community_posts" : "community_comments";
  const status =
    action === "hide" ? "hidden" : action === "delete" ? "deleted" : action === "unhide" ? "published" : null;
  if (status) {
    const { error } = await supabase.from(table).update({ status }).eq("id", targetId);
    if (error) fail("/admin/community", error.message);
  }

  if (reportId) {
    const { error } = await supabase
      .from("community_reports")
      .update({
        status: action === "dismiss" ? "dismissed" : "resolved",
        moderator_note: note || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (error) fail("/admin/community", error.message);
  }

  revalidatePath("/community");
  revalidatePath("/admin/community");
  success("/admin/community", "Moderation action applied.");
}
