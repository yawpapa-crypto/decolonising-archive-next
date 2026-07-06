import { NextResponse } from "next/server";
import type { EvidenceStatus } from "@/lib/catalogue/types";
import {
  addCatalogueEvidence,
  addVerificationTask,
  catalogueDataExists,
  getCatalogueRecord,
  loadVerificationTasks,
  updateRecordEvidenceStatus,
} from "@/lib/catalogue/store";

export const dynamic = "force-dynamic";

type Action =
  | "mark_partially_verified"
  | "mark_verified"
  | "mark_disputed"
  | "request_community_review"
  | "request_rights_review"
  | "return_to_research_lead"
  | "mark_source_checked"
  | "add_source";

const ACTION_STATUS: Record<Action, EvidenceStatus> = {
  mark_partially_verified: "partially_verified",
  mark_verified: "verified",
  mark_disputed: "disputed",
  request_community_review: "community_review_required",
  request_rights_review: "rights_review_required",
  return_to_research_lead: "research_lead",
  mark_source_checked: "source_checked",
  add_source: "source_located",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!catalogueDataExists()) {
    return NextResponse.json({ error: "Catalogue not imported" }, { status: 503 });
  }

  const { id } = await params;
  const record = getCatalogueRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    action: Action;
    checkedBy?: string;
    notes?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  };

  const { action, checkedBy = "admin", notes, sourceUrl, sourceTitle } = body;
  if (!action || !ACTION_STATUS[action]) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "add_source") {
    if (!sourceUrl?.trim()) {
      return NextResponse.json({ error: "sourceUrl required" }, { status: 400 });
    }
    addCatalogueEvidence({
      id: `ev-${id}-admin-${Date.now()}`,
      catalogueRecordId: id,
      sourceTitle: sourceTitle ?? null,
      sourceAuthor: null,
      sourceInstitution: null,
      sourceUrl: sourceUrl.trim(),
      sourceType: "admin_added",
      publicationDate: null,
      accessDate: new Date().toISOString().slice(0, 10),
      quotedEvidence: null,
      paraphrasedEvidence: null,
      claimSupported: null,
      reliabilityLevel: null,
      archivedUrl: null,
      notes: notes ?? "Added via admin verification dashboard",
    });
    updateRecordEvidenceStatus(id, "source_located", {
      primarySourceUrl: sourceUrl.trim(),
      verificationNotes: notes ?? "Additional source added by admin.",
      checkedBy,
      checkedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, evidenceStatus: "source_located" });
  }

  const nextStatus = ACTION_STATUS[action];
  updateRecordEvidenceStatus(id, nextStatus, {
    evidenceStatus: nextStatus,
    checkedBy,
    checkedAt: new Date().toISOString(),
    verificationNotes: notes ?? `Status updated to ${nextStatus} by ${checkedBy}.`,
    verificationDecision: action,
  });

  if (action === "mark_verified" || action === "mark_partially_verified") {
    addVerificationTask({
      catalogueRecordId: id,
      taskType: "verification_audit",
      description: `Record marked ${nextStatus} by ${checkedBy}. Confirm evidence records support all claims.`,
    });
  }

  return NextResponse.json({ ok: true, evidenceStatus: nextStatus });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!catalogueDataExists()) {
    return NextResponse.json({ error: "Catalogue not imported" }, { status: 503 });
  }

  const { id } = await params;
  const record = getCatalogueRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const tasks = loadVerificationTasks().filter((t) => t.catalogueRecordId === id);
  return NextResponse.json({ record, tasks });
}
