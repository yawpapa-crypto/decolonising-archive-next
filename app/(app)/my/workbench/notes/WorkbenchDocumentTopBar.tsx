"use client";

import type { ReactNode } from "react";
import WorkbenchDocumentZoomControls from "./WorkbenchDocumentZoomControls";

export type DocumentSidebarTab = "format" | "document";

type NoteModeOption = { id: string; label: string };

type Props = {
  menuBar: ReactNode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  noteModes: NoteModeOption[];
  activeMode: string;
  onModeChange: (mode: string) => void;
  formatPanelOpen: boolean;
  onToggleFormatPanel: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onInsertCitation?: () => void;
  onInsertImage?: () => void;
  onInsertTable?: () => void;
  onInsertPageBreak?: () => void;
  canEdit: boolean;
};

export default function WorkbenchDocumentTopBar({
  menuBar,
  zoom,
  onZoomChange,
  noteModes,
  activeMode,
  onModeChange,
  formatPanelOpen,
  onToggleFormatPanel,
  inspectorOpen,
  onToggleInspector,
  onInsertCitation,
  onInsertImage,
  onInsertTable,
  onInsertPageBreak,
  canEdit,
}: Props) {
  return (
    <header className="workbench-document-top-bar" aria-label="Document controls">
      <div className="workbench-document-top-bar__left">
        <div className="workbench-document-top-bar__menus">{menuBar}</div>
        <WorkbenchDocumentZoomControls zoom={zoom} onZoomChange={onZoomChange} />
        <div className="workbench-document-top-bar__insert" role="group" aria-label="Insert">
          <button
            type="button"
            className="workbench-document-top-bar__btn"
            disabled={!canEdit || !onInsertPageBreak}
            onClick={onInsertPageBreak}
            title="Insert a new page at the cursor"
          >
            Add Page
          </button>
          <button
            type="button"
            className="workbench-document-top-bar__btn"
            disabled={!canEdit || !onInsertCitation}
            onClick={onInsertCitation}
            title="Insert citation"
          >
            Cite
          </button>
          <button
            type="button"
            className="workbench-document-top-bar__btn"
            disabled={!canEdit || !onInsertImage}
            onClick={onInsertImage}
            title="Insert image"
          >
            Image
          </button>
          <button
            type="button"
            className="workbench-document-top-bar__btn"
            disabled={!canEdit || !onInsertTable}
            onClick={onInsertTable}
            title="Insert table"
          >
            Table
          </button>
        </div>
      </div>

      <div className="workbench-document-top-bar__right">
        <div className="workbench-document-mode-switcher" role="tablist" aria-label="Note mode">
          {noteModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              className={`workbench-document-mode-button${activeMode === mode.id ? " is-active" : ""}`}
              aria-selected={activeMode === mode.id}
              onClick={() => onModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`workbench-document-top-bar__format-btn${formatPanelOpen ? " is-active" : ""}`}
          aria-pressed={formatPanelOpen}
          onClick={onToggleFormatPanel}
        >
          Format
        </button>

        <button
          type="button"
          className={`workbench-document-top-bar__inspector-btn${inspectorOpen ? " is-active" : ""}`}
          aria-pressed={inspectorOpen}
          onClick={onToggleInspector}
          title="Research inspector"
        >
          Inspector
        </button>
      </div>
    </header>
  );
}
