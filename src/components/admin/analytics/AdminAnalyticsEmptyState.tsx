"use client";

type Props = {
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function AdminAnalyticsEmptyState({ title, hint, actionLabel, onAction }: Props) {
  return (
    <div className="admin-analytics-empty">
      <p className="admin-analytics-empty-title">{title}</p>
      <p className="admin-analytics-empty-hint">{hint}</p>
      {actionLabel && onAction ? (
        <button type="button" className="admin-button admin-button-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
