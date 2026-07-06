import { NextResponse } from "next/server";
import { getUserGeographicCoverage } from "@/lib/intelligence/geography";
import { isGuardResponse, requireMemberApi } from "@/src/lib/security/auth-guards";

export async function GET() {
  const guard = await requireMemberApi();
  if (isGuardResponse(guard)) return guard;

  try {
    const coverage = await getUserGeographicCoverage(guard.id);
    return NextResponse.json(coverage);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load geography coverage.";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
