// Admin shell.
// Gated by requireAdmin() — non-admin signed-in users are bounced to
// /workspace?denied=admin (which shows a notice); anonymous users are
// bounced to /signin?next=/admin.

import type { ReactNode } from "react";
import { requireAdmin } from "@/src/lib/auth";
import AdminAppShell from "./AdminAppShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();
  const name = profile.full_name?.trim() || profile.email || "Admin";

  return <AdminAppShell userName={name}>{children}</AdminAppShell>;
}
