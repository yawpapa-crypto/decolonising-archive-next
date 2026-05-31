import "server-only";

import type { AdminDateRange } from "@/app/(admin)/admin/workspace-preferences/types";
import { getAdminAnalyticsSnapshot } from "@/lib/admin-analytics";
import { getSupabase } from "@/src/lib/supabase";

type RawRow = Record<string, unknown>;

export type ChartPoint = { label: string; count: number; key?: string };
export type RankedItem = { label: string; count: number; userId?: string | null; max?: number };

function rowString(row: RawRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item) return acc;
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts: Record<string, number>, limit = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function getRangeBounds(dateRange: AdminDateRange) {
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  if (dateRange === "today") {
    return { since: dayStart.toISOString(), dayStartIso: dayStart.toISOString(), bucketMode: "hour" as const };
  }
  if (dateRange === "7d") {
    return {
      since: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      dayStartIso: dayStart.toISOString(),
      bucketMode: "day" as const,
    };
  }
  if (dateRange === "30d") {
    return {
      since: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      dayStartIso: dayStart.toISOString(),
      bucketMode: "day" as const,
    };
  }
  return { since: null, dayStartIso: dayStart.toISOString(), bucketMode: "day" as const };
}

function hourBuckets(rows: RawRow[]) {
  const buckets: ChartPoint[] = [];
  const now = new Date();
  for (let h = 0; h < 24; h += 1) {
    const d = new Date(now);
    d.setHours(h, 0, 0, 0);
    buckets.push({
      key: String(h),
      label: d.toLocaleTimeString(undefined, { hour: "numeric" }),
      count: 0,
    });
  }
  for (const row of rows) {
    const created = rowString(row, "created_at");
    if (!created) continue;
    const hour = new Date(created).getHours();
    if (buckets[hour]) buckets[hour].count += 1;
  }
  return buckets;
}

function dayBuckets(rows: RawRow[], days: number) {
  const now = new Date();
  const buckets: ChartPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      count: 0,
    });
  }

  const keyToIndex = new Map(buckets.map((b, i) => [b.key!, i]));
  for (const row of rows) {
    const created = rowString(row, "created_at").slice(0, 10);
    const idx = keyToIndex.get(created);
    if (idx !== undefined) buckets[idx].count += 1;
  }
  return buckets;
}

function timeSeries(rows: RawRow[], dateRange: AdminDateRange, bucketMode: "hour" | "day") {
  if (bucketMode === "hour" || dateRange === "today") return hourBuckets(rows);
  const days = dateRange === "30d" ? 30 : dateRange === "all" ? 90 : 7;
  return dayBuckets(rows, days);
}

function rankedWithMax(items: { label: string; count: number; userId?: string | null }[]): RankedItem[] {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  return items.map((item) => ({ ...item, max }));
}

