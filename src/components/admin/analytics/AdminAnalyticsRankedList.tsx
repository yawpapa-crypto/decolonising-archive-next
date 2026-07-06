"use client";

import AdminAnalyticsEmptyState from "./AdminAnalyticsEmptyState";

type Item = { label: string; count: number; max?: number; userId?: string | null };

type Props = {
  items: Item[];
  emptyTitle?: string;
  emptyHint?: string;
  onItemClick?: (item: Item) => void;
};

export default function AdminAnalyticsRankedList({
  items,
  emptyTitle = "No data yet",
  emptyHint = "Rankings will appear when activity is logged.",
  onItemClick,
}: Props) {
  if (items.length === 0 || items.every((i) => i.count === 0)) {
    return <AdminAnalyticsEmptyState title={emptyTitle} hint={emptyHint} />;
  }

  const max = items.reduce((m, i) => Math.max(m, i.max ?? i.count), 0) || 1;

  return (
    <ul className="admin-bar-chart">
      {items.map((item) => {
        const pct = Math.round((item.count / max) * 100);
        const content = (
          <>
            <div className="admin-bar-chart-row">
              <span className="admin-bar-chart-label">{item.label}</span>
              <strong className="admin-bar-chart-value">{item.count}</strong>
            </div>
            <div className="admin-bar-chart-track" aria-hidden>
              <span className="admin-bar-chart-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        );

        return (
          <li key={`${item.label}-${item.userId ?? ""}`} className="admin-bar-chart-item">
            {onItemClick ? (
              <button type="button" className="admin-bar-chart-button" onClick={() => onItemClick(item)}>
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
