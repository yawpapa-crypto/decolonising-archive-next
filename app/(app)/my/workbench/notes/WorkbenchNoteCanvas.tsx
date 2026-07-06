"use client";

/**
 * Canvas mode entry — premium research canvas (separate from Board).
 * Re-exports legacy block types for callers that still reference them.
 */

export type {
  CanvasObject,
  CanvasObjectType,
  CanvasToolId,
  WorkbenchCanvasData,
} from "./workbench-canvas-types";

/** @deprecated Use CanvasObjectType — kept for menu helpers in WorkbenchNotesClient */
export type CanvasBlockType =
  | "text"
  | "sticky"
  | "quote"
  | "archiveRecord"
  | "imagePlaceholder";

/** @deprecated Use CanvasObject */
export type WorkbenchCanvasBlock = {
  id: string;
  type: CanvasBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  linkedRecordId?: string | null;
};

export { EMPTY_CANVAS_DATA } from "./workbench-canvas-types";
export { getCanvasDataFromJson as getCanvasData } from "./workbench-canvas-state";

export { default } from "./WorkbenchResearchCanvas";
