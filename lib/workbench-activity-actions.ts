"use server";

import { revalidatePath } from "next/cache";
import { logActivityServer } from "@/lib/admin-analytics";
import { createClient } from "@/src/lib/supabase/server";

export type WorkbenchActivityEventType =
  | "record_saved"
  | "record_added_to_reading_list"
  | "record_added_to_project"
  | "note_created"
  | "note_updated"
  | "citation_inserted"
  | "board_card_created"
  | "board_card_sent_to_document"
  | "canvas_block_created"
  | "task_created"
  | "export_created"
  | "extraction_field_created"
  | "extraction_upserted"
  | "assignment_created"
  | "comment_created"
  | "search_saved"
  | "source_handoff_clicked"
  | "record_viewed"
  | "screening_decision";

export type WorkbenchActivityEntityType =
  | "record"
  | "reading_list"
  | "reading_list_item"
  | "project"
  | "note"
  | "board_card"
  | "canvas_block"
  | "citation"
  | "task"
  | "export"
  | "search"
  | "review_screening"
  | "review_extraction"
  | "assignment"
  | "review_comment";

import type { WorkbenchUserPreferences } from "@/lib/workbench-intelligence-types";

export type WorkbenchUserPreferencesRow = WorkbenchUserPreferences;

const INTELLIGENCE_PATH = "/my/workbench/intelligence";

function parseDismissed(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function trackWorkbenchActivity(input: {
  eventType: WorkbenchActivityEventType;
  entityType: WorkbenchActivityEntityType;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const { error } = await supabase.from("workbench_activity_events").insert({
      user_id: user.id,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      project_id: input.projectId ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) return { ok: false };

    void logActivityServer({
      eventType: input.eventType,
      area: "workbench",
      action: input.eventType,
      targetType: input.entityType,
      targetId: input.entityId,
      metadata: {
        projectId: input.projectId,
        ...(input.metadata ?? {}),
      },
    });

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getWorkbenchUserPreferences(): Promise<WorkbenchUserPreferencesRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("workbench_user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      user_id: user.id,
      preferred_citation_style: "apa7",
      preferred_board_view: "comfortable",
      preferred_note_mode: "document",
      dismissed_suggestions: [],
      pinned_collections: [],
      updated_at: new Date().toISOString(),
    };
  }

  const row = data as Record<string, unknown>;
  return {
    user_id: user.id,
    preferred_citation_style:
      typeof row.preferred_citation_style === "string" ? row.preferred_citation_style : "apa7",
    preferred_board_view:
      typeof row.preferred_board_view === "string" ? row.preferred_board_view : "comfortable",
    preferred_note_mode:
      typeof row.preferred_note_mode === "string" ? row.preferred_note_mode : "document",
    dismissed_suggestions: parseDismissed(row.dismissed_suggestions),
    pinned_collections: parseDismissed(row.pinned_collections),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

async function upsertPreferences(
  patch: Partial<
    Pick<
      WorkbenchUserPreferencesRow,
      | "preferred_citation_style"
      | "preferred_board_view"
      | "preferred_note_mode"
      | "dismissed_suggestions"
      | "pinned_collections"
    >
  >,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const current = await getWorkbenchUserPreferences();
  const next = {
    user_id: user.id,
    preferred_citation_style:
      patch.preferred_citation_style ?? current?.preferred_citation_style ?? "apa7",
    preferred_board_view: patch.preferred_board_view ?? current?.preferred_board_view ?? "comfortable",
    preferred_note_mode: patch.preferred_note_mode ?? current?.preferred_note_mode ?? "document",
    dismissed_suggestions:
      patch.dismissed_suggestions ?? current?.dismissed_suggestions ?? [],
    pinned_collections: patch.pinned_collections ?? current?.pinned_collections ?? [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("workbench_user_preferences").upsert(next, {
    onConflict: "user_id",
  });

  if (error) return { ok: false as const };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const };
}

export async function dismissIntelligenceSuggestion(suggestionId: string) {
  const id = suggestionId.trim();
  if (!id) return { ok: false as const };

  const current = await getWorkbenchUserPreferences();
  if (!current) return { ok: false as const };

  const dismissed = new Set(current.dismissed_suggestions);
  dismissed.add(id);
  return upsertPreferences({ dismissed_suggestions: [...dismissed] });
}

export async function updateWorkbenchUserPreference(
  patch: Partial<
    Pick<
      WorkbenchUserPreferencesRow,
      "preferred_citation_style" | "preferred_board_view" | "preferred_note_mode"
    >
  >,
) {
  return upsertPreferences(patch);
}

export async function listRecentWorkbenchActivity(limit = 12) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workbench_activity_events")
    .select("event_type, entity_type, entity_id, project_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data as Array<{
    event_type: string;
    entity_type: string;
    entity_id: string | null;
    project_id: string | null;
    created_at: string;
  }>;
}

export async function refreshIntelligenceSnapshot() {
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const };
}

export async function clearResearchActivity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase
    .from("workbench_activity_events")
    .delete()
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(INTELLIGENCE_PATH);
  return { ok: true as const };
}
