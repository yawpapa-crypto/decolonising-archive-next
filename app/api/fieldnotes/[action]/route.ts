import { createClient, getAuthenticatedUser } from "@/src/lib/supabase/server";

const METHODS: Record<string, string[]> = {
  "field-index": ["GET"], "fieldnote-collections": ["GET", "POST"],
  "fieldnote-collection": ["GET", "PATCH", "POST"], "encounter": ["GET", "PATCH"], "media-url": ["GET"],
};

async function handle(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!METHODS[action]?.includes(request.method)) return Response.json({ error: "Unsupported operation" }, { status: 405 });
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const base = process.env.ARED_FIELD_API_URL?.trim();
  if (!base) return Response.json({ error: "The private Fieldnotes service is not connected yet." }, { status: 503 });
  const target = new URL(base);
  if (target.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(target.hostname))) return Response.json({ error: "Invalid Fieldnotes service configuration" }, { status: 503 });
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return Response.json({ error: "Sign in to access your fieldnotes" }, { status: 401 });
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return Response.json({ error: "Session expired" }, { status: 401 });
  target.pathname = `${target.pathname.replace(/\/$/, "")}/research/${action}`;
  const source = new URL(request.url);
  const id = source.searchParams.get("id");
  if (id) target.searchParams.set("id", id);
  const body = request.method === "GET" ? undefined : await request.text();
  if (body && body.length > 256_000) return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(target, { method: request.method, headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
    if (!response.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "The Fieldnotes service is unavailable" }, { status: 502 });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "The Fieldnotes service could not be reached. Your changes have not been confirmed." }, { status: 502 }); }
}
export const GET = handle;
export const PATCH = handle;
export const POST = handle;
