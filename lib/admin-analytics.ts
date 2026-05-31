import "server-only";
import { createAdminNotification } from "@/lib/admin-notifications";

import { createHash } from "node:crypto";

import { getSupabase } from "@/src/lib/supabase";
import { createClient } from "@/src/lib/supabase/server";

type JsonRecord = Record<string, unknown>;

export type AnalyticsEventInput = {
  eventType: string;
  area?: string | null;
  action?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  query?: string | null;
  metadata?: JsonRecord | null;
  path?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
};

export type SearchEventInput = {
  query: string;
  sourceScope?: string | null;
  resultCount?: number | null;
  externalResultCount?: number | null;
  localResultCount?: number | null;
  durationMs?: number | null;
  status?: string | null;
  metadata?: JsonRecord | null;
  sessionId?: string | null;
};

export type ErrorEventInput = {
  area?: string | null;
  message: string;
  code?: string | null;
  metadata?: JsonRecord | null;
  sessionId?: string | null;
};

export type AnalyticsResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

const PRIVATE_METADATA_KEYS = new Set([
  "access_token",
  "accessToken",
  "body",
  "canvasContent",
  "canvasObjects",
  "content",
  "contentJson",
  "documentBody",
  "html",
  "markdown",
  "noteBody",
  "noteContent",
  "password",
  "plainText",
  "privateDraft",
  "refresh_token",
  "refreshToken",
  "secret",
  "text",
  "token",
]);

function clampText(value: string, maxLength = 512) {
  return value.trim().slice(0, maxLength);
}

function clampOptionalText(value: string | null | undefined, maxLength = 512) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function toInteger(value: number | null | undefined, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value as number));
}

export function sanitizeAnalyticsMetadata(input: unknown, depth = 0): JsonRecord {
  if (!input || typeof input !== "object" || Array.isArray(input) || depth > 2) {
    return {};
  }

  const output: JsonRecord = {};

  for (const [key, value] of Object.entries(input as JsonRecord)) {
    if (PRIVATE_METADATA_KEYS.has(key)) continue;

    if (value === null || value === undefined) {
      output[key] = value;
      continue;
    }

    if (typeof value === "string") {
      output[key] = clampText(value, 180);
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      output[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      output[key] = value.slice(0, 20).map((item) => {
        if (typeof item === "string") return clampText(item, 120);
        if (typeof item === "number" || typeof item === "boolean" || item === null) return item;
        return "[redacted]";
      });
      continue;
    }

    if (typeof value === "object") {
      output[key] = sanitizeAnalyticsMetadata(value, depth + 1);
    }
  }

  return output;
}

function hashIpAddress(ip: string | null | undefined) {
  const cleaned = ip?.split(",")[0]?.trim();
  if (!cleaned) return null;
  const salt = process.env.ANALYTICS_IP_SALT || process.env.NEXT_PUBLIC_SITE_URL || "decolonising-archive";
  return createHash("sha256").update(`${salt}:${cleaned}`).digest("hex");
}

async function getRequestUserId() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function updateProfileSeen(userId: string | null, markLogin = false) {
  if (!userId) return;

  const updates: JsonRecord = {
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (markLogin) {
    updates.last_login_at = new Date().toISOString();
  }

  await getSupabase().from("profiles").update(updates).eq("id", userId);
}

async function upsertSession(input: AnalyticsEventInput, userId: string | null) {
  const sessionId = clampOptionalText(input.sessionId, 160);
  if (!sessionId) return;

  const now = new Date();
  const existing = await getSupabase()
    .from("user_sessions")
    .select("id, started_at, path_first")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing.error) return;

  if (!existing.data) {
    await getSupabase().from("user_sessions").insert({
      user_id: userId,
      session_id: sessionId,
      started_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      duration_seconds: 0,
      path_first: clampOptionalText(input.path, 512),
      path_last: clampOptionalText(input.path, 512),
      user_agent: clampOptionalText(input.userAgent, 512),
      metadata: sanitizeAnalyticsMetadata(input.metadata),
    });
    return;
  }

  const startedAt = existing.data.started_at ? new Date(existing.data.started_at) : now;
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

  await getSupabase()
    .from("user_sessions")
    .update({
      user_id: userId,
      last_seen_at: now.toISOString(),
      duration_seconds: durationSeconds,
      path_last: clampOptionalText(input.path, 512),
      user_agent: clampOptionalText(input.userAgent, 512),
      metadata: sanitizeAnalyticsMetadata(input.metadata),
    })
    .eq("session_id", sessionId);
}

export async function logActivityServer(input: AnalyticsEventInput): Promise<AnalyticsResult> {
  try {
    const eventType = clampText(input.eventType, 120);
    if (!eventType) return { ok: false, error: "Missing event type", code: "missing_event_type" };

    const userId = await getRequestUserId();
    const isSessionStart = eventType === "session_start";

    await getSupabase().from("user_activity_events").insert({
      user_id: userId,
      session_id: clampOptionalText(input.sessionId, 160),
      event_type: eventType,
      area: clampOptionalText(input.area, 80),
      action: clampOptionalText(input.action, 80),
      target_type: clampOptionalText(input.targetType, 80),
      target_id: clampOptionalText(input.targetId, 160),
      query: clampOptionalText(input.query, 512),
      metadata: sanitizeAnalyticsMetadata(input.metadata),
      path: clampOptionalText(input.path, 512),
      referrer: clampOptionalText(input.referrer, 512),
      user_agent: clampOptionalText(input.userAgent, 512),
      ip_hash: hashIpAddress(input.ip),
    });

    await Promise.allSettled([upsertSession(input, userId), updateProfileSeen(userId, isSessionStart)]);

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not log activity",
      code: "activity_log_failed",
    };
  }
}

