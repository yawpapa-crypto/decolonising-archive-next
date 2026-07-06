"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasObject } from "./workbench-canvas-types";
import {
  anchorPointOnRect,
  connectorCurvePath,
  hitTestLine,
  isLineLikeObject,
  lineEndpoints,
  objectRect,
} from "./workbench-canvas-geometry";
import {
  WorkbenchResearchCanvasLineHandles,
  type LineEndpoint,
} from "./WorkbenchResearchCanvasLineHandles";

const PREVIEW_LINE_ID = "__line-preview__";

export type WorkbenchResearchCanvasLinesProps = {
  objects: CanvasObject[];
  worldWidth: number;
  worldHeight: number;
  selectedId: string | null;
  hoveredLineId: string | null;
  connectorDraftId: string | null;
  draftPointer: { x: number; y: number } | null;
  canEdit: boolean;
  onSelectLine: (id: string) => void;
  onLinePointerDown: (event: ReactPointerEvent, obj: CanvasObject) => void;
  onStartEndpointDrag?: (event: ReactPointerEvent<SVGCircleElement>, endpoint: LineEndpoint, obj: CanvasObject) => void;
};

function strokeDash(lineStyle: CanvasObject["lineStyle"]) {
  if (lineStyle === "dashed") return "8 6";
  if (lineStyle === "dotted") return "2 5";
  return undefined;
}

export function WorkbenchResearchCanvasLines({
  objects,
  worldWidth,
  worldHeight,
  selectedId,
  hoveredLineId,
  connectorDraftId,
  draftPointer,
  canEdit,
  onSelectLine,
  onLinePointerDown,
  onStartEndpointDrag,
}: WorkbenchResearchCanvasLinesProps) {
  const lineObjects = objects.filter(isLineLikeObject);
  const solidObjects = objects.filter((o) => !isLineLikeObject(o));
  const selectedLine =
    selectedId != null
      ? lineObjects.find((o) => o.id === selectedId && o.id !== PREVIEW_LINE_ID)
      : undefined;

  const draftSource = connectorDraftId
    ? solidObjects.find((o) => o.id === connectorDraftId)
    : null;

  let draftLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (draftSource && draftPointer) {
    const anchor = anchorPointOnRect(
      objectRect(draftSource),
      draftPointer.x,
      draftPointer.y,
    );
    draftLine = { x1: anchor.x, y1: anchor.y, x2: draftPointer.x, y2: draftPointer.y };
  }

  if (!lineObjects.length && !draftLine) return null;

  return (
    <svg
      className="workbench-research-canvas-lines"
      width={worldWidth}
      height={worldHeight}
      aria-hidden={!lineObjects.length}
    >
      <defs>
        <marker
          id="wrc-arrow-end"
          viewBox="0 0 12 12"
          markerWidth="11"
          markerHeight="11"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1.2 1.2 L10.8 6 L1.2 10.8 Z"
            fill="rgba(47, 45, 56, 0.55)"
            stroke="none"
          />
        </marker>
        <marker
          id="wrc-arrow-start"
          viewBox="0 0 12 12"
          markerWidth="11"
          markerHeight="11"
          refX="2"
          refY="6"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M10.8 1.2 L1.2 6 L10.8 10.8 Z"
            fill="rgba(47, 45, 56, 0.55)"
            stroke="none"
          />
        </marker>
      </defs>

      {lineObjects.map((obj) => {
        const isPreview = obj.id === PREVIEW_LINE_ID;
        const isSelected = selectedId === obj.id;
        const isHovered = hoveredLineId === obj.id;
        const { x1, y1, x2, y2 } = lineEndpoints(obj);
        const stroke = obj.stroke || "rgba(47, 45, 56, 0.42)";
        const strokeW = Math.max(2, obj.strokeWidth || 2.25);
        const dash = strokeDash(obj.lineStyle);
        const showArrowEnd = obj.arrowEnd === "arrow" || obj.type === "arrow";
        const showArrowStart = obj.arrowStart === "arrow";

        const pathD =
          obj.type === "connector"
            ? connectorCurvePath(x1, y1, x2, y2)
            : undefined;

        return (
          <g
            key={obj.id}
            className={[
              "workbench-research-canvas-line",
              `is-${obj.type}`,
              isSelected ? "is-selected" : "",
              isHovered ? "is-hovered" : "",
              isPreview ? "is-preview" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={(e) => {
              if (!canEdit || isPreview) return;
              onLinePointerDown(e, obj);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isPreview) onSelectLine(obj.id);
            }}
          >
            {pathD ? (
              <path
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeW}
                strokeDasharray={dash}
                strokeLinecap="round"
                markerEnd={showArrowEnd ? "url(#wrc-arrow-end)" : undefined}
                markerStart={showArrowStart ? "url(#wrc-arrow-start)" : undefined}
                className="workbench-research-canvas-line-stroke"
              />
            ) : (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={strokeW}
                strokeDasharray={dash}
                strokeLinecap="round"
                markerEnd={showArrowEnd ? "url(#wrc-arrow-end)" : undefined}
                markerStart={showArrowStart ? "url(#wrc-arrow-start)" : undefined}
                className="workbench-research-canvas-line-stroke"
              />
            )}
            <path
              d={
                pathD ??
                `M ${x1} ${y1} L ${x2} ${y2}`
              }
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="workbench-research-canvas-line-hit"
            />
            {isSelected ? (
              pathD ? (
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(217,255,63,0.85)"
                  strokeWidth={strokeW + 6}
                  strokeLinecap="round"
                  className="workbench-research-canvas-line-selection-ring"
                  pointerEvents="none"
                />
              ) : (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(217,255,63,0.85)"
                  strokeWidth={strokeW + 6}
                  strokeLinecap="round"
                  className="workbench-research-canvas-line-selection-ring"
                  pointerEvents="none"
                />
              )
            ) : null}
            {obj.label ? (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 8}
                fontSize="11"
                fontWeight="500"
                fill={stroke}
                textAnchor="middle"
                pointerEvents="none"
              >
                {obj.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {draftLine ? (
        <g className="workbench-research-canvas-line is-draft" pointerEvents="none">
          <path
            d={connectorCurvePath(draftLine.x1, draftLine.y1, draftLine.x2, draftLine.y2)}
            fill="none"
            stroke="rgba(11,15,20,0.35)"
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          <circle cx={draftLine.x2} cy={draftLine.y2} r={5} fill="#d9ff3f" stroke="#0b0f14" strokeWidth={1.5} />
        </g>
      ) : null}

      {selectedLine && onStartEndpointDrag ? (
        <WorkbenchResearchCanvasLineHandles
          obj={selectedLine}
          canEdit={canEdit}
          onStartEndpointDrag={(event, endpoint) =>
            onStartEndpointDrag(event, endpoint, selectedLine)
          }
        />
      ) : null}
    </svg>
  );
}

export { PREVIEW_LINE_ID };

export function findLineAtPoint(
  objects: CanvasObject[],
  worldX: number,
  worldY: number,
): CanvasObject | null {
  const lines = objects.filter(isLineLikeObject).filter((o) => o.id !== PREVIEW_LINE_ID);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const obj = lines[i];
    if (hitTestLine(obj, worldX, worldY, 12)) return obj;
  }
  return null;
}
