import { NextResponse } from "next/server";
import { suggestedCurations } from "@/lib/recommendations/server";
export async function GET() {
  return NextResponse.json(
    await suggestedCurations().catch(() => ({ profiles: [], collections: [] })),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
