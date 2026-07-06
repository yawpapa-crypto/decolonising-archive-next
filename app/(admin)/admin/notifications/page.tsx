import Link from "next/link";
import { requireAdmin } from "@/src/lib/auth";
import {
  getAdminNotifications,
  getUnreadAdminNotificationCount,
  type AdminNotificationRow,
} from "@/lib/admin-notifications";
import {
  actionMarkNotificationRead,
  actionMarkAllRead,
  actionArchiveNotification,
} from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SeverityBadge({ severity }: { severity: AdminNotificationRow["severity"] }) {
  const map = {
    urgent:  { label: "Urgent",  cls: "is-urgent" },
    warning: { label: "Warning", cls: "is-warning" },
    success: { label: "OK",      cls: "is-success" },
    info:    { label: "Info",    cls: "is-info" },
  };
  const { label, cls } = map[severity] ?? map.info;
  return <span className={`admin-notif-badge ${cls}`}>{label}</span>;
}

function NotificationCard({ notif }: { notif: AdminNotificationRow }) {
  const isUnread = notif.status === "unread";
  return (
    <article className={`admin-notif-card${isUnread ? " is-unread" : ""}`}>
      <div className="admin-notif-card__header">
        <SeverityBadge severity={notif.severity} />
        <span className="admin-notif-card__type">{notif.type.replace(/_/g, " ")}</span>
        <time className="admin-notif-card__time" dateTime={notif.created_at}>
          {formatDate(notif.created_at)}
        </time>
      </div>
      <p className="admin-notif-card__title">{notif.title}</p>
      {notif.body ? <p className="admin-notif-card__body">{notif.body}</p> : null}
      {notif.target_type && notif.target_id ? (
        <p className="admin-notif-card__target">
          Target: <code>{notif.target_type} / {notif.target_id}</code>
        </p>
      ) : null}
      <div className="admin-notif-card__actions">
        {isUnread ? (
          <form action={async () => { "use server"; await actionMarkNotificationRead(notif.id); }}>
            <button type="submit" className="admin-button-sm">Mark read</button>
          </form>
        ) : null}
        {notif.status !== "archived" ? (
          <form action={async () => { "use server"; await actionArchiveNotification(notif.id); }}>
            <button type="submit" className="admin-button-sm admin-button-sm--muted">Archive</button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireAdmin();
  const { filter: rawFilter } = await searchParams;
  const filter = (rawFilter === "unread" || rawFilter === "urgent") ? rawFilter : "all";

  const [notifications, unreadCount] = await Promise.all([
    getAdminNotifications(profile.id, filter, 80),
    getUnreadAdminNotificationCount(profile.id),
  ]);

  const urgentUnread = notifications.filter(
    (n) => n.severity === "urgent" && n.status === "unread",
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-page-intro-card">
        <p className="admin-kicker">Notifications</p>
        <h1>
          Admin notifications
          {unreadCount > 0 ? (
            <span className="admin-notif-bell-count" aria-label={`${unreadCount} unread`}>
              {unreadCount}
            </span>
          ) : null}
        </h1>
        <p className="admin-subtext">
          Platform alerts, moderation events, feedback and digest reports.
          Private document content is never included.
        </p>
        <div className="admin-notif-header-actions">
          <form action={actionMarkAllRead}>
            <button type="submit" className="admin-button admin-button-secondary">
              Mark all read
            </button>
          </form>
          <Link href="/admin/settings/notifications" className="admin-button admin-button-secondary">
            Notification settings
          </Link>
        </div>
      </header>

      {urgentUnread.length > 0 ? (
        <section className="admin-status-card is-error">
          <strong>
            {urgentUnread.length} urgent notification{urgentUnread.length === 1 ? "" : "s"} require attention.
          </strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            {urgentUnread.map((n) => (
              <li key={n.id}>{n.title}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="admin-notif-filters" role="tablist">
        {(["all", "unread", "urgent"] as const).map((f) => (
          <Link
            key={f}
            href={`/admin/notifications?filter=${f}`}
            className={`admin-notif-filter-tab${filter === f ? " is-active" : ""}`}
            role="tab"
            aria-selected={filter === f}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <div className="admin-surface">
          <p className="admin-muted">
            {filter === "unread"
              ? "No unread notifications."
              : filter === "urgent"
              ? "No urgent notifications."
              : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div className="admin-notif-list">
          {notifications.map((notif) => (
            <NotificationCard key={notif.id} notif={notif} />
          ))}
        </div>
      )}
    </div>
  );
}
