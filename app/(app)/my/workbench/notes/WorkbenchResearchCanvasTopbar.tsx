"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Bookmark,
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  LayoutTemplate,
  Maximize2,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Redo2,
  Search,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CANVAS_TEMPLATES, type CanvasTemplateId } from "./workbench-canvas-templates";
import WorkbenchIconTip from "./WorkbenchIconTip";
import { WorkbenchCanvasSendToDocumentButton } from "./WorkbenchCanvasSendToDocumentButton";

export type WorkbenchResearchCanvasTopbarProps = {
  canEdit: boolean;
  hidden?: boolean;
  zoom: number;
  controlsHidden: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  hasSelection: boolean;
  bookmarkCount: number;
  readingListCount: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  panelState?: "expanded" | "collapsed" | "hidden";
  onToggleFocus: () => void;
  onTogglePanel: () => void;
  onHidePanel: () => void;
  onApplyTemplate: (id: CanvasTemplateId) => void;
  onToggleArchiveMenu: () => void;
  onAddBookmark: () => void;
  onAddReadingList: () => void;
  onSendToDocument?: () => void;
};

export function WorkbenchResearchCanvasTopbar({
  canEdit,
  hidden = false,
  zoom,
  controlsHidden,
  searchQuery = "",
  onSearchChange,
  hasSelection,
  bookmarkCount,
  readingListCount,
  onZoomOut,
  onZoomIn,
  onFit,
  onUndo,
  onRedo,
  panelState = "expanded",
  onToggleFocus,
  onTogglePanel,
  onHidePanel,
  onApplyTemplate,
  onToggleArchiveMenu,
  onAddBookmark,
  onAddReadingList,
  onSendToDocument,
}: WorkbenchResearchCanvasTopbarProps) {
  const [templateOpen, setTemplateOpen] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!templateOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!templateRef.current?.contains(event.target as Node)) {
        setTemplateOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [templateOpen]);

  return (
    <header
      className={`workbench-research-canvas-topbar${hidden ? " is-hidden" : ""}`}
      aria-label="Canvas controls"
    >
      <div className="workbench-research-canvas-topbar-region workbench-research-canvas-topbar-region--left">
        <div className="workbench-research-canvas-topbar-cluster" ref={templateRef}>
          <WorkbenchIconTip tip="Templates" info="Starter board layouts" variant="canvas">
            <button
              type="button"
              className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
              disabled={!canEdit}
              aria-expanded={templateOpen}
              aria-haspopup="menu"
              aria-label="Templates"
              onClick={() => setTemplateOpen((open) => !open)}
            >
              <LayoutTemplate size={16} strokeWidth={1.75} aria-hidden />
              <ChevronDown size={12} strokeWidth={2} className="workbench-research-canvas-topbar-chevron" aria-hidden />
            </button>
          </WorkbenchIconTip>
          {templateOpen ? (
            <div className="workbench-research-canvas-dropdown" role="menu">
              {CANVAS_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  role="menuitem"
                  className="workbench-research-canvas-dropdown-item workbench-research-canvas-template-item"
                  onClick={() => {
                    onApplyTemplate(template.id);
                    setTemplateOpen(false);
                  }}
                >
                  <span
                    className="workbench-research-canvas-template-item__accent"
                    style={{ background: template.accentColor }}
                    aria-hidden
                  />
                  <span className="workbench-research-canvas-template-item__body">
                    <span className="workbench-research-canvas-template-item__row">
                      <strong>{template.label}</strong>
                      <span className="workbench-research-canvas-template-item__chip">
                        {template.category}
                      </span>
                    </span>
                    <span className="workbench-research-canvas-template-item__desc">
                      {template.description}
                    </span>
                    {template.previewSwatches.length > 0 ? (
                      <span className="workbench-research-canvas-template-item__swatches" aria-hidden>
                        {template.previewSwatches.map((color) => (
                          <span
                            key={`${template.id}-${color}`}
                            className="workbench-research-canvas-template-item__swatch"
                            style={{ background: color }}
                          />
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <WorkbenchIconTip tip="Add from archive" info="Linked records for this note" variant="canvas">
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            disabled={!canEdit}
            aria-label="Add from archive"
            onClick={onToggleArchiveMenu}
          >
            <Archive size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>
        <WorkbenchIconTip
          tip="Bookmarks"
          info={bookmarkCount === 0 ? "No bookmarks yet" : "Insert bookmark as source"}
          variant="canvas"
        >
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            disabled={!canEdit || bookmarkCount === 0}
            aria-label="Bookmarks"
            onClick={onAddBookmark}
          >
            <Bookmark size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>
        <WorkbenchIconTip
          tip="Reading list"
          info={readingListCount === 0 ? "Reading list empty" : "Insert reading list item"}
          variant="canvas"
        >
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            disabled={!canEdit || readingListCount === 0}
            aria-label="Reading list"
            onClick={onAddReadingList}
          >
            <BookOpen size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>
      </div>

      <div className="workbench-research-canvas-topbar-region workbench-research-canvas-topbar-region--center">
        <label className="workbench-research-canvas-search">
          <Search size={15} strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search"
            aria-label="Search canvas"
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </label>
        <div className="workbench-research-canvas-zoom-strip" role="group" aria-label="Zoom">
          <WorkbenchIconTip tip="Zoom out" variant="canvas">
            <button
              type="button"
              className="workbench-research-canvas-topbar-icon-btn"
              onClick={onZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut size={16} strokeWidth={1.75} />
            </button>
          </WorkbenchIconTip>
          <span className="workbench-research-canvas-zoom-value" title={`Zoom ${zoom}%`}>
            {zoom}%
          </span>
          <WorkbenchIconTip tip="Zoom in" variant="canvas">
            <button
              type="button"
              className="workbench-research-canvas-topbar-icon-btn"
              onClick={onZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn size={16} strokeWidth={1.75} />
            </button>
          </WorkbenchIconTip>
        </div>
        <WorkbenchIconTip tip="Fit to view" info="Frame all objects" variant="canvas">
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            onClick={onFit}
            aria-label="Fit to view"
          >
            <Maximize2 size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>
        <span className="workbench-research-canvas-topbar-separator" aria-hidden />
        <WorkbenchIconTip tip="Undo" info="⌘Z" variant="canvas">
          <button
            type="button"
            className="workbench-research-canvas-topbar-icon-btn"
            onClick={onUndo}
            aria-label="Undo"
            disabled={!canEdit}
          >
            <Undo2 size={16} strokeWidth={1.75} />
          </button>
        </WorkbenchIconTip>
        <WorkbenchIconTip tip="Redo" info="⇧⌘Z" variant="canvas">
          <button
            type="button"
            className="workbench-research-canvas-topbar-icon-btn"
            onClick={onRedo}
            aria-label="Redo"
            disabled={!canEdit}
          >
            <Redo2 size={16} strokeWidth={1.75} />
          </button>
        </WorkbenchIconTip>
      </div>

      <div className="workbench-research-canvas-topbar-region workbench-research-canvas-topbar-region--right">
        {hasSelection && onSendToDocument ? (
          <WorkbenchIconTip tip="Send to document" info="Insert selection into note" variant="canvas">
            <WorkbenchCanvasSendToDocumentButton variant="topbar" onSend={onSendToDocument} />
          </WorkbenchIconTip>
        ) : null}
        <WorkbenchIconTip
          tip={panelState === "expanded" ? "Collapse panel" : "Expand panel"}
          variant="canvas"
        >
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            onClick={onTogglePanel}
            aria-pressed={panelState === "expanded"}
            aria-label={panelState === "expanded" ? "Collapse panel" : "Expand panel"}
          >
            {panelState === "expanded" ? (
              <PanelRightClose size={16} strokeWidth={1.75} aria-hidden />
            ) : (
              <PanelRight size={16} strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </WorkbenchIconTip>
        <WorkbenchIconTip tip={panelState === "hidden" ? "Show panel" : "Hide panel"} variant="canvas">
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            onClick={onHidePanel}
            aria-label={panelState === "hidden" ? "Show panel" : "Hide panel"}
          >
            <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </WorkbenchIconTip>
        <WorkbenchIconTip tip={controlsHidden ? "Show UI" : "Focus mode"} info="Hide chrome" variant="canvas">
          <button
            type="button"
            className="workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn"
            onClick={onToggleFocus}
            aria-pressed={controlsHidden}
            aria-label={controlsHidden ? "Show UI" : "Focus mode"}
          >
            {controlsHidden ? (
              <Eye size={16} strokeWidth={1.75} aria-hidden />
            ) : (
              <EyeOff size={16} strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </WorkbenchIconTip>
      </div>
    </header>
  );
}
