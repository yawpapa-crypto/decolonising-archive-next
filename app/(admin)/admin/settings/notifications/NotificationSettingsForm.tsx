"use client";

import { useTransition, useState } from "react";
import type { AdminNotificationSettings } from "@/lib/admin-notifications";
import {
  actionSaveNotificationSettings,
  actionSendTestEmail,
  actionSendDigest,
} from "../../notifications/actions";

type Props = {
  settings: AdminNotificationSettings;
  emailConfigured: boolean;
};

function Toggle({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="admin-notif-toggle">
      <input
        type="checkbox"
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="admin-notif-toggle__input"
      />
      <span className="admin-notif-toggle__track" aria-hidden />
      <span className="admin-notif-toggle__content">
        <span className="admin-notif-toggle__label">{label}</span>
        {description ? (
          <span className="admin-notif-toggle__desc">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function NotificationSettingsForm({ settings, emailConfigured }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [digestStatus, setDigestStatus] = useState<string | null>(null);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await actionSaveNotificationSettings(data);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  function handleTestEmail() {
    setTestStatus(null);
    startTransition(async () => {
      const result = await actionSendTestEmail();
      if (result.skipped) {
        setTestStatus("Email provider not configured — test email skipped.");
      } else if (result.ok) {
        setTestStatus("Test email sent.");
      } else {
        setTestStatus(`Failed: ${result.error ?? "Unknown error"}`);
      }
    });
  }

  function handleDigest(range: "daily" | "weekly") {
    setDigestStatus(null);
    startTransition(async () => {
      const result = await actionSendDigest(range);
      if (result.skipped) {
        setDigestStatus("Email provider not configured — report logged as skipped.");
      } else if (result.ok) {
        setDigestStatus(`${range === "daily" ? "Daily" : "Weekly"} report sent.`);
      } else {
        setDigestStatus(`Failed: ${result.error ?? "Unknown error"}`);
      }
    });
  }

  return (
    <div className="admin-settings-sections">

      {/* ── Dashboard notifications ─────────────────────────────── */}
      <form onSubmit={handleSave}>
        <section className="admin-surface admin-settings-section">
          <h2 className="admin-section-title">Dashboard notifications</h2>
          <div className="admin-notif-toggle-list">
            <Toggle
              name="dashboard_enabled"
              label="Enable dashboard notifications"
              description="Show alerts in the notification centre and analytics page."
              defaultChecked={settings.dashboard_enabled}
            />
          </div>
        </section>

        {/* ── Email alerts ────────────────────────────────────────── */}
        <section className="admin-surface admin-settings-section">
          <h2 className="admin-section-title">Email alerts</h2>
          <div className="admin-notif-toggle-list">
            <Toggle
              name="email_enabled"
              label="Enable email reports"
              description="Send email notifications for selected events."
              defaultChecked={settings.email_enabled}
              disabled={!emailConfigured}
            />
            <Toggle
              name="immediate_email_enabled"
              label="Immediate email for urgent issues"
              description="Send an email the moment a critical event is logged."
              defaultChecked={settings.immediate_email_enabled}
              disabled={!emailConfigured}
            />
            <Toggle
              name="daily_digest_enabled"
              label="Daily digest"
              description="A summary of platform activity sent once a day."
              defaultChecked={settings.daily_digest_enabled}
              disabled={!emailConfigured}
            />
            <Toggle
              name="weekly_digest_enabled"
              label="Weekly digest"
              description="A 7-day summary sent once a week."
              defaultChecked={settings.weekly_digest_enabled}
              disabled={!emailConfigured}
            />
          </div>

          <div className="admin-notif-time-row">
            <label className="admin-form-label" htmlFor="digest_time">
              Digest send time
              <input
                id="digest_time"
                name="digest_time"
                type="time"
                defaultValue={settings.digest_time}
                className="admin-form-input admin-form-input--short"
                disabled={!emailConfigured}
              />
            </label>
            <label className="admin-form-label" htmlFor="timezone">
              Timezone
              <select
                id="timezone"
                name="timezone"
                defaultValue={settings.timezone}
                className="admin-form-input"
                disabled={!emailConfigured}
              >
                <option value="Australia/Melbourne">Australia/Melbourne (AEDT/AEST)</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Australia/Brisbane">Australia/Brisbane</option>
                <option value="Australia/Perth">Australia/Perth</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
          </div>
        </section>

        {/* ── Notify me about ─────────────────────────────────────── */}
        <section className="admin-surface admin-settings-section">
          <h2 className="admin-section-title">Notify me about</h2>
          <div className="admin-notif-toggle-list">
            <Toggle
              name="notify_errors"
              label="Errors and source failures"
              description="Application errors, schema failures, source fetch errors."
              defaultChecked={settings.notify_errors}
            />
            <Toggle
              name="notify_feedback"
              label="Feedback and bug reports"
              description="Feedback, suggestions, and bug reports from members."
              defaultChecked={settings.notify_feedback}
            />
            <Toggle
              name="notify_moderation"
              label="Moderation and cultural care reports"
              description="Community content reports, cultural concerns, takedown requests."
              defaultChecked={settings.notify_moderation}
            />
            <Toggle
              name="notify_source_requests"
              label="Source requests"
              description="New source suggestions submitted by members."
              defaultChecked={settings.notify_source_requests}
            />
            <Toggle
              name="notify_search_trends"
              label="Search trends"
              description="Zero-result search spikes and unusual search patterns."
              defaultChecked={settings.notify_search_trends}
            />
            <Toggle
              name="notify_community_activity"
              label="Community activity"
              description="Community post and comment digest summaries."
              defaultChecked={settings.notify_community_activity}
            />
            <Toggle
              name="notify_workbench_activity"
              label="Workbench activity"
              description="Collaboration events and project invite activity."
              defaultChecked={settings.notify_workbench_activity}
            />
            <Toggle
              name="notify_user_activity"
              label="New user signups"
              description="Alert when a new member registers."
              defaultChecked={settings.notify_user_activity}
            />
          </div>
        </section>

        <div className="admin-settings-save-row">
          <button
            type="submit"
            className="admin-button"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? "Saving…" : "Save settings"}
          </button>
          {saved ? (
            <p className="admin-form-success" role="status">Settings saved.</p>
          ) : null}
        </div>
      </form>

      {/* ── Send test / digest ──────────────────────────────────── */}
      <section className="admin-surface admin-settings-section">
        <h2 className="admin-section-title">Manual report actions</h2>
        <p className="admin-muted" style={{ marginBottom: "1rem" }}>
          Trigger reports immediately without waiting for the scheduled cron.
          {!emailConfigured
            ? " Email provider is not configured — reports will be logged as skipped."
            : ""}
        </p>
        <div className="admin-notif-manual-actions">
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={handleTestEmail}
            disabled={isPending}
          >
            Send test email
          </button>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => handleDigest("daily")}
            disabled={isPending}
          >
            Send daily report now
          </button>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => handleDigest("weekly")}
            disabled={isPending}
          >
            Send weekly report now
          </button>
        </div>
        {testStatus ? (
          <p className="admin-form-feedback" role="status">{testStatus}</p>
        ) : null}
        {digestStatus ? (
          <p className="admin-form-feedback" role="status">{digestStatus}</p>
        ) : null}
      </section>

      {/* ── Cron scheduling note ────────────────────────────────── */}
      <section className="admin-surface admin-settings-section">
        <h2 className="admin-section-title">Scheduled digest setup</h2>
        <p className="admin-muted">
          To automate daily and weekly digests, add a Vercel Cron Job pointing to these routes,
          protected by <code>CRON_SECRET</code>:
        </p>
        <pre className="admin-notif-code-block">{`# vercel.json
{
  "crons": [
    { "path": "/api/admin/reports/daily",  "schedule": "0 9 * * *" },
    { "path": "/api/admin/reports/weekly", "schedule": "0 9 * * 1" }
  ]
}`}</pre>
        <p className="admin-muted" style={{ marginTop: "0.75rem" }}>
          The routes require a matching <code>Authorization: Bearer $CRON_SECRET</code> header
          or an active admin session. Without <code>CRON_SECRET</code> they return 403.
        </p>
      </section>
    </div>
  );
}
