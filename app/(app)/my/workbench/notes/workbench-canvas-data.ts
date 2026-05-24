import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import {
  CANVAS_DATA_VERSION,
  EMPTY_CANVAS_DATA,
  type CanvasObject,
  type CanvasObjectType,
  type CanvasShapeType,
  type CanvasSourceOrigin,
  type CanvasToolId,
  type LegacyWorkbenchCanvasBlock,
  type LegacyWorkbenchCanvasData,
  type WorkbenchCanvasData,
} from "./workbench-canvas-types";
import { anchorPointOnRect, objectRect } from "./workbench-canvas-geometry";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const NOW = () => new Date().toISOString();

export const CANVAS_GRID_SIZE = 24;
export const CANVAS_WORLD_WIDTH = 4800;
export const CANVAS_WORLD_HEIGHT = 3200;
export const CANVAS_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const DEFAULTS: Omit<CanvasObject, "id" | "type" | "x" | "y" | "width" | "height" | "createdAt" | "updatedAt"> = {
  zIndex: 1,
  title: "",
  body: "",
  fill: "#ffffff",
  stroke: "rgba(47, 45, 56, 0.22)",
  strokeWidth: 1.75,
  opacity: 1,
  textSize: 14,
  textAlign: "left",
  cornerRadius: 12,
  locked: false,
};

export function defaultSizeForType(type: CanvasObjectType): { width: number; height: number } {
  switch (type) {
    case "sticky":
      return { width: 220, height: 160 };
    case "shape":
      return { width: 220, height: 128 };
    case "frame":
      return { width: 420, height: 280 };
    case "line":
    case "arrow":
    case "connector":
      return { width: 160, height: 8 };
    case "image":
      return { width: 280, height: 200 };
    case "link":
      return { width: 300, height: 132 };
    case "comment":
      return { width: 280, height: 120 };
    case "question":
      return { width: 300, height: 136 };
    case "citation":
      return { width: 300, height: 148 };
    case "source":
    case "quote":
      return { width: 300, height: 168 };
    case "task":
      return { width: 288, height: 124 };
    default:
      return { width: 280, height: 128 };
  }
}

export function defaultSizeForShape(shapeType?: CanvasShapeType): { width: number; height: number } {
  switch (shapeType) {
    case "circle":
      return { width: 136, height: 136 };
    case "ellipse":
      return { width: 200, height: 128 };
    case "rectangle":
      return { width: 208, height: 112 };
    case "roundedRectangle":
    default:
      return { width: 228, height: 132 };
  }
}

export function defaultFillForType(type: CanvasObjectType): string {
  switch (type) {
    case "sticky":
      return "#f7fbe8";
    case "frame":
      return "rgba(255, 255, 255, 0.72)";
    case "shape":
      return "#ffffff";
    case "source":
      return "#ffffff";
    case "quote":
      return "#faf8f3";
    case "question":
      return "#f3f7ff";
    case "task":
      return "#f5fff8";
    case "link":
      return "#f8f8ff";
    case "comment":
      return "#fff9f0";
    case "citation":
      return "#f7f4ff";
    case "line":
    case "arrow":
    case "connector":
      return "transparent";
    case "image":
      return "#f4f5f7";
    default:
      return "transparent";
  }
}

export function toolToObjectType(tool: CanvasToolId): CanvasObjectType {
  switch (tool) {
    case "rectangle":
    case "roundedRectangle":
    case "circle":
      return "shape";
    case "text":
      return "text";
    case "sticky":
      return "sticky";
    case "line":
      return "line";
    case "arrow":
      return "arrow";
    case "connector":
      return "connector";
    case "frame":
      return "frame";
    case "image":
      return "image";
    case "source":
      return "source";
    case "quote":
      return "quote";
    case "question":
      return "question";
    case "task":
      return "task";
    case "link":
      return "link";
    case "comment":
      return "comment";
    case "citation":
      return "citation";
    default:
      return "text";
  }
}

export function shapeTypeForTool(tool: CanvasToolId): CanvasShapeType | undefined {
  if (tool === "roundedRectangle") return "roundedRectangle";
  if (tool === "circle") return "circle";
  if (tool === "rectangle") return "rectangle";
  return undefined;
}

