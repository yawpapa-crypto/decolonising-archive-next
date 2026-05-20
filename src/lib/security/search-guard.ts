import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { enforceSearchRateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { parseSearchQueryParam } from "@/src/lib/security/validate";

/** Rate limit + query validation for public federated search routes. */
export async function guardPublicSearch(request: Request): Promise<
  | { ok: true; query: string }
  | { ok: false; response: NextResponse }
> {
  const url = new URL(request.url);
  const parsed = parseSearchQueryParam(url.searchParams);
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }

  const user = await getCurrentUser();
  const rate = enforceSearchRateLimit(request, user?.id ?? null);
  if (!rate.ok) {
    return { ok: false, response: NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec ?? 60) },
      },
    ) };
  }

  return { ok: true, query: parsed.query };
}

export { rateLimitResponse };