export async function logSearchEvent(input: SearchEventInput): Promise<AnalyticsResult> {
  try {
    const query = clampText(input.query, 512);
    if (!query) return { ok: false, error: "Missing search query", code: "missing_query" };

    const userId = await getRequestUserId();

    await getSupabase().from("search_events").insert({
      user_id: userId,
      session_id: clampOptionalText(input.sessionId, 160),
      query,
      source_scope: clampOptionalText(input.sourceScope, 120),
      result_count: toInteger(input.resultCount),
      external_result_count: toInteger(input.externalResultCount),
      local_result_count: toInteger(input.localResultCount),
      duration_ms: input.durationMs == null ? null : toInteger(input.durationMs),
      status: clampOptionalText(input.status, 40) ?? "success",
      metadata: sanitizeAnalyticsMetadata(input.metadata),
    });

    await logActivityServer({
      eventType: input.status === "failed" ? "search_failed" : "search_submitted",
      area: "library",
      action: "search",
      query,
      sessionId: input.sessionId,
      metadata: {
        sourceScope: input.sourceScope,
        resultCount: input.resultCount,
        externalResultCount: input.externalResultCount,
        localResultCount: input.localResultCount,
        durationMs: input.durationMs,
        status: input.status ?? "success",
      },
    });

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not log search",
      code: "search_log_failed",
    };
  }
}

export async function logErrorEvent(input: ErrorEventInput): Promise<AnalyticsResult> {
  try {
    const message = clampText(input.message, 512);
    if (!message) return { ok: false, error: "Missing error message", code: "missing_error_message" };

    const userId = await getRequestUserId();

    await getSupabase().from("app_error_logs").insert({
      user_id: userId,
      session_id: clampOptionalText(input.sessionId, 160),
      area: clampOptionalText(input.area, 120),
      message,
      code: clampOptionalText(input.code, 120),
      metadata: sanitizeAnalyticsMetadata(input.metadata),
    });

    // Notify admins of errors — schema errors are urgent
    const isSchema = input.code === "schema_error" || message.toLowerCase().includes("schema");
    void createAdminNotification({
      type: isSchema ? "schema_error" : "app_error_logged",
      title: isSchema ? "Schema or database error detected" : "Application error logged",
      body: `[${input.area ?? "app"}] ${message.slice(0, 200)}`,
      severity: isSchema ? "urgent" : "warning",
      targetType: "error_log",
      metadata: { area: input.area ?? null, code: input.code ?? null },
    });

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not log error",
      code: "error_log_failed",
    };
  }
}

type RawAnalyticsRow = Record<string, unknown>;

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

