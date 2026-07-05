import { NextResponse } from "next/server";
import { submitCollectionSuggestion } from "@/lib/collection-suggestion-actions";
import { enforceSearchRateLimit } from "@/src/lib/security/rate-limit";
import { safePublicError } from "@/src/lib/security/sanitize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const limited = enforceSearchRateLimit(request);
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many suggestions — please wait a moment." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = await submitCollectionSuggestion({
      title: String(body.title ?? ""),
      source: String(body.source ?? ""),
      url: body.url ? String(body.url) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      collectionSlug: body.collectionSlug ? String(body.collectionSlug) : undefined,
      submitterName: body.submitterName ? String(body.submitterName) : undefined,
      submitterEmail: body.submitterEmail ? String(body.submitterEmail) : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = safePublicError(error, "Could not submit suggestion");
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
