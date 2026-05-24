"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Kanban,
  Settings2,
  SlidersHorizontal,
  Table2,
} from "lucide-react";
import WorkbenchDocumentZoomControls from "./WorkbenchDocumentZoomControls";

export type DocumentSidebarTab = "format" | "document";

type NoteModeOption = { id: string; label: string };

type DocumentQuickActions = {
  onInsertLink: () => void;
  onInsertTable: () => void;
  onInsertImage: () => void;
  onOpenSettings?: () => void;
  insertDisabled?: boolean;
  settingsDisabled?: boolean;
};

const MODE_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  canvas: LayoutGrid,
  board: Kanban,
};

const MODE_TIPS: Record<string, string> = {
  document: "Document",
  canvas: "Canvas",
  board: "Board",
};
const TASKBAR_MODE_ORDER = ["document", "board", "canvas"];

const ICON_SIZE = 18;
const ICON_STROKE = 2;

type Props = {
  menuBar: ReactNode;
  insertMenu: ReactNode;
  typographyControls?: ReactNode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  noteModes: NoteModeOption[];
  activeMode: string;
  onModeChange: (mode: string) => void;
  formatPanelOpen: boolean;
  onToggleFormatPanel: () => void;
  quickActions: DocumentQuickActions;
  collaborationControls?: ReactNode;
  workspaceBadge?: ReactNode;
};

export default function WorkbenchDocumentTopBar({
  menuBar,
  insertMenu,
  typographyControls,
  zoom,
  onZoomChange,
  noteModes,
  activeMode,
  onModeChange,
  formatPanelOpen,
  onToggleFormatPanel,
  quickActions,
  collaborationControls,
  workspaceBadge,
}: Props) {
  const taskbarModes = [...noteModes].sort(
    (left, right) =>
      TASKBAR_MODE_ORDER.indexOf(left.id) - TASKBAR_MODE_ORDER.indexOf(right.id),
  );

  return (
    <header className="workbench-document-taskbar" aria-label="Document taskbar">
      <div className="workbench-document-taskbar__rail">
        {collaborationControls ? (
          <div className="workbench-document-taskbar-group workbench-document-taskbar-group--collaboration">
            {collaborationControls}
          </div>
        ) : null}

        <span className="workbench-document-taskbar-separator" aria-hidden />

        <div className="workbench-document-taskbar-group workbench-document-taskbar-group--menus">
          {menuBar}
        </div>

        <span
          className="workbench-document-taskbar-separator workbench-document-taskbar-separator--insert"
          aria-hidden
        />

        <div
          className="workbench-document-taskbar-group workbench-document-taskbar-group--insert"
          role="group"
          aria-label="Insert"
        >
          {insertMenu}
        </div>

        <span
          className="workbench-document-taskbar-separator workbench-document-taskbar-separator--zoom"
          aria-hidden
        />

        <div className="workbench-document-taskbar-group workbench-document-taskbar-group--zoom">
          <WorkbenchDocumentZoomControls zoom={zoom} onZoomChange={onZoomChange} />
        </div>
      </div>

      <div className="workbench-document-taskbar__center" aria-label="Text style">
        {typographyControls}
      </div>

      <div className="workbench-document-taskbar__tail">
        {workspaceBadge ? (
          <span className="workbench-document-taskbar-secondary">{workspaceBadge}</span>
        ) : null}

        <div
          className="workbench-document-taskbar-segment workbench-document-taskbar-segment--modes"
          role="tablist"
          aria-label="Note mode"
        >
          {taskbarModes.map((mode) => {
            const ModeIcon = MODE_ICONS[mode.id] ?? FileText;
            const tip = MODE_TIPS[mode.id] ?? mode.label;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                className={`workbench-document-taskbar-button workbench-document-mode-button workbench-document-mode-button--${mode.id}${
                  activeMode === mode.id ? " is-active" : ""
                }`}
                aria-selected={activeMode === mode.id}
                aria-label={tip}
                data-tooltip={tip}
                onClick={() => onModeChange(mode.id)}
              >
                <ModeIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
              </button>
            );
          })}
        </div>

        <span className="workbench-document-taskbar-separator workbench-document-taskbar-separator--utilities" aria-hidden />

        <div
          className="workbench-document-taskbar-segment workbench-document-taskbar-segment--utilities"
          role="group"
          aria-label="Insert quick actions"
        >
          <button
            type="button"
            className="workbench-document-taskbar-button workbench-document-utility-button workbench-document-utility-button--link"
            aria-label="Link"
            data-tooltip="Link"
            disabled={quickActions.insertDisabled}
            onClick={quickActions.onInsertLink}
          >
            <Link2 size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
          <button
            type="button"
            className="workbench-document-taskbar-button workbench-document-utility-button workbench-document-utility-button--table"
            aria-label="Table"
            data-tooltip="Table"
            disabled={quickActions.insertDisabled}
            onClick={quickActions.onInsertTable}
          >
            <Table2 size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
          <button
            type="button"
            className="workbench-document-taskbar-button workbench-document-utility-button workbench-document-utility-button--image"
            aria-label="Image"
            data-tooltip="Image"
            disabled={quickActions.insertDisabled}
            onClick={quickActions.onInsertImage}
          >
            <ImageIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        </div>

        <span className="workbench-document-taskbar-separator workbench-document-taskbar-separator--settings" aria-hidden />

        <div
          className="workbench-document-taskbar-segment workbench-document-taskbar-segment--panels"
          role="group"
          aria-label="Document panels"
        >
          <button
            type="button"
            className="workbench-document-taskbar-button workbench-document-taskbar-button--settings"
            aria-label={quickActions.settingsDisabled ? "Project settings unavailable" : "Settings"}
            data-tooltip={quickActions.settingsDisabled ? "Project settings unavailable" : "Settings"}
            disabled={quickActions.settingsDisabled || !quickActions.onOpenSettings}
            onClick={quickActions.onOpenSettings}
          >
            <Settings2 size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
          <button
            type="button"
            className={`workbench-document-taskbar-button workbench-document-taskbar-button--panel${
              formatPanelOpen ? " is-active" : ""
            }`}
            aria-pressed={formatPanelOpen}
            aria-label="Format"
            data-tooltip="Format"
            onClick={onToggleFormatPanel}
          >
            <SlidersHorizontal size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
