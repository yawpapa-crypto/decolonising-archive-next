"use client";

import type { CanvasObject, CanvasShapeType } from "./workbench-canvas-types";

function viewBoxRadius(shapeType: CanvasShapeType | undefined, cornerRadius: number): number {
  if (shapeType === "circle" || shapeType === "ellipse") return 50;
  if (shapeType === "rectangle") return 2;
  return Math.min(18, Math.max(3, cornerRadius * 0.55));
}

export type WorkbenchResearchCanvasShapeViewProps = {
  obj: CanvasObject;
  canEdit: boolean;
  showLabel: boolean;
  onTitleChange: (value: string) => void;
};

export function WorkbenchResearchCanvasShapeView({
  obj,
  canEdit,
  showLabel,
  onTitleChange,
}: WorkbenchResearchCanvasShapeViewProps) {
  const shapeType = obj.shapeType ?? "roundedRectangle";
  const rx = viewBoxRadius(shapeType, obj.cornerRadius);
  const fillId = `wrc-shape-fill-${obj.id}`;
  const strokeId = `wrc-shape-stroke-${obj.id}`;
  const isRound = shapeType === "circle" || shapeType === "ellipse";
  const strokeW = Math.max(1, obj.strokeWidth || 1.5);
  const pad = strokeW * 0.5;

  return (
    <>
      <svg
        className="workbench-research-canvas-shape__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.38)" />
            <stop offset="38%" stopColor={obj.fill} />
            <stop offset="100%" stopColor={obj.fill} />
          </linearGradient>
          <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
            <stop offset="100%" stopColor={obj.stroke} />
          </linearGradient>
        </defs>
        {isRound ? (
          <ellipse
            className="workbench-research-canvas-shape__geom"
            cx="50"
            cy="50"
            rx={50 - pad}
            ry={50 - pad}
            fill={`url(#${fillId})`}
            stroke={`url(#${strokeId})`}
            strokeWidth={strokeW}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect
            className="workbench-research-canvas-shape__geom"
            x={pad}
            y={pad}
            width={100 - pad * 2}
            height={100 - pad * 2}
            rx={rx}
            ry={rx}
            fill={`url(#${fillId})`}
            stroke={`url(#${strokeId})`}
            strokeWidth={strokeW}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {showLabel ? (
        <div className="workbench-research-canvas-shape__label">
          <input
            type="text"
            value={obj.title}
            placeholder="Label"
            readOnly={!canEdit}
            style={{ textAlign: obj.textAlign }}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
      ) : null}
    </>
  );
}
