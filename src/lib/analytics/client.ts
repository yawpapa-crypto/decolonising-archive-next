"use client";

export type ClientActivityEvent = {
  eventType: string;
  area?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  query?: string;
  metadata?: Record<string, unknown>;
  path?: string;
  referrer?: string;
  sourceScope?: string;
  resultCount?: number;
  externalResultCount?: number;
  localResultCount?: number;
  durationMs?: number;
  status?: string;
  errorMessage?: string;
  errorCode?: string;
};

const SESSION_STORAGE_KEY = "decolonisingArchive:analyticsSessionId";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const next = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function trackActivity(event: ClientActivityEvent) {
  if (typeof window === "undefined") return;

  const payload = {
    ...event,
    sessionId: getAnalyticsSessionId(),
    path: window.location.pathname + window.location.search + window.location.hash,
    referrer: document.referrer || undefined,
  };

  try {
    const body = JSON.stringify(payload);

    if ("sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      const queued = navigator.sendBeacon("/api/analytics/activity", blob);
      if (queued) return;
    }

    void fetch("/api/analytics/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never interrupt the product experience.
    });
  } catch {
    // Analytics must never interrupt the product experience.
  }
}
