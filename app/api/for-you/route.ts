import { NextResponse } from "next/server";
import { getForYouPage, type Signal } from "@/lib/home/for-you";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    page?: number;
    seed?: string;
    seen?: string[];
    session?: Signal[];
    sessionId?: string;
    intent?: string[];
    feedback?: { more?: string[]; less?: string[] };
    ignoreEvents?: boolean;
    personalise?: boolean;
  };
  const clean = (s: unknown) => String(s ?? "").slice(0, 160);
  const data = await getForYouPage({
    page: Math.max(1, Math.floor(Number(body.page) || 1)),
    seed: clean(body.seed),
    intent: Array.isArray(body.intent) ? body.intent.slice(-3).map(clean) : [],
    feedback: {
      more: Array.isArray(body.feedback?.more)
        ? body.feedback.more.slice(-50).map(clean)
        : [],
      less: Array.isArray(body.feedback?.less)
        ? body.feedback.less.slice(-50).map(clean)
        : [],
    },
    ignoreEvents: body.ignoreEvents === true || body.personalise === false,
    personalise: body.personalise !== false,
    sessionId:
      typeof body.sessionId === "string"
        ? body.sessionId.slice(0, 64)
        : undefined,
    seen: Array.isArray(body.seen) ? body.seen.slice(-1800).map(clean) : [],
    session: Array.isArray(body.session)
      ? body.session.slice(-20).map((s) => ({
          title: clean(s.title),
          source: clean(s.source),
          type: clean(s.type),
          weight: 3,
        }))
      : [],
  });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
