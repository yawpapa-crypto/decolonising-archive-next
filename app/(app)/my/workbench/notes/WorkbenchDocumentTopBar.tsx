"use client";

import type { ReactNode } from "react";
import {
  FilePlus,
  Quote,
  Image as ImageIcon,
  Table,
  FileText,
  LayoutGrid,
  Kanban,
  SlidersHorizontal,
  PanelRight,
} from "lucide-react";
import WorkbenchDocumentZoomControls from "./WorkbenchDocumentZoomControls";
import WorkbenchIconTip from "./WorkbenchIconTip";

export type DocumentSidebarTab = "format" | "document";

type NoteModeOption = { id: string; label: string };

const MODE_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  canvas: LayoutGrid,
  board: Kanban,
};

const MODE_TIPS: Record<string, { tip: string; info: string }> = {
  document: { tip: "Document", info: "Paged writing view" },
  canvas: { tip: "Canvas", info: "Freeform blocks" },
  board: { tip: "Board", info: "Cards & sources" },
};

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
    <header
      className="workbench-document-top-bar workbench-document-top-bar--notion"
      aria-label="Document controls"
    >
      <div className="workbench-document-top-bar__left">
        <div className="workbench-document-top-bar__group workbench-document-top-bar__menus">
          {menuBar}
        </div>

        <div className="workbench-document-top-bar__group workbench-document-top-bar__zoom">
          <WorkbenchDocumentZoomControls zoom={zoom} onZoomChange={onZoomChange} />
        </div>

        <div
          className="workbench-document-top-bar__group workbench-document-top-bar__insert"
          role="group"
          aria-label="Insert"
        >
          <WorkbenchIconTip tip="Add page" info="New page at cursor">
            <button
              type="button"
              className="workbench-document-top-bar__icon-btn"
              disabled={!canEdit || !onInsertPageBreak}
              onClick={onInsertPageBreak}
              aria-label="Add page — new page at cursor"
            >
              <FilePlus size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </WorkbenchIconTip>
          <WorkbenchIconTip tip="Cite" info="Insert reference">
            <button
              type="button"
              className="workbench-document-top-bar__icon-btn"
              disabled={!canEdit || !onInsertCitation}
              onClick={onInsertCitation}
              aria-label="Cite — insert reference"
            >
              <Quote size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </WorkbenchIconTip>
          <WorkbenchIconTip tip="Image" info="Upload or embed">
            <button
              type="button"
              className="workbench-document-top-bar__icon-btn"
              disabled={!canEdit || !onInsertImage}
              onClick={onInsertImage}
              aria-label="Image — upload or embed"
            >
              <ImageIcon size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </WorkbenchIconTip>
          <WorkbenchIconTip tip="Table" info="Insert grid">
            <button
              type="button"
              className="workbench-document-top-bar__icon-btn"
              disabled={!canEdit || !onInsertTable}
              onClick={onInsertTable}
              aria-label="Table — insert grid"
            >
              <Table size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </WorkbenchIconTip>
        </div>
      </div>

      <div className="workbench-document-top-bar__right">
        <div
          className="workbench-document-mode-switcher workbench-document-mode-switcher--icons"
          role="tablist"
          aria-label="Note mode"
        >
          {noteModes.map((mode) => {
            const ModeIcon = MODE_ICONS[mode.id] ?? FileText;
            const modeTip = MODE_TIPS[mode.id] ?? { tip: mode.label, info: "Switch view" };
            return (
              <WorkbenchIconTip key={mode.id} tip={modeTip.tip} info={modeTip.info}>
                <button
                  type="button"
                  role="tab"
                  className={`workbench-document-mode-button workbench-document-mode-button--icon${
                    activeMode === mode.id ? " is-active" : ""
                  }`}
                  aria-selected={activeMode === mode.id}
                  aria-label={`${modeTip.tip} — ${modeTip.info}`}
                  onClick={() => onModeChange(mode.id)}
                >
                  <ModeIcon size={16} strokeWidth={1.75} aria-hidden />
                </button>
              </WorkbenchIconTip>
            );
          })}
        </div>

        <WorkbenchIconTip tip="Format" info="Text & layout">
          <button
            type="button"
            className={`workbench-document-top-bar__icon-btn workbench-document-top-bar__format-btn${
              formatPanelOpen ? " is-active" : ""
            }`}
            aria-pressed={formatPanelOpen}
            aria-label="Format — text and layout"
            onClick={onToggleFormatPanel}
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>

        <WorkbenchIconTip tip="Inspector" info="Sources & notes">
          <button
            type="button"
            className={`workbench-document-top-bar__icon-btn workbench-document-top-bar__inspector-btn${
              inspectorOpen ? " is-active" : ""
            }`}
            aria-pressed={inspectorOpen}
            aria-label="Inspector — sources and notes"
            onClick={onToggleInspector}
          >
            <PanelRight size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>
      </div>
    </header>
  );
}
