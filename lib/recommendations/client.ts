"use client";
import { analyticsOptedOut } from "@/src/lib/analytics/client";
export function recommendationSession() {
  try {
    if (analyticsOptedOut()) document.cookie = "ared-recommendations-optout=1;Path=/;Max-Age=31536000;SameSite=Lax";
    let id = sessionStorage.getItem("ared-recommendation-session");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("ared-recommendation-session", id);
    }
    document.cookie = `ared-recommendation-session=${encodeURIComponent(id)};Path=/;Max-Age=7200;SameSite=Lax`;
    return id;
  } catch {
    return "";
  }
}
export function recommendationEvent(type: string, id: string, query?: string) {
  if (analyticsOptedOut()) return;
  void fetch("/api/recommendations/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      id,
      query,
      sessionId: recommendationSession(),
    }),
    keepalive: true,
  }).catch(() => {});
}

export function rememberSessionIntent(query: string) {
  try {
    const old = readSessionIntent();
    sessionStorage.setItem(
      "ared-current-intent",
      JSON.stringify({
        at: Date.now(),
        terms: [...old, query.slice(0, 160)].slice(-3),
      }),
    );
  } catch {}
}
export function readSessionIntent(): string[] {
  try {
    const data = JSON.parse(
      sessionStorage.getItem("ared-current-intent") || "{}",
    );
    return Date.now() - data.at < 7200000 && Array.isArray(data.terms)
      ? data.terms.filter((s: unknown) => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}
