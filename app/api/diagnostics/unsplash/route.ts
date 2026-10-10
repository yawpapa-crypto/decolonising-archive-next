import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

/** Admin only. Reports whether the Unsplash key is present and what Unsplash answers, without ever returning the key. */
export async function GET() {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "admin") return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return NextResponse.json({ configured: false, hint: "UNSPLASH_ACCESS_KEY is not set in this environment. Add it to the host's environment variables and redeploy." });
  try {
    const res = await fetch("https://api.unsplash.com/search/photos?query=Ghana&per_page=1", { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
    const body = res.ok ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
    return NextResponse.json({
      configured: true,
      status: res.status,
      ok: res.ok,
      remainingThisHour: res.headers.get("x-ratelimit-remaining"),
      limitPerHour: res.headers.get("x-ratelimit-limit"),
      results: res.ok ? (body as { total?: number }).total ?? 0 : undefined,
      detail: res.ok ? undefined : String(body).slice(0, 200),
      hint: res.status === 401 ? "Unsplash rejected the key. Use the Access Key (not the Secret Key)." : res.status === 403 ? "Rate limit reached for this hour (demo apps get 50 requests per hour)." : undefined,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, ok: false, detail: e instanceof Error ? e.message : "Request failed" });
  }
}