export function defaultTitleBody(
  type: CanvasObjectType,
  record?: WorkbenchLinkableRecord,
  origin?: CanvasSourceOrigin,
): { title: string; body: string } {
  switch (type) {
    case "sticky":
      return { title: "Sticky", body: "Working thought…" };
    case "quote":
      return { title: "Quote", body: "Key quotation or excerpt" };
    case "source":
      return {
        title: record?.title ?? "Archive source",
        body: record?.source_type ? `Source type: ${record.source_type}` : "Linked research source",
      };
    case "question":
      return { title: "Question", body: "What do we need to find out?" };
    case "task":
      return { title: "Task", body: "Next research action" };
    case "link":
      return { title: "Untitled link", body: "" };
    case "comment":
      return { title: "Comment", body: "Annotation or reviewer note" };
    case "citation":
      return { title: "Citation", body: "Citation marker for document use" };
    case "frame":
      return { title: "Section", body: "" };
    case "shape":
      return { title: "Shape", body: "Label or notes inside shape" };
    case "image":
      return { title: "Image", body: "" };
    case "line":
    case "arrow":
    case "connector":
      return { title: "", body: "" };
    default:
      return { title: "Text", body: "Text block" };
  }
}

export function createCanvasObject(input: {
  type: CanvasObjectType;
  x: number;
  y: number;
  zIndex?: number;
  shapeType?: CanvasShapeType;
  record?: WorkbenchLinkableRecord;
  sourceOrigin?: CanvasSourceOrigin;
  bookmarkId?: string | null;
  readingListId?: string | null;
  patch?: Partial<CanvasObject>;
}): CanvasObject {
  const shapeType = input.shapeType ?? (input.type === "shape" ? "roundedRectangle" : undefined);
  const size =
    input.type === "shape"
      ? defaultSizeForShape(shapeType)
      : defaultSizeForType(input.type);
  const { title, body } = defaultTitleBody(input.type, input.record, input.sourceOrigin);
  const ts = NOW();
  const cornerRadius =
    shapeType === "circle" || shapeType === "ellipse"
      ? 999
      : shapeType === "rectangle"
        ? 4
        : 16;

  const base: CanvasObject = {
    ...DEFAULTS,
    id: createId("canvas"),
    type: input.type,
    shapeType,
    x: input.x,
    y: input.y,
    width: size.width,
    height: size.height,
    zIndex: input.zIndex ?? 1,
    title,
    body,
    fill: defaultFillForType(input.type),
    cornerRadius,
    textSize: input.type === "frame" ? 16 : 14,
    linkedRecordId: input.record?.record_id ?? null,
    sourceOrigin: input.sourceOrigin ?? (input.record ? "archive" : undefined),
    bookmarkId: input.bookmarkId ?? null,
    readingListId: input.readingListId ?? null,
    imageFit: "cover",
    lineStyle: "solid",
    arrowStart: "none",
    arrowEnd: input.type === "arrow" || input.type === "connector" ? "arrow" : "none",
    startX: input.x,
    startY: input.y + size.height / 2,
    endX: input.x + size.width,
    endY: input.y + size.height / 2,
    createdAt: ts,
    updatedAt: ts,
  };

  if (input.type === "line" || input.type === "arrow" || input.type === "connector") {
    base.height = 4;
    base.stroke = "rgba(47, 45, 56, 0.42)";
    base.strokeWidth = 2.25;
    base.fill = "transparent";
  }

  if (input.type === "shape") {
    base.stroke = input.patch?.stroke ?? "rgba(47, 45, 56, 0.24)";
    base.fill = input.patch?.fill ?? defaultFillForType("shape");
  }

  return { ...base, ...input.patch, updatedAt: NOW() };
}

