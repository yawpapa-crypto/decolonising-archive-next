"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { getAnalyticsSessionId, trackActivity } from "@/src/lib/analytics/client";

declare global {
  interface Window {
    DecolonisingArchiveAnalytics?: {
      track: typeof trackActivity;
      sessionId: () => string | null;
    };
  }
}

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function PlatformActivityTracker() {
  const pathname = usePathname();
  const hasStarted = useRef(false);
  const lastRoute = useRef("");

  useEffect(() => {
    window.DecolonisingArchiveAnalytics = {
      track: trackActivity,
      sessionId: getAnalyticsSessionId,
    };

    return () => {
      delete window.DecolonisingArchiveAnalytics;
    };
  }, []);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      trackActivity({
        eventType: "session_start",
        area: "platform",
        action: "start",
        metadata: { visibilityState: document.visibilityState },
      });
    }
  }, []);

  useEffect(() => {
    const route = `${pathname || "/"}${window.location.search || ""}${window.location.hash || ""}`;
    if (route === lastRoute.current) return;
    lastRoute.current = route;

    trackActivity({
      eventType: "route_view",
      area: "navigation",
      action: "view",
      path: route,
      metadata: { route },
    });
  }, [pathname]);

  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState !== "visible") return;
      trackActivity({
        eventType: "session_heartbeat",
        area: "platform",
        action: "heartbeat",
        metadata: { visibilityState: document.visibilityState },
      });
    };

    const onVisibilityChange = () => {
      trackActivity({
        eventType: document.visibilityState === "visible" ? "session_resume" : "session_pause",
        area: "platform",
        action: document.visibilityState,
        metadata: { visibilityState: document.visibilityState },
      });
    };

    const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    window.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
