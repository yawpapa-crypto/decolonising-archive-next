import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { allowed, catalogueCandidates } from "@/lib/recommendations/catalogue";
import { normalise } from "@/lib/recommendations/engine";
export const dynamic = "force-dynamic";
const types = new Set([
  "record_open",
  "related_record_open",
  "source_open",
  "more",
  "less",
  "search",
]);
function sameOrigin(r: Request) {
  const origin = r.headers.get("origin");
  return !origin || origin === new URL(r.url).origin;
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const b = await request.json().catch(() => null);
  if (
    !b ||
    !types.has(b.type) ||
    typeof b.id !== "string" ||
    b.id.length > 160 ||
    typeof b.sessionId !== "string" ||
    b.sessionId.length > 64
  )
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const record = loadCatalogueRecords().find((r) => r.id === b.id);
  if (record && !allowed(record))
    return NextResponse.json({ error: "Record unavailable" }, { status: 404 });
  if (
    !record &&
    b.type !== "search" &&
    !(/^(wc-|ol-|oa-|gb-|cr-|ss-|met-|loc-|ARED-)[\w.-]+$/.test(b.id) || /^europeana-\/[\w.-]+\/[\w./%~:-]+$/.test(b.id))
  )
    return NextResponse.json({ error: "Unknown record" }, { status: 400 });
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (!data.user)
      return NextResponse.json(
        { error: "Sign in to retain feedback" },
        { status: 401 },
      );
    // Store only public vocabulary matches, not raw search, IP, referrer, path or private notes.
    const query =
      typeof b.query === "string" ? normalise(b.query.slice(0, 200)) : "";
    const vocabulary = [
      ...new Set(
        catalogueCandidates().flatMap((c) => Object.values(c.features).flat()),
      ),
    ];
    const terms =
      b.type === "search"
        ? vocabulary
            .filter((v) => v.length > 3 && query.includes(normalise(v)))
            .slice(0, 12)
        : [];
    const { error } = await sb.rpc("recommendation_event", {
      p_type: `rec_${b.type}`,
      p_target: b.type === "search" ? "theme" : b.id,
      p_session: b.sessionId,
      p_terms: terms,
    });
    return NextResponse.json(
      { ok: !error },
      {
        status: error ? 503 : 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Feedback is temporarily unavailable" },
      { status: 503 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (!data.user)
      return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    const { error } = await sb.rpc("clear_recommendation_events");
    return NextResponse.json({ ok: !error }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
