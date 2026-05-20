import { NextResponse } from "next/server";
import { readRecords } from "@/lib/records";
import { buildIntelligenceDashboardPayload } from "@/lib/workbench-intelligence-dashboard";
import { loadWorkbenchIntelligenceSnapshot } from "@/lib/workbench-intelligence";
import { isGuardResponse, requireMemberApi } from "@/src/lib/security/auth-guards";

export async function GET() {
  const guard = await requireMemberApi();
  if (isGuardResponse(guard)) return guard;

  try {
    const snapshot = await loadWorkbenchIntelligenceSnapshot();
    const archiveRecords = await readRecords();
    const payload = buildIntelligenceDashboardPayload(snapshot, archiveRecords);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load intelligence dashboard.";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
