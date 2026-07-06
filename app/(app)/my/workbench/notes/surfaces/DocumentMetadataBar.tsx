"use client";

import {
  WORKBENCH_NOTE_STATUSES,
  noteStatusLabel,
  type WorkbenchNoteStatus,
} from "@/lib/workbench-note-status";
import type { WorkbenchProjectRow } from "@/lib/workbench-data";

type DocumentMetadataBarProps = {
  projects: WorkbenchProjectRow[];
  projectId: string | null;
  noteStatus: WorkbenchNoteStatus;
  canEdit: boolean;
  saveLabel: string;
  lastEditedLabel: string;
  detailsOpen: boolean;
  onProjectChange: (projectId: string) => void;
  onStatusChange: (status: WorkbenchNoteStatus) => void;
  onToggleDetails: () => void;
  layout?: "bar" | "sidebar";
};

export function DocumentMetadataBar({
  projects,
  projectId,
  noteStatus,
  canEdit,
  saveLabel,
  lastEditedLabel,
  detailsOpen,
  onProjectChange,
  onStatusChange,
  onToggleDetails,
  layout = "bar",
}: DocumentMetadataBarProps) {
  const isSidebar = layout === "sidebar";

  return (
    <div
      className={
        isSidebar
          ? "workbench-doc-sidebar-panel"
          : "workbench-doc-metadata-bar"
      }
      aria-label="Note metadata"
    >
      <label className="workbench-doc-sidebar-panel__field">
        <span className="workbench-doc-sidebar-panel__label">Project</span>
        <select
          className="workbench-doc-metadata-bar__select"
          value={projectId ?? ""}
          onChange={(e) => onProjectChange(e.target.value)}
          disabled={!canEdit}
        >
          <option value="">Personal</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </label>

      <label className="workbench-doc-sidebar-panel__field">
        <span className="workbench-doc-sidebar-panel__label">Status</span>
        <select
          className="workbench-doc-metadata-bar__select workbench-doc-metadata-bar__select--status"
          value={noteStatus}
          onChange={(e) => onStatusChange(e.target.value as WorkbenchNoteStatus)}
          disabled={!canEdit}
        >
          {WORKBENCH_NOTE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {noteStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={`workbench-doc-sidebar-panel__details${detailsOpen ? " is-active" : ""}`}
        onClick={onToggleDetails}
      >
        {detailsOpen ? "Hide details & links" : "Details & links"}
      </button>

      {!isSidebar ? <div className="workbench-doc-metadata-bar__spacer" aria-hidden="true" /> : null}

      <div className="workbench-doc-sidebar-panel__meta">
        <span className="workbench-doc-metadata-bar__save">{saveLabel}</span>
        <span className="workbench-doc-metadata-bar__updated">Last updated: {lastEditedLabel}</span>
      </div>
    </div>
  );
}
