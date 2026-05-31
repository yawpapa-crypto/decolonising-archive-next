import "server-only";

import { createClient } from "@/src/lib/supabase/server";
import type { BookmarkRow, ReadingListRow } from "@/src/lib/member-workspace";

export type CommunityVisibility = "public" | "community" | "private";
export type CommunityPostStatus = "draft" | "published" | "hidden" | "deleted";
export type CommunityAttachmentType = "saved_record" | "reading_list" | "external_source";
export type CommunityReportTarget = "post" | "comment";
export type CommunityPostType =
  | "reflection"
  | "source_note"
  | "reading_list"
  | "question"
  | "teaching_path";

export type CommunityPostRow = {
  id: string;
  user_id: string;
  author_name: string | null;
  title: string;
  body: string;
  post_type: CommunityPostType;
  visibility: CommunityVisibility;
  status: CommunityPostStatus;
  comment_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type CommunityAttachmentRow = {
  id: string;
  post_id: string;
  user_id: string;
  attachment_type: CommunityAttachmentType;
  record_id: string | null;
  reading_list_id: string | null;
  title: string | null;
  source_label: string | null;
  record_type: string | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CommunityTagRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  created_at: string;
};

export type CommunityCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  body: string;
  status: "published" | "hidden" | "deleted";
  created_at: string;
  updated_at: string;
};

export type CommunityPost = CommunityPostRow & {
  attachments: CommunityAttachmentRow[];
  tags: CommunityTagRow[];
  comments: CommunityCommentRow[];
  reaction_count: number;
  current_user_reacted: boolean;
  save_count: number;
  current_user_saved: boolean;
};

export type CommunityAttachmentOptions = {
  bookmarks: BookmarkRow[];
  readingLists: ReadingListRow[];
};

export type CommunityReportRow = {
  id: string;
  target_type: CommunityReportTarget;
  target_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  moderator_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

type PostTagRow = {
  post_id: string;
  tag_id: string;
};

type ReactionRow = {
  post_id: string;
  user_id: string;
  reaction_type: "useful";
};

type SaveRow = {
  post_id: string;
  user_id: string;
};

const COMMUNITY_POST_SELECT =
  "id, user_id, author_name, title, body, post_type, visibility, status, comment_count, last_activity_at, created_at, updated_at";

function isSchemaMissingError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || error?.code === "PGRST205" || message.includes("schema cache");
}

function logCommunityDataError(scope: string, error: { message?: string } | null | undefined) {
  if (!error) return;
  console.error(`[community] ${scope}`, error.message ?? error);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function cleanCommunityText(value: FormDataEntryValue | null, maxLength = 12000) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function communityAuthorName(profile: {
  display_name?: string | null;
  preferred_name?: string | null;
  full_name?: string | null;
  email?: string | null;
}) {
  return (
    profile.display_name?.trim() ||
    profile.preferred_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email?.trim() ||
    "Archive member"
  );
}

export function slugifyCommunityTag(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function parseCommunityTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[,\n#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((label) => ({
      label: label.slice(0, 48),
      slug: slugifyCommunityTag(label),
    }))
    .filter((tag) => tag.slug && !seen.has(tag.slug) && seen.add(tag.slug))
    .slice(0, 8);
}

