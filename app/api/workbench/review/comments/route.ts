import { NextResponse } from "next/server";
import { addReviewComment, listReviewComments } from "@/lib/workbench-review-actions";
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
  const recordId = url.searchParams.get("recordId") || undefined;
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listReviewComments(projectId, recordId);
  return NextResponse.json(res, { status: reviewApiStatus(res) });
}

export async function POST(req: Request) {
  const guard = await requireMemberApi();
  if (isGuardResponse(guard)) return guard;

  try {
    const body = await req.json();
    const { projectId, recordId, body: text, parentId } = body || {};
    if (!projectId || !recordId || !text) return NextResponse.json({ ok: false, error: "projectId, recordId and body required" }, { status: 400 });
    const res = await addReviewComment(projectId, recordId, text, parentId);
    return NextResponse.json(res, { status: reviewApiStatus(res, true) });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 400 });
  }
}
