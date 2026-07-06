"use client";

import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  caption: string;
  icon?: LucideIcon;
  accent?: "lemon" | "neutral" | "danger";
  loading?: boolean;
  trend?: string | null;
};

export default function AdminAnalyticsStatCard({
  label,
  value,
  caption,
  icon: Icon,
  accent = "neutral",
  loading = false,
  trend,
}: Props) {
  return (
    <article className={`admin-analytics-stat admin-analytics-stat--${accent}`}>
      <div className="admin-analytics-stat-head">
        {Icon ? (
          <span className="admin-analytics-stat-icon" aria-hidden>
            <Icon size={16} strokeWidth={1.75} />
          </span>
        ) : null}
        <span className="admin-analytics-stat-label">{label}</span>
      </div>
      {loading ? (
        <div className="admin-analytics-stat-skeleton" aria-hidden />
      ) : (
        <strong className="admin-analytics-stat-value">{value}</strong>
      )}
      <small className="admin-analytics-stat-caption">{caption}</small>
      {trend ? <span className="admin-analytics-stat-trend">{trend}</span> : null}
    </article>
  );
}
