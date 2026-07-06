"use client";

import { useEffect, useState } from "react";

type Props = {
  refreshing?: boolean;
  lastUpdated?: string | null;
};

export default function AdminAnalyticsLivePill({ refreshing, lastUpdated }: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  const updatedLabel =
    mounted && now && lastUpdated ? ` · Updated ${formatTimeAgo(lastUpdated, now)}` : "";

  return (
    <div className="admin-live-pill" aria-live="polite">
      <span className={`admin-live-dot ${refreshing ? "is-pulsing" : ""}`} aria-hidden />
      <span className="admin-live-label">Live</span>
      <span className="admin-live-meta">
        {refreshing ? "Refreshing…" : "Refreshing every 15 seconds"}
        {updatedLabel ? <span className="admin-live-updated">{updatedLabel}</span> : null}
      </span>
    </div>
  );
}

function formatTimeAgo(iso: string, now: number) {
  const diff = now - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
}