export async function getAdminWorkspaceSnapshot(dateRange: AdminDateRange = "7d") {
  const { since, dayStartIso, bucketMode } = getRangeBounds(dateRange);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const analytics = await getAdminAnalyticsSnapshot();
  const db = getSupabase();

  const applySince = <T extends { gte: (col: string, val: string) => T }>(q: T) =>
    since ? q.gte("created_at", since) : q;

  const [
    searchesTodayResult,
    newUsersResult,
    workbenchEventsResult,
    communityPostsResult,
    communityCommentsResult,
    openTasksResult,
    activeProjectsResult,
    upcomingEventsResult,
    unresolvedFeedbackResult,
    unresolvedModerationResult,
    errorsTodayResult,
    errorsRangeResult,
    searchRangeResult,
    activityRangeResult,
    sessionsRangeResult,
    activeUsersResult,
    externalFailuresResult,
    workbenchNotesResult,
    totalUsersResult,
    chatMessagesResult,
    totalEventsResult,
    activeNowResult,
  ] = await Promise.all([
    db.from("search_events").select("id", { count: "exact", head: true }).gte("created_at", dayStartIso),
    applySince(db.from("profiles").select("id", { count: "exact", head: true })),
    applySince(db.from("user_activity_events").select("id", { count: "exact", head: true }).eq("area", "workbench")),
    applySince(db.from("community_posts").select("id", { count: "exact", head: true })),
    applySince(db.from("community_comments").select("id", { count: "exact", head: true })),
    db.from("admin_kanban_tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
    db.from("admin_projects").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("admin_calendar_events").select("id", { count: "exact", head: true }).gte("event_date", dayStartIso.slice(0, 10)),
    db.from("feedback_reports").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing"]),
    db.from("community_reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    db.from("app_error_logs").select("id", { count: "exact", head: true }).gte("created_at", dayStartIso),
    applySince(
      db.from("app_error_logs").select("id, area, code, message, created_at, user_id, metadata").order("created_at", { ascending: false }).limit(500),
    ),
    applySince(
      db
        .from("search_events")
        .select("query, created_at, status, duration_ms, result_count, local_result_count, external_result_count, source_scope, user_id")
        .order("created_at", { ascending: false })
        .limit(2000),
    ),
    applySince(
      db
        .from("user_activity_events")
        .select("id, user_id, event_type, area, action, target_type, target_id, path, query, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ),
    applySince(
      db
        .from("user_sessions")
        .select("id, started_at, last_seen_at, user_id")
        .order("last_seen_at", { ascending: false })
        .limit(2000),
    ),
    applySince(
      db.from("user_activity_events").select("user_id").not("user_id", "is", null).limit(5000),
    ),
    applySince(
      db
        .from("app_error_logs")
        .select("id, area, message, code, metadata, created_at, user_id")
        .or("area.ilike.%source%,area.ilike.%external%,message.ilike.%fetch%")
        .order("created_at", { ascending: false })
        .limit(30),
    ),
    db.from("workbench_notes").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }),
    applySince(db.from("admin_chat_messages").select("id", { count: "exact", head: true })),
    applySince(db.from("user_activity_events").select("id", { count: "exact", head: true })),
    db.from("user_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", fiveMinutesAgo),
  ]);

  const searchRange = (searchRangeResult.data ?? []) as RawRow[];
  const activityRange = (activityRangeResult.data ?? []) as RawRow[];
  const sessionsRange = (sessionsRangeResult.data ?? []) as RawRow[];
  const errorsRange = (errorsRangeResult.data ?? []) as RawRow[];
  const activeUserIds = (activeUsersResult.data ?? []) as RawRow[];

  const profileIds = [...new Set(activeUserIds.map((r) => rowString(r, "user_id")).filter(Boolean))];
  let mostActiveUsers: RankedItem[] = [];
  if (profileIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email, full_name, display_name")
      .in("id", profileIds.slice(0, 80));

    const profileMap = new Map(
      (profiles ?? []).map((p: RawRow) => [
        rowString(p, "id"),
        rowString(p, "display_name") || rowString(p, "full_name") || rowString(p, "email") || "Member",
      ]),
    );

    const userCounts = countBy(activeUserIds.map((r) => rowString(r, "user_id")));
    mostActiveUsers = rankedWithMax(
      topEntries(userCounts, 10).map(({ label, count }) => ({
        label: profileMap.get(label) ?? label.slice(0, 8),
        count,
        userId: label,
      })),
    );
  }

  const failedSearches = searchRange.filter((s) => rowString(s, "status") === "failed");
  const zeroResultSearches = searchRange.filter((s) => Number(s.result_count ?? 0) === 0);
  const durations = searchRange
    .map((s) => (typeof s.duration_ms === "number" ? s.duration_ms : null))
    .filter((v): v is number => v !== null);
  const avgDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const featureCounts = countBy(
    activityRange.map((row) => rowString(row, "area") || rowString(row, "event_type") || "platform"),
  );
  const featureUsage = rankedWithMax(topEntries(featureCounts, 10));

  const searchQueryCounts = countBy(searchRange.map((s) => rowString(s, "query")).filter(Boolean));
  const topSearches = rankedWithMax(topEntries(searchQueryCounts, 10));

  const errorsByArea = rankedWithMax(topEntries(countBy(errorsRange.map((e) => rowString(e, "area") || "app")), 8));
  const errorsByCode = rankedWithMax(topEntries(countBy(errorsRange.map((e) => rowString(e, "code") || "unknown")), 8));

  const sourceScopes = countBy(searchRange.map((s) => rowString(s, "source_scope") || "all").filter(Boolean));
  const sourceHealth = topEntries(sourceScopes, 12).map(({ label, count }) => ({
    label,
    success: count,
    failures: failedSearches.filter((s) => rowString(s, "source_scope") === label || (!rowString(s, "source_scope") && label === "all")).length,
  }));

  const enrichedUsers = await Promise.all(
    analytics.users.slice(0, 80).map(async (user) => {
      const row = user as RawRow;
      const uid = rowString(row, "id");
      if (!uid) {
        return {
          ...row,
          sessionCount: user.sessionCount,
          searchCount: user.searchCount,
          communityPostsCount: 0,
          communityCommentsCount: 0,
          workbenchActionsCount: 0,
        };
      }

      const [posts, comments, workbench] = await Promise.all([
        db.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", uid),
        db.from("community_comments").select("id", { count: "exact", head: true }).eq("user_id", uid),
        db.from("user_activity_events").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("area", "workbench"),
      ]);

      return {
        ...row,
        sessionCount: user.sessionCount,
        searchCount: user.searchCount,
        communityPostsCount: posts.count ?? 0,
        communityCommentsCount: comments.count ?? 0,
        workbenchActionsCount: workbench.count ?? 0,
      };
    }),
  );

  const activityProfileIds = [
    ...new Set(activityRange.slice(0, 50).map((r) => rowString(r, "user_id")).filter(Boolean)),
  ];
  const activityProfileMap = new Map<string, RawRow>();
  if (activityProfileIds.length > 0) {
    const { data: activityProfiles } = await db
      .from("profiles")
      .select("id, email, full_name, display_name")
      .in("id", activityProfileIds);
    for (const p of activityProfiles ?? []) {
      activityProfileMap.set(rowString(p as RawRow, "id"), p as RawRow);
    }
  }

  const activityStream = activityRange.slice(0, 40).map((event) => ({
    ...event,
    profile: activityProfileMap.get(rowString(event, "user_id")) ?? null,
  }));

  return {
    ...analytics,
    dateRange,
    users: enrichedUsers,
    counts: {
      activeNow: activeNowResult.count ?? analytics.liveUsers.length,
      searchesToday: searchesTodayResult.count ?? 0,
      searchesInRange: searchRange.length,
      newUsersInRange: newUsersResult.count ?? 0,
      workbenchActionsInRange: workbenchEventsResult.count ?? 0,
      communityPostsInRange: communityPostsResult.count ?? 0,
      communityCommentsInRange: communityCommentsResult.count ?? 0,
      openTasks: openTasksResult.count ?? 0,
      activeProjects: activeProjectsResult.count ?? 0,
      upcomingEvents: upcomingEventsResult.count ?? 0,
      unresolvedReports: (unresolvedFeedbackResult.count ?? 0) + (unresolvedModerationResult.count ?? 0),
      errorsToday: errorsTodayResult.count ?? 0,
      errorsInRange: errorsRange.length,
      workbenchNotesTotal: workbenchNotesResult.count ?? 0,
      totalUsers: totalUsersResult.count ?? 0,
      chatMessagesInRange: chatMessagesResult.count ?? 0,
      totalEventsInRange: totalEventsResult.count ?? 0,
    },
    toolCounts: {
      analytics: totalEventsResult.count ?? 0,
      kanban: openTasksResult.count ?? 0,
      projects: activeProjectsResult.count ?? 0,
      calendar: upcomingEventsResult.count ?? 0,
      chat: chatMessagesResult.count ?? 0,
      errors: errorsTodayResult.count ?? 0,
      users: totalUsersResult.count ?? 0,
      searches: searchesTodayResult.count ?? 0,
    },
    searchesOverTime: timeSeries(searchRange, dateRange, bucketMode),
    sessionsOverTime: timeSeries(
      sessionsRange.map((s) => ({ ...s, created_at: rowString(s, "last_seen_at") || rowString(s, "started_at") })),
      dateRange,
      bucketMode,
    ),
    errorsOverTime: timeSeries(errorsRange, dateRange, bucketMode),
    featureUsage,
    topSearches,
    mostActiveUsers,
    externalSourceFailures: (externalFailuresResult.data ?? []) as RawRow[],
    errorsByArea,
    errorsByCode,
    sourceHealth,
    activityStream,
    searchAnalytics: {
      failedCount: failedSearches.length,
      zeroResultCount: zeroResultSearches.length,
      avgDurationMs,
      recentFailed: failedSearches.slice(0, 15),
      recentZeroResult: zeroResultSearches.slice(0, 15),
    },
    tableErrors: {
      ...analytics.tableErrors,
      workspaceCounts: searchesTodayResult.error?.message ?? openTasksResult.error?.message ?? null,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export type AdminWorkspaceSnapshot = Awaited<ReturnType<typeof getAdminWorkspaceSnapshot>>;
