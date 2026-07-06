"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasObject } from "./workbench-canvas-types";
import { RESIZE_HANDLES, type ResizeHandle } from "./workbench-canvas-geometry";

export type WorkbenchResearchCanvasSelectionProps = {
  obj: CanvasObject;
  canEdit: boolean;
  connectorDraftSource?: boolean;
  onStartResize: (
    event: ReactPointerEvent<HTMLSpanElement>,
    handle: ResizeHandle,
    worldX: number,
    worldY: number,
  ) => void;
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
};

export function WorkbenchResearchCanvasSelection({
  obj,
  canEdit,
  connectorDraftSource = false,
  onStartResize,
  screenToWorld,
}: WorkbenchResearchCanvasSelectionProps) {
  return (
    <div
      className={[
        "workbench-research-canvas-selection",
        connectorDraftSource ? "is-connector-source" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        zIndex: obj.zIndex + 1,
        borderRadius: obj.cornerRadius,
      }}
      aria-hidden
    >
      <span className="workbench-research-canvas-selection-ring" />
      {canEdit && !obj.locked
        ? RESIZE_HANDLES.map((handle) => (
            <span
              key={handle.id}
              className={`workbench-research-canvas-selection-handle ${handle.className}`}
              style={{ cursor: handle.cursor }}
              aria-label={`Resize ${handle.id}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                const world = screenToWorld(e.clientX, e.clientY);
                onStartResize(e, handle.id, world.x, world.y);
              }}
            />
          ))
        : null}
    </div>
  );
}
