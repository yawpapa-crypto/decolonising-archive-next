"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  ImageIcon,
  Lock,
  LockOpen,
  PanelRight,
  Quote,
  Send,
  Trash2,
} from "lucide-react";
import type { CanvasObject } from "./workbench-canvas-types";
import { CANVAS_TYPE_LABELS } from "./workbench-canvas-type-labels";

export type CanvasObjectMenuAnchor =
  | { type: "pointer"; x: number; y: number }
  | { type: "button"; rect: DOMRect };

export type WorkbenchCanvasObjectMenuProps = {
  obj: CanvasObject;
  open: boolean;
  anchor: CanvasObjectMenuAnchor | null;
  canEdit: boolean;
  onClose: () => void;
  onInspect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onLayerForward: () => void;
  onLayerBackward: () => void;
  onSendToDocument?: () => void;
  onOpenRecord?: () => void;
  onCite?: () => void;
  onReplaceImage?: () => void;
};

function clampMenuPosition(left: number, top: number, width: number, height: number) {
  const margin = 12;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

export function WorkbenchCanvasObjectMenu({
  obj,
  open,
  anchor,
  canEdit,
  onClose,
  onInspect,
  onDuplicate,
  onDelete,
  onToggleLock,
  onLayerForward,
  onLayerBackward,
  onSendToDocument,
  onOpenRecord,
  onCite,
  onReplaceImage,
}: WorkbenchCanvasObjectMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor || !panelRef.current) {
      setPosition(null);
      return;
    }
    const panel = panelRef.current;
    const width = panel.offsetWidth || 220;
    const height = panel.offsetHeight || 280;
    let left = 0;
    let top = 0;
    if (anchor.type === "pointer") {
      left = anchor.x + 4;
      top = anchor.y + 4;
    } else {
      left = anchor.rect.right - width;
      top = anchor.rect.bottom + 6;
    }
    setPosition(clampMenuPosition(left, top, width, height));
  }, [anchor, open, obj.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open || !anchor) return null;

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  const typeLabel = CANVAS_TYPE_LABELS[obj.type] ?? obj.type;

  const menu = (
    <>
      <div
        className="workbench-canvas-object-menu-backdrop"
        aria-hidden
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        ref={panelRef}
        className="workbench-canvas-object-menu-panel"
        role="menu"
        aria-label={`${typeLabel} actions`}
        style={
          position
            ? { position: "fixed", left: position.left, top: position.top, visibility: "visible" }
            : { position: "fixed", left: -9999, top: -9999, visibility: "hidden" }
        }
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <p className="workbench-canvas-object-menu-heading">{typeLabel}</p>
        <button type="button" className="workbench-canvas-object-menu-item" onClick={run(onInspect)}>
          <PanelRight size={14} aria-hidden />
          <span>Open inspector</span>
        </button>
        {onSendToDocument ? (
          <button
            type="button"
            className="workbench-canvas-object-menu-item"
            onClick={run(onSendToDocument)}
          >
            <Send size={14} aria-hidden />
            <span>Send to document</span>
          </button>
        ) : null}
        {obj.type === "source" && obj.linkedRecordId && onOpenRecord ? (
          <button type="button" className="workbench-canvas-object-menu-item" onClick={run(onOpenRecord)}>
            <ExternalLink size={14} aria-hidden />
            <span>Open record</span>
          </button>
        ) : null}
        {obj.type === "source" && obj.linkedRecordId && onCite ? (
          <button type="button" className="workbench-canvas-object-menu-item" onClick={run(onCite)}>
            <ExternalLink size={14} aria-hidden />
            <Quote size={14} aria-hidden />
            <span>Cite</span>
          </button>
        ) : null}
        {obj.type === "image" && onReplaceImage ? (
          <button
            type="button"
            className="workbench-canvas-object-menu-item"
            disabled={!canEdit}
            onClick={run(onReplaceImage)}
          >
            <ImageIcon size={14} aria-hidden />
            <span>{obj.imageUrl ? "Replace image" : "Add image"}</span>
          </button>
        ) : null}
        <div className="workbench-canvas-object-menu-divider" role="separator" />
        <button
          type="button"
          className="workbench-canvas-object-menu-item"
          disabled={!canEdit}
          onClick={run(onDuplicate)}
        >
          <Copy size={14} aria-hidden />
          <span>Duplicate</span>
        </button>
        <button
          type="button"
          className="workbench-canvas-object-menu-item"
          disabled={!canEdit}
          onClick={run(onToggleLock)}
        >
          {obj.locked ? <LockOpen size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
          <span>{obj.locked ? "Unlock" : "Lock"}</span>
        </button>
        <button
          type="button"
          className="workbench-canvas-object-menu-item"
          disabled={!canEdit}
          onClick={run(onLayerForward)}
        >
          <ArrowUp size={14} aria-hidden />
          <span>Bring forward</span>
        </button>
        <button
          type="button"
          className="workbench-canvas-object-menu-item"
          disabled={!canEdit}
          onClick={run(onLayerBackward)}
        >
          <ArrowDown size={14} aria-hidden />
          <span>Send backward</span>
        </button>
        <div className="workbench-canvas-object-menu-divider" role="separator" />
        <button
          type="button"
          className="workbench-canvas-object-menu-item workbench-canvas-object-menu-item--danger"
          disabled={!canEdit}
          onClick={run(onDelete)}
        >
          <Trash2 size={14} aria-hidden />
          <span>Delete</span>
        </button>
      </div>
    </>
  );

  return createPortal(menu, document.body);
}
