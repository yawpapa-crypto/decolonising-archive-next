import { NextResponse } from "next/server";
import { assignRecordToUser, listAssignments } from "@/lib/workbench-review-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listAssignments(projectId);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, recordId, assigneeUserId, role } = body || {};
    if (!projectId || !recordId || !assigneeUserId) return NextResponse.json({ ok: false, error: "projectId, recordId and assigneeUserId required" }, { status: 400 });
    const res = await assignRecordToUser(projectId, recordId, assigneeUserId, role || "primary");
    return NextResponse.json(res, { status: res.ok ? 201 : 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Invalid request" }, { status: 400 });
  }
}
