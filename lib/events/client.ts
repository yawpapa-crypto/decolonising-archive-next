"use client";
import type { AredEvent } from "./vocabulary";
import { recommendationSession } from "@/lib/recommendations/client";
import { analyticsOptedOut } from "@/src/lib/analytics/client";

/** Fire and forget. Respects the analytics opt-out. Signed-out visitors simply get a 401 that is ignored. */
export function aredEvent(type: AredEvent, target: string) {
  try {
    if (analyticsOptedOut()) return;
    void fetch("/api/ared-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, target: target.slice(0, 160), sessionId: recommendationSession() }), keepalive: true }).catch(() => {});
  } catch { /* never block the interface */ }
}
