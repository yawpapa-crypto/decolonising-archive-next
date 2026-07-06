"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function AdminAnalyticsChartCard({ title, subtitle, children, action }: Props) {
  return (
    <article className="admin-analytics-chart-card">
      <header className="admin-analytics-chart-header">
        <div>
          <h3 className="admin-analytics-chart-title">{title}</h3>
          {subtitle ? <p className="admin-analytics-chart-subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="admin-analytics-chart-body">{children}</div>
    </article>
  );
}
