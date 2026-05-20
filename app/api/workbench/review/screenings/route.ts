import { NextResponse } from "next/server";
import { listReviewScreenings, updateReviewScreening } from "@/lib/workbench-review-actions";
import { isGuardResponse, requireMemberApi } from "@/src/lib/security/auth-guards";
import { reviewApiStatus } from "@/src/lib/security/review-api";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Invalid request";
}

export async function GET(req: Request) {
  const guard = await requireMemberApi();
  if (isGuardResponse(guard)) return guard;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listReviewScreenings(projectId);
  return NextResponse.json(res, { status: reviewApiStatus(res) });
}

export async function POST(req: Request) {
  const guard = await requireMemberApi();
  if (isGuardResponse(guard)) return guard;

  try {
    const body = await req.json();
    const { projectId, recordId, screeningStatus, exclusionReason, notes } = body || {};
    if (!projectId || !recordId || !screeningStatus) return NextResponse.json({ ok: false, error: "projectId, recordId and screeningStatus required" }, { status: 400 });
    const res = await updateReviewScreening({ projectId, recordId, screeningStatus, exclusionReason, notes });
    return NextResponse.json(res, { status: reviewApiStatus(res) });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 400 });
  }
}
