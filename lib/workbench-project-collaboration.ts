/** Shared types and helpers for workbench project collaboration (Stages 2–3). */

export type WorkbenchCollaborationNoteMode = "document" | "board" | "canvas";

export const WORKBENCH_PRESENCE_STALE_MS = 45_000;
export const WORKBENCH_PRESENCE_HEARTBEAT_MS = 12_000;
export const WORKBENCH_NOTE_VERSION_LIMIT = 30;
export const WORKBENCH_CANVAS_LOCK_TTL_MS = 90_000;

export type WorkbenchProjectPresenceRow = {
  id: string;
  project_id: string;
  user_id: string;
  note_id: string | null;
  note_mode: WorkbenchCollaborationNoteMode | null;
  display_name: string | null;
  last_seen_at: string;
};

export type WorkbenchProjectActivityRow = {
  id: string;
  project_id: string;
  user_id: string;
  note_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WorkbenchNoteVersionRow = {
  id: string;
  note_id: string;
  project_id: string | null;
  saved_by: string;
  title: string;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  plain_text: string | null;
  word_count: number | null;
  character_count: number | null;
  created_at: string;
};

export type WorkbenchCanvasObjectLockRow = {
  note_id: string;
  object_id: string;
  user_id: string;
  display_name: string | null;
  locked_at: string;
  expires_at: string;
};

export type WorkbenchProjectCommentRow = {
  id: string;
  project_id: string;
  note_id: string | null;
  user_id: string;
  body: string;
  anchor_type: string | null;
  anchor_id: string | null;
  created_at: string;
  updated_at: string;
};

export function presenceInitials(name: string | null | undefined, userId: string): string {
  const trimmed = (name ?? "").trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return userId.replace(/-/g, "").slice(0, 2).toUpperCase() || "?";
}

export function presenceColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 62% 42%)`;
}

export function noteModeLabel(mode: string | null | undefined): string {
  if (mode === "canvas") return "Canvas";
  if (mode === "board") return "Board";
  if (mode === "document") return "Document";
  return "Workbench";
}

export function buildNoteSaveActivitySummary(input: {
  mode?: string | null;
  noteTitle?: string | null;
}): string {
  const mode = noteModeLabel(input.mode);
  const title = input.noteTitle?.trim();
  return title ? `updated ${mode}: ${title}` : `updated ${mode}`;
}

export function isPresenceStale(lastSeenAt: string, now = Date.now()): boolean {
  const ts = Date.parse(lastSeenAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts > WORKBENCH_PRESENCE_STALE_MS;
}

export function isCanvasLockActive(lock: WorkbenchCanvasObjectLockRow, now = Date.now()): boolean {
  const expires = Date.parse(lock.expires_at);
  return Number.isFinite(expires) && expires > now;
}
