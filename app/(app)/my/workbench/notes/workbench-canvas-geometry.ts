import type { CanvasObject } from "./workbench-canvas-types";

export type CanvasRect = { x: number; y: number; width: number; height: number };

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const MIN_OBJECT_WIDTH = 56;
const MIN_OBJECT_HEIGHT = 44;

export function isLineLikeObject(obj: CanvasObject) {
  return obj.type === "line" || obj.type === "arrow" || obj.type === "connector";
}

export function objectRect(obj: CanvasObject): CanvasRect {
  return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
}

export function objectCenter(obj: CanvasObject) {
  return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
}

/** Nearest point on rectangle perimeter toward another point (for connectors). */
export function anchorPointOnRect(rect: CanvasRect, towardX: number, towardY: number) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { x: cx, y: cy };
  }
  const hw = Math.max(rect.width / 2, 1);
  const hh = Math.max(rect.height / 2, 1);
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function lineEndpoints(obj: CanvasObject) {
  const x1 = obj.startX ?? obj.x;
  const y1 = obj.startY ?? obj.y;
  const x2 = obj.endX ?? obj.x + obj.width;
  const y2 = obj.endY ?? obj.y + obj.height;
  return { x1, y1, x2, y2 };
}

export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    return Math.hypot(px - x1, py - y1);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function hitTestLine(obj: CanvasObject, worldX: number, worldY: number, threshold = 10) {
  const { x1, y1, x2, y2 } = lineEndpoints(obj);
  return distanceToSegment(worldX, worldY, x1, y1, x2, y2) <= threshold;
}

export function connectorCurvePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const bend = Math.min(120, Math.max(40, Math.abs(dx) * 0.35));
  const cx1 = x1 + bend;
  const cy1 = y1;
  const cx2 = x2 - bend;
  const cy2 = y2;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

export function shouldKeepAspectRatio(obj: CanvasObject) {
  return (
    obj.type === "shape" &&
    (obj.shapeType === "circle" || obj.shapeType === "ellipse")
  );
}

export function applyResizeHandle(
  handle: ResizeHandle,
  start: CanvasObject,
  worldX: number,
  worldY: number,
): Pick<CanvasObject, "x" | "y" | "width" | "height"> {
  let x = start.x;
  let y = start.y;
  let width = start.width;
  let height = start.height;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const keepAspect = shouldKeepAspectRatio(start);

  const setSize = (w: number, h: number, nx: number, ny: number) => {
    width = Math.max(MIN_OBJECT_WIDTH, w);
    height = Math.max(MIN_OBJECT_HEIGHT, h);
    x = nx;
    y = ny;
    if (keepAspect) {
      const size = Math.max(width, height);
      if (handle === "nw" || handle === "ne" || handle === "sw" || handle === "se") {
        width = size;
        height = size;
        if (handle === "nw" || handle === "sw") x = right - width;
        if (handle === "nw" || handle === "ne") y = bottom - height;
      } else if (handle === "n" || handle === "s") {
        width = size;
        height = size;
        x = start.x + (start.width - width) / 2;
        if (handle === "n") y = bottom - height;
      } else if (handle === "e" || handle === "w") {
        width = size;
        height = size;
        y = start.y + (start.height - height) / 2;
        if (handle === "w") x = right - width;
      }
    }
  };

  switch (handle) {
    case "se":
      setSize(worldX - start.x, worldY - start.y, start.x, start.y);
      break;
    case "e":
      setSize(worldX - start.x, height, start.x, start.y);
      break;
    case "s":
      setSize(width, worldY - start.y, start.x, start.y);
      break;
    case "ne":
      setSize(worldX - start.x, bottom - worldY, start.x, worldY);
      break;
    case "n":
      setSize(width, bottom - worldY, start.x, worldY);
      break;
    case "sw":
      setSize(right - worldX, worldY - start.y, worldX, start.y);
      break;
    case "w":
      setSize(right - worldX, height, worldX, start.y);
      break;
    case "nw":
      setSize(right - worldX, bottom - worldY, worldX, worldY);
      break;
    default:
      break;
  }

  return { x, y, width, height };
}

export const RESIZE_HANDLES: Array<{ id: ResizeHandle; className: string; cursor: string }> = [
  { id: "nw", className: "is-nw", cursor: "nwse-resize" },
  { id: "n", className: "is-n", cursor: "ns-resize" },
  { id: "ne", className: "is-ne", cursor: "nesw-resize" },
  { id: "e", className: "is-e", cursor: "ew-resize" },
  { id: "se", className: "is-se", cursor: "nwse-resize" },
  { id: "s", className: "is-s", cursor: "ns-resize" },
  { id: "sw", className: "is-sw", cursor: "nesw-resize" },
  { id: "w", className: "is-w", cursor: "ew-resize" },
];
