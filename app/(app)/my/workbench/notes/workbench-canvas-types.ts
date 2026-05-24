/** Visual research canvas object model (separate from Board cards). */

export type CanvasObjectType =
  | "text"
  | "sticky"
  | "shape"
  | "line"
  | "arrow"
  | "connector"
  | "frame"
  | "image"
  | "source"
  | "quote"
  | "question"
  | "task"
  | "link"
  | "comment"
  | "citation";

export type CanvasShapeType = "rectangle" | "roundedRectangle" | "circle" | "ellipse";

export type CanvasTextAlign = "left" | "center" | "right";

export type CanvasImageFit = "cover" | "contain";

export type CanvasLineStyle = "solid" | "dashed" | "dotted";

export type CanvasArrowEnd = "none" | "arrow";

export type CanvasSourceOrigin = "archive" | "bookmark" | "reading_list" | "manual";

export type CanvasToolId =
  | "select"
  | "pan"
  | "text"
  | "sticky"
  | "rectangle"
  | "roundedRectangle"
  | "circle"
  | "line"
  | "arrow"
  | "connector"
  | "frame"
  | "image"
  | "source"
  | "quote"
  | "question"
  | "task"
  | "link"
  | "comment"
  | "citation";

export type CanvasObject = {
  id: string;
  type: CanvasObjectType;
  shapeType?: CanvasShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  title: string;
  body: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  textSize: number;
  textAlign: CanvasTextAlign;
  cornerRadius: number;
  locked: boolean;
  groupId?: string | null;
  parentFrameId?: string | null;
  tags?: string[];
  workflowStatus?: string;
  linkedRecordId?: string | null;
  bookmarkId?: string | null;
  readingListId?: string | null;
  citationId?: string | null;
  sourceOrigin?: CanvasSourceOrigin;
  creator?: string;
  date?: string;
  sourceLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageCaption?: string;
  imageFit?: CanvasImageFit;
  sourceId?: string | null;
  targetId?: string | null;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  label?: string;
  lineStyle?: CanvasLineStyle;
  arrowStart?: CanvasArrowEnd;
  arrowEnd?: CanvasArrowEnd;
  createdAt: string;
  updatedAt: string;
};

export type WorkbenchCanvasData = {
  version: number;
  objects: CanvasObject[];
};

export const CANVAS_DATA_VERSION = 2;

export const EMPTY_CANVAS_DATA: WorkbenchCanvasData = {
  version: CANVAS_DATA_VERSION,
  objects: [],
};

/** Legacy block types (v1) — migrated on read only. */
export type LegacyCanvasBlockType =
  | "text"
  | "sticky"
  | "quote"
  | "archiveRecord"
  | "imagePlaceholder";

export type LegacyWorkbenchCanvasBlock = {
  id: string;
  type: LegacyCanvasBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  linkedRecordId?: string | null;
};

export type LegacyWorkbenchCanvasData = {
  blocks?: LegacyWorkbenchCanvasBlock[];
  objects?: CanvasObject[];
  version?: number;
};
