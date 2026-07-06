"use client";

import { Eye, Maximize2, PanelRight, Plus, ZoomIn, ZoomOut } from "lucide-react";
import WorkbenchIconTip from "./WorkbenchIconTip";

export type WorkbenchCanvasMinidockProps = {
  zoom: number;
  focusMode: boolean;
  canEdit: boolean;
  onShowUi: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onOpenAdd: () => void;
  onTogglePanel: () => void;
};

export function WorkbenchCanvasMinidock({
  zoom,
  focusMode,
  canEdit,
  onShowUi,
  onZoomOut,
  onZoomIn,
  onFit,
  onOpenAdd,
  onTogglePanel,
}: WorkbenchCanvasMinidockProps) {
  return (
    <div
      className={`workbench-canvas-minidock${focusMode ? " is-focus" : ""}`}
      role="toolbar"
      aria-label="Canvas quick controls"
    >
      {focusMode ? (
        <WorkbenchIconTip tip="Show UI" info="Exit focus mode" variant="canvas">
          <button
            type="button"
            className="workbench-canvas-minidock__btn workbench-canvas-minidock__btn--primary workbench-canvas-minidock__btn--icon"
            onClick={onShowUi}
            aria-label="Show UI"
          >
            <Eye size={16} aria-hidden />
          </button>
        </WorkbenchIconTip>
      ) : null}
      <WorkbenchIconTip tip="Zoom out" variant="canvas">
        <button
          type="button"
          className="workbench-canvas-minidock__btn workbench-canvas-minidock__btn--icon"
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          <ZoomOut size={16} aria-hidden />
        </button>
      </WorkbenchIconTip>
      <span className="workbench-canvas-minidock__zoom" aria-live="polite" title={`Zoom ${zoom}%`}>
        {zoom}%
      </span>
      <WorkbenchIconTip tip="Zoom in" variant="canvas">
        <button
          type="button"
          className="workbench-canvas-minidock__btn workbench-canvas-minidock__btn--icon"
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          <ZoomIn size={16} aria-hidden />
        </button>
      </WorkbenchIconTip>
      <WorkbenchIconTip tip="Fit to view" variant="canvas">
        <button
          type="button"
          className="workbench-canvas-minidock__btn workbench-canvas-minidock__btn--icon"
          onClick={onFit}
          aria-label="Fit to view"
        >
          <Maximize2 size={15} aria-hidden />
        </button>
      </WorkbenchIconTip>
      <WorkbenchIconTip tip="Side panel" variant="canvas">
        <button
          type="button"
          className="workbench-canvas-minidock__btn workbench-canvas-minidock__btn--icon"
          aria-label="Toggle side panel"
          onClick={onTogglePanel}
        >
          <PanelRight size={16} aria-hidden />
        </button>
      </WorkbenchIconTip>
      <WorkbenchIconTip tip="Add to canvas" variant="canvas">
        <button
          type="button"
          className="workbench-canvas-minidock__btn workbench-canvas-minidock__btn--add workbench-canvas-minidock__btn--icon"
          aria-label="Add to canvas"
          disabled={!canEdit}
          onClick={onOpenAdd}
        >
          <Plus size={18} aria-hidden />
        </button>
      </WorkbenchIconTip>
    </div>
  );
}