export function migrateLegacyBlock(block: LegacyWorkbenchCanvasBlock, index: number): CanvasObject {
  const typeMap: Record<LegacyWorkbenchCanvasBlock["type"], CanvasObjectType> = {
    text: "text",
    sticky: "sticky",
    quote: "quote",
    archiveRecord: "source",
    imagePlaceholder: "image",
  };
  const type = typeMap[block.type] ?? "text";
  const obj = createCanvasObject({
    type,
    x: block.x,
    y: block.y,
    zIndex: index + 1,
    record: undefined,
    patch: {
      id: block.id,
      width: block.width,
      height: block.height,
      title: block.type === "quote" ? "Quote" : block.type === "archiveRecord" ? "Source" : "",
      body: block.content,
      linkedRecordId: block.linkedRecordId ?? null,
      sourceOrigin: block.linkedRecordId ? "archive" : undefined,
      imageUrl: block.type === "imagePlaceholder" && block.content.startsWith("data:")
        ? block.content
        : undefined,
    },
  });
  return obj;
}

export function parseCanvasObject(raw: Record<string, unknown>, index: number): CanvasObject {
  const type = stringValue(raw.type, "text") as CanvasObjectType;
  const size = defaultSizeForType(type);
  const ts = NOW();
  return {
    ...DEFAULTS,
    id: stringValue(raw.id, `canvas-${index}`),
    type,
    shapeType:
      raw.shapeType === "rectangle" ||
      raw.shapeType === "roundedRectangle" ||
      raw.shapeType === "circle" ||
      raw.shapeType === "ellipse"
        ? (raw.shapeType as CanvasShapeType)
        : undefined,
    x: numberValue(raw.x, 80),
    y: numberValue(raw.y, 80),
    width: numberValue(raw.width, size.width),
    height: numberValue(raw.height, size.height),
    rotation: numberValue(raw.rotation, 0),
    zIndex: numberValue(raw.zIndex, index + 1),
    title: stringValue(raw.title, ""),
    body: stringValue(raw.body, stringValue(raw.content, "")),
    fill: stringValue(raw.fill, defaultFillForType(type)),
    stroke: stringValue(raw.stroke, DEFAULTS.stroke),
    strokeWidth: numberValue(raw.strokeWidth, DEFAULTS.strokeWidth),
    opacity: numberValue(raw.opacity, 1),
    textSize: numberValue(raw.textSize, 14),
    textAlign: (stringValue(raw.textAlign, "left") as CanvasObject["textAlign"]) || "left",
    cornerRadius: numberValue(raw.cornerRadius, 12),
    locked: boolValue(raw.locked, false),
    groupId: typeof raw.groupId === "string" ? raw.groupId : null,
    parentFrameId: typeof raw.parentFrameId === "string" ? raw.parentFrameId : null,
    linkedRecordId: typeof raw.linkedRecordId === "string" ? raw.linkedRecordId : null,
    bookmarkId: typeof raw.bookmarkId === "string" ? raw.bookmarkId : null,
    readingListId: typeof raw.readingListId === "string" ? raw.readingListId : null,
    citationId: typeof raw.citationId === "string" ? raw.citationId : null,
    sourceOrigin: stringValue(raw.sourceOrigin, "") as CanvasSourceOrigin | undefined,
    creator: typeof raw.creator === "string" ? raw.creator : undefined,
    date: typeof raw.date === "string" ? raw.date : undefined,
    sourceLabel: typeof raw.sourceLabel === "string" ? raw.sourceLabel : undefined,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    imageAlt: typeof raw.imageAlt === "string" ? raw.imageAlt : undefined,
    imageCaption: typeof raw.imageCaption === "string" ? raw.imageCaption : undefined,
    imageFit: raw.imageFit === "contain" ? "contain" : "cover",
    sourceId: typeof raw.sourceId === "string" ? raw.sourceId : null,
    targetId: typeof raw.targetId === "string" ? raw.targetId : null,
    startX: numberValue(raw.startX, numberValue(raw.x, 0)),
    startY: numberValue(raw.startY, numberValue(raw.y, 0)),
    endX: numberValue(raw.endX, numberValue(raw.x, 0) + size.width),
    endY: numberValue(raw.endY, numberValue(raw.y, 0)),
    label: typeof raw.label === "string" ? raw.label : undefined,
    lineStyle:
      raw.lineStyle === "dashed" || raw.lineStyle === "dotted" ? raw.lineStyle : "solid",
    arrowStart: raw.arrowStart === "arrow" ? "arrow" : "none",
    arrowEnd: raw.arrowEnd === "none" ? "none" : "arrow",
    createdAt: stringValue(raw.createdAt, ts),
    updatedAt: stringValue(raw.updatedAt, ts),
  };
}

