import type { ArchiveRecord } from "@/lib/records";
import type { WorkbenchProjectRecordRow, WorkbenchProjectRow } from "@/lib/workbench-data";
import { snapshotRecordRights, recordNeedsMetadataReview } from "@/lib/workbench-data";
import { PROJECT_RECORD_STATUS_LABEL, type ProjectRecordStatusId } from "@/lib/workbench-types";

type ExportCtx = {
  project: WorkbenchProjectRow;
  records: WorkbenchProjectRecordRow[];
  archiveById: Map<string, ArchiveRecord>;
};

function citationForExport(recordId: string, archiveById: Map<string, ArchiveRecord>) {
  const rec = archiveById.get(recordId);
  const c = rec?.citation?.trim();
  if (c) return c;
  return "Citation missing, needs review.";
}

export function exportCitationsPlainText(ctx: ExportCtx) {
  const lines: string[] = [];
  lines.push(ctx.project.title);
  lines.push("");
  for (const pr of ctx.records) {
    if (pr.status === "exclude") continue;
    lines.push(citationForExport(pr.record_id, ctx.archiveById));
  }
  return lines.join("\n");
}

export function exportAnnotatedBibliographyMarkdown(ctx: ExportCtx) {
  const parts: string[] = [];
  parts.push(`# ${ctx.project.title}`);
  parts.push("");
  if (ctx.project.description) {
    parts.push(ctx.project.description);
    parts.push("");
  }
  for (const pr of ctx.records) {
    if (pr.status === "exclude") continue;
    const snap = snapshotRecordRights(ctx.archiveById.get(pr.record_id));
    const cite = citationForExport(pr.record_id, ctx.archiveById);
    const status = PROJECT_RECORD_STATUS_LABEL[pr.status as ProjectRecordStatusId] ?? pr.status;
    parts.push(`## ${cite}`);
    parts.push("");
    parts.push(`- **Workflow status:** ${status}`);
    parts.push(`- **Rights:** ${snap.rightsStatus || "—"}`);
    parts.push(`- **Licence:** ${snap.licence || "—"}`);
    parts.push(`- **Access:** ${snap.accessType || "—"}`);
    parts.push(`- **Verification:** ${snap.verificationStatus || "—"}`);
    parts.push(`- **Cultural sensitivity:** ${snap.culturalSensitivity || "—"}`);
    parts.push(`- **Community review:** ${snap.communityReviewStatus || "—"}`);
    if (recordNeedsMetadataReview(snap)) {
      parts.push(`- **Workbench:** Needs metadata review`);
    }
    if (pr.notes) {
      parts.push("");
      parts.push(pr.notes);
    }
    parts.push("");
  }
  return parts.join("\n");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportProjectRecordsCsv(ctx: ExportCtx) {
  const headers = [
    "record_id",
    "status",
    "citation",
    "rights_status",
    "licence",
    "access_type",
    "source_url",
    "notes",
    "citation_checked",
    "source_checked",
    "rights_checked",
    "cultural_review_needed",
    "metadata_review_needed",
  ];
  const rows = [headers.join(",")];
  for (const pr of ctx.records) {
    const snap = snapshotRecordRights(ctx.archiveById.get(pr.record_id));
    const row = [
      pr.record_id,
      pr.status,
      citationForExport(pr.record_id, ctx.archiveById),
      snap.rightsStatus,
      snap.licence,
      snap.accessType,
      snap.sourceUrl,
      pr.notes ?? "",
      String(pr.citation_checked),
      String(pr.source_checked),
      String(pr.rights_checked),
      String(pr.cultural_review_needed),
      String(pr.metadata_review_needed),
    ].map((c) => csvEscape(String(c)));
    rows.push(row.join(","));
  }
  return rows.join("\n");
}

export function exportProjectRecordsJson(ctx: ExportCtx) {
  return JSON.stringify(
    {
      project: {
        id: ctx.project.id,
        title: ctx.project.title,
        description: ctx.project.description,
        project_type: ctx.project.project_type,
        visibility: ctx.project.visibility,
        status: ctx.project.status,
        deadline: ctx.project.deadline,
      },
      records: ctx.records.map((pr) => ({
        ...pr,
        archive_snapshot: snapshotRecordRights(ctx.archiveById.get(pr.record_id)),
        citation_export: citationForExport(pr.record_id, ctx.archiveById),
      })),
    },
    null,
    2,
  );
}
