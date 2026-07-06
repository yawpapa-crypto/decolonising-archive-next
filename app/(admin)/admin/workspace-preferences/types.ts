export type AdminWorkspaceToolId =
  | "analytics"
  | "kanban"
  | "projects"
  | "calendar"
  | "chat"
  | "errors"
  | "users"
  | "searches";

export type AdminWorkspaceTabId =
  | "overview"
  | "activity"
  | "users"
  | "searches"
  | "projects"
  | "calendar"
  | "chat"
  | "errors"
  | "settings";

export type AdminDateRange = "today" | "7d" | "30d" | "all";

export type AdminDashboardPreferences = {
  pinned_tools: AdminWorkspaceToolId[];
  active_tab: AdminWorkspaceTabId;
  date_range: AdminDateRange;
  layout: Record<string, unknown>;
};

export const DEFAULT_ADMIN_DASHBOARD_PREFERENCES: AdminDashboardPreferences = {
  pinned_tools: [],
  active_tab: "overview",
  date_range: "7d",
  layout: {},
};

export const VALID_ADMIN_WORKSPACE_TOOLS = new Set<AdminWorkspaceToolId>([
  "analytics",
  "kanban",
  "projects",
  "calendar",
  "chat",
  "errors",
  "users",
  "searches",
]);

export const VALID_ADMIN_WORKSPACE_TABS = new Set<AdminWorkspaceTabId>([
  "overview",
  "activity",
  "users",
  "searches",
  "projects",
  "calendar",
  "chat",
  "errors",
  "settings",
]);

export const VALID_ADMIN_DATE_RANGES = new Set<AdminDateRange>(["today", "7d", "30d", "all"]);

export function parseDateRangeFromLayout(layout: Record<string, unknown>): AdminDateRange {
  const fromLayout = layout.date_range;
  if (typeof fromLayout === "string" && VALID_ADMIN_DATE_RANGES.has(fromLayout as AdminDateRange)) {
    return fromLayout as AdminDateRange;
  }
  return "7d";
}
