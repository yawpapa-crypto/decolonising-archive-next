import { requireAdmin } from "@/src/lib/auth";
import {
  getAdminNotificationSettings,
  type AdminNotificationSettings,
} from "@/lib/admin-notifications";
import NotificationSettingsForm from "./NotificationSettingsForm";

export default async function AdminNotificationSettingsPage() {
  const profile = await requireAdmin();
  const settings = await getAdminNotificationSettings(profile.id);
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.ADMIN_NOTIFICATIONS_FROM_EMAIL,
  );

  const defaults: AdminNotificationSettings = {
    id: "",
    user_id: profile.id,
    dashboard_enabled: true,
    email_enabled: false,
    immediate_email_enabled: false,
    daily_digest_enabled: true,
    weekly_digest_enabled: true,
    digest_time: "09:00",
    timezone: "Australia/Melbourne",
    notify_errors: true,
    notify_feedback: true,
    notify_moderation: true,
    notify_source_requests: true,
    notify_user_activity: false,
    notify_search_trends: true,
    notify_workbench_activity: false,
    notify_community_activity: true,
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-page-intro-card">
        <p className="admin-kicker">Settings</p>
        <h1>Notification settings</h1>
        <p className="admin-subtext">
          Control which events create dashboard alerts, trigger email reports, and appear in digests.
          Private document, note, and canvas content is never included in any notification.
        </p>
      </header>

      {!emailConfigured ? (
        <section className="admin-status-card is-warning">
          <strong>Email provider not configured.</strong>
          <p>
            Set <code>RESEND_API_KEY</code> and <code>ADMIN_NOTIFICATIONS_FROM_EMAIL</code> in your
            environment to enable email reports. Dashboard notifications work without email.
          </p>
        </section>
      ) : null}

      <NotificationSettingsForm
        settings={settings ?? defaults}
        emailConfigured={emailConfigured}
      />
    </div>
  );
}
