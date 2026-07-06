"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 15_000;

export default function AdminAnalyticsAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <p className="admin-muted" aria-live="polite">
      Live data refreshes every 15 seconds while this tab is visible.
    </p>
  );
}
