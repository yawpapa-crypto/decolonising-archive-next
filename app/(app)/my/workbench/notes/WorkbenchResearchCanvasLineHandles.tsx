"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasObject } from "./workbench-canvas-types";
import { lineEndpoints } from "./workbench-canvas-geometry";

export type LineEndpoint = "start" | "end";

export type WorkbenchResearchCanvasLineHandlesProps = {
  obj: CanvasObject;
  canEdit: boolean;
  onStartEndpointDrag: (
    event: ReactPointerEvent<SVGCircleElement>,
    endpoint: LineEndpoint,
  ) => void;
};

export function WorkbenchResearchCanvasLineHandles({
  obj,
  canEdit,
  onStartEndpointDrag,
}: WorkbenchResearchCanvasLineHandlesProps) {
  const { x1, y1, x2, y2 } = lineEndpoints(obj);

  if (!canEdit || obj.locked) return null;
  if (obj.type === "connector" && (obj.sourceId || obj.targetId)) return null;

  return (
    <g className="workbench-research-canvas-line-handles" pointerEvents="none">
      <circle
        cx={x1}
        cy={y1}
        r={6}
        className="workbench-research-canvas-line-handle"
        pointerEvents="all"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          onStartEndpointDrag(e, "start");
        }}
      />
      <circle
        cx={x2}
        cy={y2}
        r={6}
        className="workbench-research-canvas-line-handle"
        pointerEvents="all"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          onStartEndpointDrag(e, "end");
        }}
      />
    </g>
  );
}
