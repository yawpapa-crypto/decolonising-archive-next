import "server-only";

import { getSupabase } from "@/src/lib/supabase";
import { createAdminClient } from "@/src/lib/supabase/admin";

type RawRow = Record<string, unknown>;

function str(row: RawRow, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}

function num(row: RawRow, key: string): number {
  const v = row[key];
  return typeof v === "number" ? v : 0;
}

export type AdminUserDetail = {
  profile: RawRow | null;
  authLastSignIn: string | null;
  recentActivity: RawRow[];
  recentSearches: RawRow[];
  recentSessions: RawRow[];
  recentErrors: RawRow[];
  featureUsage: { label: string; count: number }[];
  stats: {
    totalSearches: number;
    totalSessions: number;
    totalEvents: number;
    totalErrors: number;
    savedRecords: number;
    readingLists: number;
    communityPosts: number;
    communityComments: number;
  };
};

function countByLabel(rows: RawRow[], key: string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const label = str(row, key) || "other";
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const db = getSupabase();
  const adminDb = createAdminClient();

  const [
    profileResult,
    authResult,
    activityResult,
    searchResult,
    sessionsResult,
    errorsResult,
    savedRecordsResult,
    readingListsResult,
    communityPostsResult,
    communityCommentsResult,
  ] = await Promise.allSettled([
    db.from("profiles")
      .select("id, email, full_name, display_name, preferred_name, avatar_url, short_bio, affiliation, organisation, website, role, profile_visibility, created_at, updated_at, last_login_at, last_seen_at")
      .eq("id", userId)
      .maybeSingle(),
    adminDb.auth.admin.getUserById(userId),
    db.from("user_activity_events")
      .select("id, event_type, area, action, target_type, target_id, path, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("search_events")
      .select("id, query, source_scope, result_count, local_result_count, external_result_count, duration_ms, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("user_sessions")
      .select("id, session_id, started_at, last_seen_at, duration_seconds, path_first, path_last")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(50),
    db.from("app_error_logs")
      .select("id, area, message, code, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("bookmarks").select("id").eq("user_id", userId),
    db.from("reading_lists").select("id").eq("user_id", userId),
    db.from("community_posts").select("id").eq("user_id", userId),
    db.from("community_post_comments").select("id").eq("user_id", userId),
  ]);

  const profile =
    profileResult.status === "fulfilled" && !profileResult.value.error
      ? (profileResult.value.data as RawRow | null)
      : null;

  const authLastSignIn =
    authResult.status === "fulfilled" && !authResult.value.error
      ? (authResult.value.data.user?.last_sign_in_at ?? null)
      : null;

  const activity =
    activityResult.status === "fulfilled" ? ((activityResult.value.data ?? []) as RawRow[]) : [];

  const searches =
    searchResult.status === "fulfilled" ? ((searchResult.value.data ?? []) as RawRow[]) : [];

  const sessions =
    sessionsResult.status === "fulfilled" ? ((sessionsResult.value.data ?? []) as RawRow[]) : [];

  const errors =
    errorsResult.status === "fulfilled" ? ((errorsResult.value.data ?? []) as RawRow[]) : [];

  const savedRecordCount =
    savedRecordsResult.status === "fulfilled" ? (savedRecordsResult.value.data ?? []).length : 0;

  const readingListCount =
    readingListsResult.status === "fulfilled" ? (readingListsResult.value.data ?? []).length : 0;

  const communityPostCount =
    communityPostsResult.status === "fulfilled"
      ? (communityPostsResult.value.data ?? []).length
      : 0;

  const communityCommentCount =
    communityCommentsResult.status === "fulfilled"
      ? (communityCommentsResult.value.data ?? []).length
      : 0;

  const totalDuration = sessions.reduce((sum, s) => sum + num(s, "duration_seconds"), 0);

  return {
    profile,
    authLastSignIn,
    recentActivity: activity,
    recentSearches: searches,
    recentSessions: sessions,
    recentErrors: errors,
    featureUsage: countByLabel(activity, "area"),
    stats: {
      totalSearches: searches.length,
      totalSessions: sessions.length,
      totalEvents: activity.length,
      totalErrors: errors.length,
      savedRecords: savedRecordCount,
      readingLists: readingListCount,
      communityPosts: communityPostCount,
      communityComments: communityCommentCount,
    },
  };
}
