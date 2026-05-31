"use server";

import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import {
  DEFAULT_ADMIN_DASHBOARD_PREFERENCES,
  parseDateRangeFromLayout,
  VALID_ADMIN_DATE_RANGES,
  VALID_ADMIN_WORKSPACE_TABS,
  VALID_ADMIN_WORKSPACE_TOOLS,
  type AdminDashboardPreferences,
  type AdminDateRange,
  type AdminWorkspaceTabId,
  type AdminWorkspaceToolId,
} from "./types";

type ActionErr = { ok: false; error: string };
type ActionOk<T> = { ok: true; data: T };

function err(message: string): ActionErr {
  return { ok: false, error: message };
}

function normalizePreferences(data: {
  pinned_tools: unknown;
  active_tab: unknown;
  layout: unknown;
}): AdminDashboardPreferences {
  const layout = (data.layout as Record<string, unknown>) ?? {};
  const pinned = Array.isArray(data.pinned_tools)
    ? (data.pinned_tools as string[]).filter((t): t is AdminWorkspaceToolId =>
        VALID_ADMIN_WORKSPACE_TOOLS.has(t as AdminWorkspaceToolId),
      )
    : [];

  const activeTab = VALID_ADMIN_WORKSPACE_TABS.has(data.active_tab as AdminWorkspaceTabId)
    ? (data.active_tab as AdminWorkspaceTabId)
    : "overview";

  return {
    pinned_tools: pinned,
    active_tab: activeTab,
    date_range: parseDateRangeFromLayout(layout),
    layout,
  };
}

export async function fetchAdminDashboardPreferences(): Promise<
  ActionOk<AdminDashboardPreferences> | ActionErr
> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_dashboard_preferences")
    .select("pinned_tools, active_tab, layout")
    .eq("user_id", admin.id)
    .maybeSingle();

  if (error) {
    if (error.message.includes("admin_dashboard_preferences")) {
      return { ok: true, data: DEFAULT_ADMIN_DASHBOARD_PREFERENCES };
    }
    return err(error.message);
  }

  if (!data) {
    return { ok: true, data: DEFAULT_ADMIN_DASHBOARD_PREFERENCES };
  }

  return { ok: true, data: normalizePreferences(data) };
}

export async function saveAdminDashboardPreferences(input: {
  pinned_tools?: AdminWorkspaceToolId[];
  active_tab?: AdminWorkspaceTabId;
  date_range?: AdminDateRange;
  layout?: Record<string, unknown>;
}): Promise<ActionOk<AdminDashboardPreferences> | ActionErr> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const current = await fetchAdminDashboardPreferences();
  if (!current.ok) return current;

  const pinned_tools = input.pinned_tools ?? current.data.pinned_tools;
  const active_tab = input.active_tab ?? current.data.active_tab;
  const date_range = input.date_range ?? current.data.date_range;
  const layout = {
    ...current.data.layout,
    ...(input.layout ?? {}),
    date_range,
  };

  const { data, error } = await supabase
    .from("admin_dashboard_preferences")
    .upsert(
      {
        user_id: admin.id,
        pinned_tools,
        active_tab,
        layout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("pinned_tools, active_tab, layout")
    .single();

  if (error) return err(error.message);

  return { ok: true, data: normalizePreferences(data) };
}

export async function togglePinnedTool(
  toolId: AdminWorkspaceToolId,
): Promise<ActionOk<AdminDashboardPreferences> | ActionErr> {
  const current = await fetchAdminDashboardPreferences();
  if (!current.ok) return current;

  const set = new Set(current.data.pinned_tools);
  if (set.has(toolId)) {
    set.delete(toolId);
  } else {
    set.add(toolId);
  }

  return saveAdminDashboardPreferences({ pinned_tools: [...set] });
}

export async function saveActiveTab(
  active_tab: AdminWorkspaceTabId,
): Promise<ActionOk<AdminDashboardPreferences> | ActionErr> {
  if (!VALID_ADMIN_WORKSPACE_TABS.has(active_tab)) return err("Invalid tab.");
  return saveAdminDashboardPreferences({ active_tab });
}

export async function saveDateRange(
  date_range: AdminDateRange,
): Promise<ActionOk<AdminDashboardPreferences> | ActionErr> {
  if (!VALID_ADMIN_DATE_RANGES.has(date_range)) return err("Invalid date range.");
  return saveAdminDashboardPreferences({ date_range });
}
