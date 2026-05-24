"use client";

import type { ReactNode } from "react";
import { Loader2, Save } from "lucide-react";
import type { NoteMode } from "./workbench-note-types";
import { CANVAS_MODE_ICONS } from "./workbench-canvas-mode-icons";
import WorkbenchIconTip from "./WorkbenchIconTip";

export type WorkbenchCanvasProjectHeaderProps = {
  projectTitle: string;
  onProjectTitleChange?: (value: string) => void;
  canEditTitle?: boolean;
  modes: ReadonlyArray<{ id: string; label: string }>;
  activeMode: string;
  onModeChange: (mode: string) => void;
  statusLabel: string;
  saveState: "unsaved" | "saving" | "saved" | "error";
  onSave?: () => void;
  isDirty?: boolean;
  isPending?: boolean;
  saveDisabled?: boolean;
  hidden?: boolean;
  canvasSwitcher?: ReactNode;
  headerExtra?: ReactNode;
};

export function WorkbenchCanvasProjectHeader({
  projectTitle,
  onProjectTitleChange,
  canEditTitle = false,
  modes,
  activeMode,
  onModeChange,
  statusLabel,
  saveState,
  onSave,
  isDirty = false,
  isPending = false,
  saveDisabled = false,
  hidden = false,
  canvasSwitcher,
  headerExtra,
}: WorkbenchCanvasProjectHeaderProps) {
  const saveBusy = isPending || saveState === "saving";

  return (
    <header
      className={`workbench-canvas-project-header${hidden ? " is-hidden" : ""}`}
      aria-label="Archive canvas project"
    >
      <WorkbenchIconTip tip="Archive Canvas" info="Visual research workspace" variant="canvas">
        <div className="workbench-canvas-project-header__brand">
          <span className="workbench-canvas-project-header__mark" aria-hidden>
            DA
          </span>
        </div>
      </WorkbenchIconTip>

      {canvasSwitcher}

      <input
        className="workbench-canvas-project-header__project"
        type="text"
        value={projectTitle}
        onChange={(e) => onProjectTitleChange?.(e.target.value)}
        readOnly={!canEditTitle}
        placeholder="Untitled project"
        aria-label="Project title"
        title={projectTitle || "Project title"}
      />

      <div
        className="workbench-canvas-project-header__modes"
        role="tablist"
        aria-label="Note mode"
      >
        {modes.map((mode) => {
          const Icon = CANVAS_MODE_ICONS[mode.id as NoteMode];
          return (
            <WorkbenchIconTip key={mode.id} tip={mode.label} variant="canvas">
              <button
                type="button"
                role="tab"
                className={`workbench-canvas-project-header__mode workbench-canvas-project-header__mode--icon${
                  activeMode === mode.id ? " is-active" : ""
                }`}
                aria-selected={activeMode === mode.id}
                aria-label={mode.label}
                onClick={() => onModeChange(mode.id)}
              >
                {Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden /> : null}
              </button>
            </WorkbenchIconTip>
          );
        })}
      </div>

      <div className="workbench-canvas-project-header__actions">
        {headerExtra}
        <WorkbenchIconTip tip={statusLabel} variant="canvas">
          <span
            className={`workbench-canvas-project-header__status-dot workbench-canvas-project-header__status-dot--${saveState}`}
            aria-live="polite"
            aria-label={statusLabel}
          />
        </WorkbenchIconTip>
        {onSave ? (
          <WorkbenchIconTip
            tip={saveBusy ? "Saving…" : isDirty ? "Save changes" : "Saved"}
            variant="canvas"
          >
            <button
              type="button"
              className={`workbench-canvas-project-header__save workbench-canvas-project-header__save--icon${
                isDirty ? " is-dirty" : ""
              }`}
              onClick={onSave}
              disabled={saveDisabled || saveBusy || !isDirty}
              aria-label={saveBusy ? "Saving" : "Save"}
            >
              {saveBusy ? (
                <Loader2 size={16} strokeWidth={1.75} className="is-spinning" aria-hidden />
              ) : (
                <Save size={16} strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </WorkbenchIconTip>
        ) : null}
      </div>
    </header>
  );
}
