import Link from "next/link";
import { requireAdmin } from "@/src/lib/auth";
import { getAdminWorkspaceSnapshot } from "@/lib/admin-workspace-snapshot";
import { fetchAdminDashboardPreferences } from "@/app/(admin)/admin/workspace-preferences/actions";
import { DEFAULT_ADMIN_DASHBOARD_PREFERENCES } from "@/app/(admin)/admin/workspace-preferences/types";
import { getAdminNotifications, getUnreadAdminNotificationCount } from "@/lib/admin-notifications";
import AdminWorkspaceShell from "@/src/components/admin/AdminWorkspaceShell";

export default async function AdminAnalyticsPage() {
  const admin = await requireAdmin();
  const preferencesResult = await fetchAdminDashboardPreferences();
  const preferences = preferencesResult.ok
    ? preferencesResult.data
    : DEFAULT_ADMIN_DASHBOARD_PREFERENCES;

  const [snapshot, urgentNotifs, unreadCount] = await Promise.all([
    getAdminWorkspaceSnapshot(preferences.date_range),
    getAdminNotifications(admin.id, "urgent", 5).catch(() => []),
    getUnreadAdminNotificationCount(admin.id).catch(() => 0),
  ]);

  const urgentUnread = urgentNotifs.filter((n) => n.status === "unread");

  return (
    <>
      {urgentUnread.length > 0 ? (
        <div className="admin-urgent-strip" role="alert">
          <strong>
            {urgentUnread.length === 1
              ? "1 urgent alert:"
              : `${urgentUnread.length} urgent alerts:`}
          </strong>
          {urgentUnread.slice(0, 3).map((n) => (
            <span key={n.id} className="admin-urgent-strip__item">{n.title}</span>
          ))}
          <Link href="/admin/notifications?filter=urgent" className="admin-urgent-strip__link">
            View all
          </Link>
        </div>
      ) : null}

      <AdminWorkspaceShell
        adminUserId={admin.id}
        snapshot={snapshot}
        initialPreferences={preferences}
        unreadNotifications={unreadCount}
      />
    </>
  );
}
