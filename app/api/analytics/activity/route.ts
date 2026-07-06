import { NextRequest, NextResponse } from "next/server";

import { logActivityServer, logErrorEvent, logSearchEvent } from "@/lib/admin-analytics";

type ClientAnalyticsPayload = {
  eventType?: string;
  area?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  query?: string;
  metadata?: Record<string, unknown>;
  path?: string;
  referrer?: string;
  sessionId?: string;
  sourceScope?: string;
  resultCount?: number;
  externalResultCount?: number;
  localResultCount?: number;
  durationMs?: number;
  status?: string;
  errorMessage?: string;
  errorCode?: string;
};

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
}

export async function POST(request: NextRequest) {
  let payload: ClientAnalyticsPayload;

  try {
    payload = (await request.json()) as ClientAnalyticsPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid analytics payload" }, { status: 400 });
  }

  const eventType = payload.eventType?.trim();
  if (!eventType) {
    return NextResponse.json({ ok: false, error: "Missing event type" }, { status: 400 });
  }

  const common = {
    sessionId: payload.sessionId,
    path: payload.path || request.headers.get("referer") || null,
    referrer: payload.referrer || request.headers.get("referer") || null,
    userAgent: request.headers.get("user-agent"),
    ip: getClientIp(request),
  };

  if (eventType === "search_submitted" || eventType === "search_completed" || eventType === "search_failed") {
    const result = await logSearchEvent({
      query: payload.query || "",
      sourceScope: payload.sourceScope,
      resultCount: payload.resultCount,
      externalResultCount: payload.externalResultCount,
      localResultCount: payload.localResultCount,
      durationMs: payload.durationMs,
      status: eventType === "search_failed" ? "failed" : payload.status || "success",
      metadata: payload.metadata,
      sessionId: payload.sessionId,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 202 });
  }

  if (eventType === "app_error" || eventType.endsWith("_failed")) {
    const metadataMessage =
      typeof payload.metadata?.message === "string" ? payload.metadata.message : null;
    await logErrorEvent({
      area: payload.area,
      message: payload.errorMessage || metadataMessage || eventType,
      code: payload.errorCode || payload.status,
      metadata: payload.metadata,
      sessionId: payload.sessionId,
    });
  }

  const result = await logActivityServer({
    eventType,
    area: payload.area,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    query: payload.query,
    metadata: payload.metadata,
    ...common,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}