async function decoratePosts(
  posts: CommunityPostRow[],
  currentUserId?: string | null,
): Promise<CommunityPost[]> {
  const postIds = posts.map((post) => post.id);
  if (!postIds.length) return [];

  const supabase = await createClient();
  const [attachmentsResult, postTagsResult, commentsResult, reactionsResult, savesResult] = await Promise.all([
    supabase
      .from("community_post_attachments")
      .select(
        "id, post_id, user_id, attachment_type, record_id, reading_list_id, title, source_label, record_type, source_url, metadata, created_at",
      )
      .in("post_id", postIds),
    supabase.from("community_post_tags").select("post_id, tag_id").in("post_id", postIds),
    supabase
      .from("community_comments")
      .select("id, post_id, user_id, author_name, body, status, created_at, updated_at")
      .in("post_id", postIds)
      .eq("status", "published")
      .order("created_at", { ascending: true }),
    supabase
      .from("community_post_reactions")
      .select("post_id, user_id, reaction_type")
      .in("post_id", postIds)
      .eq("reaction_type", "useful"),
    supabase
      .from("community_post_saves")
      .select("post_id, user_id")
      .in("post_id", postIds),
  ]);

  if (attachmentsResult.error && !isSchemaMissingError(attachmentsResult.error)) {
    logCommunityDataError("attachments unavailable", attachmentsResult.error);
  }
  if (postTagsResult.error && !isSchemaMissingError(postTagsResult.error)) {
    logCommunityDataError("tags unavailable", postTagsResult.error);
  }
  if (commentsResult.error && !isSchemaMissingError(commentsResult.error)) {
    logCommunityDataError("comments unavailable", commentsResult.error);
  }
  if (reactionsResult.error && !isSchemaMissingError(reactionsResult.error)) {
    logCommunityDataError("reactions unavailable", reactionsResult.error);
  }
  if (savesResult.error && !isSchemaMissingError(savesResult.error)) {
    logCommunityDataError("saves unavailable", savesResult.error);
  }

  const attachmentsByPost = new Map<string, CommunityAttachmentRow[]>();
  for (const row of attachmentsResult.data ?? []) {
    const attachment = {
      ...row,
      metadata: asRecord(row.metadata),
    } as CommunityAttachmentRow;
    const list = attachmentsByPost.get(attachment.post_id) ?? [];
    list.push(attachment);
    attachmentsByPost.set(attachment.post_id, list);
  }

  const postTagRows = (postTagsResult.data ?? []) as PostTagRow[];
  const tagIds = Array.from(new Set(postTagRows.map((row) => row.tag_id)));
  const tagsResult = tagIds.length
    ? await supabase.from("community_tags").select("id, slug, label, description, created_at").in("id", tagIds)
    : { data: [] as CommunityTagRow[] };
  const tagsById = new Map(
    ((tagsResult.data ?? []) as CommunityTagRow[]).map((tag) => [tag.id, tag]),
  );
  const tagsByPost = new Map<string, CommunityTagRow[]>();
  for (const row of postTagRows) {
    const tag = tagsById.get(row.tag_id);
    if (!tag) continue;
    const list = tagsByPost.get(row.post_id) ?? [];
    list.push(tag);
    tagsByPost.set(row.post_id, list);
  }

  const commentsByPost = new Map<string, CommunityCommentRow[]>();
  for (const comment of (commentsResult.data ?? []) as CommunityCommentRow[]) {
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push(comment);
    commentsByPost.set(comment.post_id, list);
  }

  const reactionCounts = new Map<string, number>();
  const reactedPostIds = new Set<string>();
  for (const reaction of (reactionsResult.data ?? []) as ReactionRow[]) {
    reactionCounts.set(reaction.post_id, (reactionCounts.get(reaction.post_id) ?? 0) + 1);
    if (currentUserId && reaction.user_id === currentUserId) {
      reactedPostIds.add(reaction.post_id);
    }
  }

  const saveCounts = new Map<string, number>();
  const savedPostIds = new Set<string>();
  for (const save of (savesResult.data ?? []) as SaveRow[]) {
    saveCounts.set(save.post_id, (saveCounts.get(save.post_id) ?? 0) + 1);
    if (currentUserId && save.user_id === currentUserId) {
      savedPostIds.add(save.post_id);
    }
  }

  return posts.map((post) => ({
    ...post,
    attachments: attachmentsByPost.get(post.id) ?? [],
    tags: tagsByPost.get(post.id) ?? [],
    comments: commentsByPost.get(post.id) ?? [],
    reaction_count: reactionCounts.get(post.id) ?? 0,
    current_user_reacted: reactedPostIds.has(post.id),
    save_count: saveCounts.get(post.id) ?? 0,
    current_user_saved: savedPostIds.has(post.id),
  }));
}

