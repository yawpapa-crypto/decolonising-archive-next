import { requireAdmin } from "@/src/lib/auth";
import AdminAppsHub from "@/src/components/admin/AdminAppsHub";

export default async function AdminAppsHubSection() {
  const profile = await requireAdmin();
  return <AdminAppsHub adminUserId={profile.id} />;
}
