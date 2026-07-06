"use server";

import { getAdminWorkspaceSnapshot } from "@/lib/admin-workspace-snapshot";
import { requireAdmin } from "@/src/lib/auth";
import type { AdminDateRange } from "@/app/(admin)/admin/workspace-preferences/types";

export async function refreshAdminWorkspaceSnapshot(dateRange: AdminDateRange = "7d") {
  await requireAdmin();
  return getAdminWorkspaceSnapshot(dateRange);
}
