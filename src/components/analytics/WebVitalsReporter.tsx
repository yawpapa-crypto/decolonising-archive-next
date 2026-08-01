"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reports Core Web Vitals (CLS, LCP, INP, TTFB, FCP) to Vercel Analytics
 * and a first-party beacon when available.
 */
export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const payload = {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      path: typeof window !== "undefined" ? window.location.pathname : "",
    };

    // Vercel Analytics custom event (best-effort)
    try {
      const va = (window as Window & { va?: (event: string, data?: Record<string, unknown>) => void }).va;
      va?.("event", { name: "web_vital", ...payload });
    } catch {
      // ignore
    }

    // First-party analytics endpoint (best-effort, never blocks UX)
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const body = JSON.stringify({
          event: "web_vital",
          ...payload,
          ts: Date.now(),
        });
        navigator.sendBeacon("/api/analytics/activity", body);
      } catch {
        // ignore
      }
    }

    if (process.env.NODE_ENV === "development") {
      // Helpful local CWV pass signal without noisy production logs
      console.info(`[CWV] ${metric.name}`, metric.value, metric.rating);
    }
  });

  return null;
}