function rowString(row: RawAnalyticsRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

async function getProfilesMap(ids: Array<string | null | undefined>) {
  const uniqueIds = [...new Set(ids.filter(Boolean) as string[])];
  if (uniqueIds.length === 0) return new Map<string, RawAnalyticsRow>();

  const { data } = await getSupabase()
    .from("profiles")
    .select("id, email, full_name, display_name, role, last_login_at, last_seen_at")
    .in("id", uniqueIds);

  return new Map((data ?? []).map((profile: RawAnalyticsRow) => [profile.id, profile]));
}

export async function getAdminAnalyticsSnapshot() {
  const now = Date.now();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    sessionsResult,
    recentSearchesResult,
    searchWindowResult,
    activityResult,
    recentErrorsResult,
    profilesResult,
  ] = await Promise.all([
    getSupabase()
      .from("user_sessions")
      .select("id, user_id, session_id, started_at, last_seen_at, duration_seconds, path_last, user_agent")
      .gte("last_seen_at", fiveMinutesAgo)
      .order("last_seen_at", { ascending: false })
      .limit(40),
    getSupabase()
      .from("search_events")
      .select("id, user_id, query, source_scope, result_count, local_result_count, external_result_count, duration_ms, status, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    getSupabase()
      .from("search_events")
      .select("query, created_at, status")
      .gte("created_at", weekAgo)
      .limit(1000),
    getSupabase()
      .from("user_activity_events")
      .select("id, user_id, event_type, area, action, target_type, target_id, path, created_at, metadata")
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(300),
    getSupabase()
      .from("app_error_logs")
      .select("id, user_id, area, message, code, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    getSupabase()
      .from("profiles")
      .select("id, email, full_name, display_name, role, last_login_at, last_seen_at, created_at")
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(120),
  ]);

  const sessions = (sessionsResult.data ?? []) as RawAnalyticsRow[];
  const recentSearches = (recentSearchesResult.data ?? []) as RawAnalyticsRow[];
  const searchWindow = (searchWindowResult.data ?? []) as RawAnalyticsRow[];
  const activity = (activityResult.data ?? []) as RawAnalyticsRow[];
  const errors = (recentErrorsResult.data ?? []) as RawAnalyticsRow[];
  const profiles = (profilesResult.data ?? []) as RawAnalyticsRow[];
  const profileMap = await getProfilesMap([
    ...sessions.map((item) => rowString(item, "user_id")),
    ...recentSearches.map((item) => rowString(item, "user_id")),
    ...activity.map((item) => rowString(item, "user_id")),
    ...errors.map((item) => rowString(item, "user_id")),
  ]);

  const todaySearches = searchWindow.filter((item) => rowString(item, "created_at") >= dayAgo);

  return {
    liveUsers: sessions.map((session) => ({
      ...session,
      profile: typeof session.user_id === "string" ? profileMap.get(session.user_id) ?? null : null,
    })),
    recentSearches: recentSearches.map((search) => ({
      ...search,
      profile: typeof search.user_id === "string" ? profileMap.get(search.user_id) ?? null : null,
    })),
    popularSearchesToday: topEntries(countBy(todaySearches.map((item) => rowString(item, "query")))),
    popularSearchesWeek: topEntries(countBy(searchWindow.map((item) => rowString(item, "query")))),
    featureUsage: topEntries(
      countBy(activity.map((item) => rowString(item, "area") || rowString(item, "event_type"))),
      10,
    ),
    recentActivity: activity.slice(0, 40).map((event) => ({
      ...event,
      profile: typeof event.user_id === "string" ? profileMap.get(event.user_id) ?? null : null,
    })),
    errors: errors.map((error) => ({
      ...error,
      profile: typeof error.user_id === "string" ? profileMap.get(error.user_id) ?? null : null,
    })),
    users: profiles.map((profile) => ({
      ...profile,
      sessionCount: sessions.filter((session) => session.user_id === profile.id).length,
      searchCount: recentSearches.filter((search) => search.user_id === profile.id).length,
    })),
    tableErrors: {
      sessions: sessionsResult.error?.message ?? null,
      searches: recentSearchesResult.error?.message ?? null,
      activity: activityResult.error?.message ?? null,
      errors: recentErrorsResult.error?.message ?? null,
      profiles: profilesResult.error?.message ?? null,
    },
  };
}
