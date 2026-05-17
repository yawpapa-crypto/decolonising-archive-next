export const WORKBENCH_NOTE_STATUSES = [
  "draft",
  "reviewing",
  "ready_to_cite",
  "needs_source_check",
  "cultural_care_review",
  "archived",
] as const;

export type WorkbenchNoteStatus = (typeof WORKBENCH_NOTE_STATUSES)[number];

export const WORKBENCH_NOTE_STATUS_LABELS: Record<WorkbenchNoteStatus, string> = {
  draft: "Draft",
  reviewing: "Reviewing",
  ready_to_cite: "Ready to cite",
  needs_source_check: "Needs source check",
  cultural_care_review: "Cultural care review",
  archived: "Archived",
};

export function normalizeNoteStatus(value: string | null | undefined): WorkbenchNoteStatus {
  if (value && WORKBENCH_NOTE_STATUSES.includes(value as WorkbenchNoteStatus)) {
    return value as WorkbenchNoteStatus;
  }
  return "draft";
}

export function noteStatusLabel(status: string | null | undefined) {
  return WORKBENCH_NOTE_STATUS_LABELS[normalizeNoteStatus(status)];
}