/** @deprecated Use getCanvasDataFromJson from workbench-canvas-state.ts */
export function getCanvasDataFromJsonLegacy(json: Record<string, unknown> | null): WorkbenchCanvasData {
  if (!isRecord(json?.workbenchCanvas)) return EMPTY_CANVAS_DATA;
  const raw = json.workbenchCanvas as LegacyWorkbenchCanvasData;

  if (Array.isArray(raw.objects) && raw.objects.length) {
    return {
      version: CANVAS_DATA_VERSION,
      objects: raw.objects
        .filter(isRecord)
        .map((item, index) => parseCanvasObject(item, index))
        .sort((a, b) => a.zIndex - b.zIndex),
    };
  }

  const blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (!blocks.length) return EMPTY_CANVAS_DATA;

  return {
    version: CANVAS_DATA_VERSION,
    objects: blocks
      .filter(isRecord)
      .map((block, index) =>
        migrateLegacyBlock(
          {
            id: stringValue(block.id, `canvas-${index}`),
            type: (stringValue(block.type, "text") as LegacyWorkbenchCanvasBlock["type"]) || "text",
            x: numberValue(block.x, 80),
            y: numberValue(block.y, 80),
            width: numberValue(block.width, 260),
            height: numberValue(block.height, 132),
            content: stringValue(block.content, ""),
            linkedRecordId: typeof block.linkedRecordId === "string" ? block.linkedRecordId : null,
          },
          index,
        ),
      ),
  };
}

export function serializeCanvasData(data: WorkbenchCanvasData): WorkbenchCanvasData {
  return {
    version: CANVAS_DATA_VERSION,
    objects: data.objects.map((obj) => ({ ...obj, selected: undefined } as CanvasObject)),
  };
}

export function nextZIndex(objects: CanvasObject[]): number {
  return objects.reduce((max, obj) => Math.max(max, obj.zIndex), 0) + 1;
}

export function updateConnectorEndpoints(
  objects: CanvasObject[],
  connector: CanvasObject,
): CanvasObject {
  if (!connector.sourceId && !connector.targetId) return connector;
  const source = connector.sourceId
    ? objects.find((o) => o.id === connector.sourceId)
    : undefined;
  const target = connector.targetId
    ? objects.find((o) => o.id === connector.targetId)
    : undefined;
  if (!source && !target) return connector;

  const fallbackStart = {
    x: connector.startX ?? connector.x,
    y: connector.startY ?? connector.y,
  };
  const fallbackEnd = {
    x: connector.endX ?? connector.x + connector.width,
    y: connector.endY ?? connector.y + connector.height,
  };

  let sx = fallbackStart.x;
  let sy = fallbackStart.y;
  let ex = fallbackEnd.x;
  let ey = fallbackEnd.y;

  if (source && target) {
    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };
    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2,
    };
    const startAnchor = anchorPointOnRect(objectRect(source), targetCenter.x, targetCenter.y);
    const endAnchor = anchorPointOnRect(objectRect(target), sourceCenter.x, sourceCenter.y);
    sx = startAnchor.x;
    sy = startAnchor.y;
    ex = endAnchor.x;
    ey = endAnchor.y;
  } else if (source) {
    const anchor = anchorPointOnRect(objectRect(source), ex, ey);
    sx = anchor.x;
    sy = anchor.y;
  } else if (target) {
    const anchor = anchorPointOnRect(objectRect(target), sx, sy);
    ex = anchor.x;
    ey = anchor.y;
  }

  const minX = Math.min(sx, ex);
  const minY = Math.min(sy, ey);
  return {
    ...connector,
    x: minX,
    y: minY,
    width: Math.max(24, Math.abs(ex - sx)),
    height: Math.max(24, Math.abs(ey - sy)),
    startX: sx,
    startY: sy,
    endX: ex,
    endY: ey,
    updatedAt: NOW(),
  };
}

export function refreshLinkedConnectors(objects: CanvasObject[]): CanvasObject[] {
  return objects.map((obj) =>
    obj.type === "connector" ? updateConnectorEndpoints(objects, obj) : obj,
  );
}