export async function getCommunityFeed(currentUserId?: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select(COMMUNITY_POST_SELECT)
    .eq("status", "published")
    .in("visibility", ["public", "community"])
    .order("last_activity_at", { ascending: false })
    .limit(60);

  if (error) {
    logCommunityDataError("feed unavailable", error);
    if (isSchemaMissingError(error)) return [];
    throw new Error(error.message);
  }
  return decoratePosts((data ?? []) as CommunityPostRow[], currentUserId);
}

export async function getCommunityPost(id: string, currentUserId?: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select(COMMUNITY_POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logCommunityDataError("post unavailable", error);
    if (isSchemaMissingError(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const [post] = await decoratePosts([data as CommunityPostRow], currentUserId);
  return post ?? null;
}

export async function getCommunityComments(postId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_comments")
    .select("id, post_id, user_id, author_name, body, status, created_at, updated_at")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    logCommunityDataError("comments unavailable", error);
    if (isSchemaMissingError(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as CommunityCommentRow[];
}

export async function getCommunityTopics() {
  const supabase = await createClient();
  const { data: tags, error } = await supabase
    .from("community_tags")
    .select("id, slug, label, description, created_at")
    .order("label", { ascending: true });

  if (error) {
    logCommunityDataError("topics unavailable", error);
    if (isSchemaMissingError(error)) return [];
    throw new Error(error.message);
  }
  const tagRows = (tags ?? []) as CommunityTagRow[];
  const tagIds = tagRows.map((tag) => tag.id);
  const postTagsResult = tagIds.length
    ? await supabase.from("community_post_tags").select("tag_id").in("tag_id", tagIds)
    : { data: [] as Array<{ tag_id: string }> };
  const counts = new Map<string, number>();
  for (const row of postTagsResult.data ?? []) {
    counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
  }
  return tagRows.map((tag) => ({ ...tag, postCount: counts.get(tag.id) ?? 0 }));
}

export async function getCommunityReadingListPosts(currentUserId?: string | null) {
  const posts = await getCommunityFeed(currentUserId);
  return posts.filter((post) =>
    post.attachments.some((attachment) => attachment.attachment_type === "reading_list"),
  );
}

export async function getCommunityAttachmentOptions(
  userId: string | null,
): Promise<CommunityAttachmentOptions> {
  if (!userId) return { bookmarks: [], readingLists: [] };
  const supabase = await createClient();
  const [bookmarksResult, readingListsResult] = await Promise.all([
    supabase
      .from("bookmarks")
      .select(
        "id, record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata, note, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("reading_lists")
      .select("id, title, description, group_type, group_label, is_public, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (bookmarksResult.error) {
    logCommunityDataError("bookmark attachments unavailable", bookmarksResult.error);
  }
  if (readingListsResult.error) {
    logCommunityDataError("reading list attachments unavailable", readingListsResult.error);
  }
  return {
    bookmarks: (bookmarksResult.error ? [] : bookmarksResult.data ?? []) as BookmarkRow[],
    readingLists: (readingListsResult.error ? [] : readingListsResult.data ?? []) as ReadingListRow[],
  };
}

export async function getMyCommunityPosts(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select(COMMUNITY_POST_SELECT)
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("updated_at", { ascending: false });

  if (error) {
    logCommunityDataError("my posts unavailable", error);
    if (isSchemaMissingError(error)) return [];
    throw new Error(error.message);
  }
  return decoratePosts((data ?? []) as CommunityPostRow[], userId);
}

export async function getCommunityReportsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_reports")
    .select("id, target_type, target_id, reporter_id, reason, details, status, moderator_note, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logCommunityDataError("reports unavailable", error);
    if (isSchemaMissingError(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as CommunityReportRow[];
}
