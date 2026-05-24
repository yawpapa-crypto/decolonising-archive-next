/**
 * Canvas template layout grid and helpers (spacing, frames, insertion, validation).
 */

import { createCanvasObject } from "./workbench-canvas-data";
import { anchorPointOnRect, objectRect } from "./workbench-canvas-geometry";
import type { CanvasObject, CanvasObjectType } from "./workbench-canvas-types";

export const TPL_MARGIN = 80;
export const TPL_FRAME_GAP = 40;
export const TPL_CARD_GAP = 20;
export const TPL_HEADER_GAP = 44;
export const TPL_MIN_CARD_W = 240;
export const TPL_STD_CARD_W = 280;
export const TPL_LARGE_CARD_W = 360;
export const TPL_FRAME_PAD = 28;
export const TPL_FRAME_TITLE_H = 36;
export const TPL_INSERT_PAD = 120;

const CONNECTOR_DEFAULT = "rgba(47, 45, 56, 0.42)";

export type TemplateCardRole =
  | "header"
  | "text"
  | "quote"
  | "task"
  | "image"
  | "sticky"
  | "source"
  | "default";

export function templateCardSize(
  type: CanvasObjectType,
  role: TemplateCardRole = "default",
): { width: number; height: number } {
  if (role === "header") return { width: 520, height: 130 };
  if (role === "quote") return { width: 360, height: 190 };
  if (role === "task") return { width: 300, height: 140 };
  if (role === "image") return { width: 380, height: 300 };
  if (role === "sticky") return { width: 260, height: 150 };
  if (role === "text" || type === "text") return { width: TPL_STD_CARD_W, height: 160 };
  if (type === "source" || type === "quote") return { width: TPL_STD_CARD_W, height: 168 };
  if (type === "question") return { width: TPL_STD_CARD_W, height: 150 };
  if (type === "task") return { width: 300, height: 140 };
  if (type === "image") return { width: 380, height: 300 };
  if (type === "citation") return { width: TPL_STD_CARD_W, height: 148 };
  if (type === "comment") return { width: TPL_STD_CARD_W, height: 130 };
  return { width: TPL_STD_CARD_W, height: 160 };
}

export function getCanvasObjectsBounds(
  objects: CanvasObject[],
  padding = 0,
): { x: number; y: number; width: number; height: number; right: number; bottom: number } | null {
  const solids = objects.filter((o) => o.type !== "connector");
  if (!solids.length) return null;
  const minX = Math.min(...solids.map((o) => o.x));
  const minY = Math.min(...solids.map((o) => o.y));
  const maxX = Math.max(...solids.map((o) => o.x + o.width));
  const maxY = Math.max(...solids.map((o) => o.y + o.height));
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    right: maxX + padding,
    bottom: maxY + padding,
  };
}

export function translateTemplateObjects(
  objects: CanvasObject[],
  dx: number,
  dy: number,
): CanvasObject[] {
  if (dx === 0 && dy === 0) return objects;
  return objects.map((obj) => ({
    ...obj,
    x: obj.x + dx,
    y: obj.y + dy,
    startX: obj.startX != null ? obj.startX + dx : obj.startX,
    startY: obj.startY != null ? obj.startY + dy : obj.startY,
    endX: obj.endX != null ? obj.endX + dx : obj.endX,
    endY: obj.endY != null ? obj.endY + dy : obj.endY,
  }));
}

export function resolveTemplateInsertionOffset(
  existing: CanvasObject[],
  templateObjects: CanvasObject[],
): { dx: number; dy: number } {
  const existingBounds = getCanvasObjectsBounds(existing, TPL_MARGIN);
  const templateBounds = getCanvasObjectsBounds(templateObjects, 0);
  if (!templateBounds) return { dx: 0, dy: 0 };
  if (!existingBounds) {
    return {
      dx: TPL_MARGIN - templateBounds.x,
      dy: TPL_MARGIN - templateBounds.y,
    };
  }
  return {
    dx: TPL_MARGIN - templateBounds.x,
    dy: existingBounds.bottom + TPL_INSERT_PAD - templateBounds.y,
  };
}

export function refreshTemplateConnectors(objects: CanvasObject[]): CanvasObject[] {
  const byId = new Map(objects.map((o) => [o.id, o]));
  return objects.map((obj) => {
    if (obj.type !== "connector" || !obj.sourceId || !obj.targetId) return obj;
    const source = byId.get(obj.sourceId);
    const target = byId.get(obj.targetId);
    if (!source || !target) return obj;
    const sRect = objectRect(source);
    const tRect = objectRect(target);
    const tCenter = { x: tRect.x + tRect.width / 2, y: tRect.y + tRect.height / 2 };
    const sCenter = { x: sRect.x + sRect.width / 2, y: sRect.y + sRect.height / 2 };
    const start = anchorPointOnRect(sRect, tCenter.x, tCenter.y);
    const end = anchorPointOnRect(tRect, sCenter.x, sCenter.y);
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    return {
      ...obj,
      x: minX,
      y: minY,
      width: Math.max(8, Math.abs(end.x - start.x)),
      height: Math.max(8, Math.abs(end.y - start.y)),
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
    };
  });
}

function rectsOverlap(a: CanvasObject, b: CanvasObject, gap = 8): boolean {
  if (a.type === "connector" || b.type === "connector") return false;
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

export function validateCanvasTemplate(
  objects: CanvasObject[],
  templateId?: string,
): void {
  if (process.env.NODE_ENV === "production") return;
  const label = templateId ? `[canvas-template:${templateId}]` : "[canvas-template]";
  const solids = objects.filter((o) => o.type !== "connector");
  for (const obj of objects) {
    if (!obj.width || !obj.height) {
      console.warn(`${label} object ${obj.id} missing width/height`);
    }
    if (obj.type === "connector") {
      if (!obj.sourceId || !obj.targetId) {
        console.warn(`${label} connector ${obj.id} missing source/target`);
      }
    }
    if (obj.type !== "frame" && obj.type !== "connector") {
      if (obj.width < TPL_MIN_CARD_W && (obj.type === "text" || obj.type === "quote")) {
        console.warn(`${label} text card ${obj.id} narrower than ${TPL_MIN_CARD_W}px`);
      }
    }
  }
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      if (rectsOverlap(solids[i], solids[j])) {
        console.warn(
          `${label} overlap: ${solids[i].title || solids[i].type} ↔ ${solids[j].title || solids[j].type}`,
        );
      }
    }
  }
  const frames = solids.filter((o) => o.type === "frame");
  for (const frame of frames) {
    const children = solids.filter(
      (o) =>
        o.id !== frame.id &&
        o.x >= frame.x - 4 &&
        o.y >= frame.y - 4 &&
        o.x + o.width <= frame.x + frame.width + 4 &&
        o.y + o.height <= frame.y + frame.height + 4,
    );
    for (const child of children) {
      const padL = child.x - frame.x;
      const padT = child.y - frame.y;
      const padR = frame.x + frame.width - (child.x + child.width);
      const padB = frame.y + frame.height - (child.y + child.height);
      if (padL < TPL_FRAME_PAD - 8 || padT < TPL_FRAME_PAD + TPL_FRAME_TITLE_H - 4 || padR < TPL_FRAME_PAD - 8 || padB < TPL_FRAME_PAD - 8) {
        console.warn(`${label} "${child.title}" may exceed frame "${frame.title}" bounds`);
      }
    }
  }
}

export function tplFrame(
  title: string,
  x: number,
  y: number,
  w: number,
  h: number,
  style?: { fill?: string; stroke?: string },
) {
  return createCanvasObject({
    type: "frame",
    x,
    y,
    patch: {
      title,
      width: w,
      height: h,
      zIndex: 1,
      fill: style?.fill ?? "rgba(255, 255, 255, 0.58)",
      stroke: style?.stroke ?? "rgba(47, 45, 56, 0.16)",
    },
  });
}

export function tplCard(
  type: CanvasObjectType,
  title: string,
  body: string,
  x: number,
  y: number,
  z: number,
  patch?: Partial<CanvasObject> & { role?: TemplateCardRole },
) {
  const { role, ...rest } = patch ?? {};
  const size = templateCardSize(type, role ?? "default");
  return createCanvasObject({
    type,
    x,
    y,
    patch: {
      title,
      body,
      zIndex: z,
      width: rest.width ?? size.width,
      height: rest.height ?? size.height,
      ...rest,
    },
  });
}

/** Single card centred inside a section frame; returns [frame, card]. */
export function tplSection(
  frameTitle: string,
  frameX: number,
  frameY: number,
  frameW: number,
  card: {
    type: CanvasObjectType;
    title: string;
    body: string;
    patch?: Partial<CanvasObject> & { role?: TemplateCardRole };
  },
  frameStyle?: { fill?: string; stroke?: string },
  z = 2,
): CanvasObject[] {
  const size = templateCardSize(card.type, card.patch?.role ?? "default");
  const cardW = card.patch?.width ?? size.width;
  const cardH = card.patch?.height ?? size.height;
  const frameH =
    TPL_FRAME_PAD * 2 + TPL_FRAME_TITLE_H + TPL_HEADER_GAP + cardH;
  const innerW = frameW - TPL_FRAME_PAD * 2;
  const cardX = frameX + TPL_FRAME_PAD + Math.max(0, (innerW - cardW) / 2);
  const cardY = frameY + TPL_FRAME_PAD + TPL_FRAME_TITLE_H + TPL_HEADER_GAP;
  const f = tplFrame(frameTitle, frameX, frameY, frameW, frameH, frameStyle);
  const c = tplCard(card.type, card.title, card.body, cardX, cardY, z + 1, {
    ...card.patch,
    width: cardW,
    height: cardH,
  });
  return [f, c];
}

export function tplHeader(
  title: string,
  subtitle: string,
  x: number,
  y: number,
  patch?: Partial<CanvasObject>,
) {
  return tplCard("text", title, subtitle, x, y, 2, {
    role: "header",
    textSize: 24,
    width: 520,
    height: 130,
    ...patch,
  });
}

export function tplConnector(
  sourceId: string,
  targetId: string,
  objects: CanvasObject[],
  label?: string,
  stroke = CONNECTOR_DEFAULT,
) {
  const source = objects.find((o) => o.id === sourceId);
  const target = objects.find((o) => o.id === targetId);
  const c = createCanvasObject({
    type: "connector",
    x: 0,
    y: 0,
    patch: {
      sourceId,
      targetId,
      label: label ?? "",
      zIndex: 30,
      arrowEnd: "arrow",
      stroke,
      strokeWidth: 2.25,
    },
  });
  if (source && target) {
    const sRect = objectRect(source);
    const tRect = objectRect(target);
    const tCenter = { x: tRect.x + tRect.width / 2, y: tRect.y + tRect.height / 2 };
    const sCenter = { x: sRect.x + sRect.width / 2, y: sRect.y + sRect.height / 2 };
    const start = anchorPointOnRect(sRect, tCenter.x, tCenter.y);
    const end = anchorPointOnRect(tRect, sCenter.x, sCenter.y);
    c.startX = start.x;
    c.startY = start.y;
    c.endX = end.x;
    c.endY = end.y;
    c.x = Math.min(start.x, end.x);
    c.y = Math.min(start.y, end.y);
    c.width = Math.max(8, Math.abs(end.x - start.x));
    c.height = Math.max(8, Math.abs(end.y - start.y));
  }
  return c;
}

/** Horizontal row of cards with edge connectors; optional final card. */
export function tplHorizontalFlow(
  items: Array<{
    type: CanvasObjectType;
    title: string;
    body: string;
    patch?: Partial<CanvasObject> & { role?: TemplateCardRole };
    label?: string;
  }>,
  startX: number,
  startY: number,
  gap = TPL_FRAME_GAP,
  stroke = CONNECTOR_DEFAULT,
): CanvasObject[] {
  const objects: CanvasObject[] = [];
  let x = startX;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const size = templateCardSize(item.type, item.patch?.role ?? "default");
    const w = item.patch?.width ?? size.width;
    const h = item.patch?.height ?? size.height;
    const card = tplCard(item.type, item.title, item.body, x, startY, 3 + i, {
      ...item.patch,
      width: w,
      height: h,
    });
    objects.push(card);
    if (i > 0) {
      const prev = objects[objects.length - 2];
      objects.push(tplConnector(prev.id, card.id, [...objects], item.label ?? "", stroke));
    }
    x += w + gap;
  }
  return refreshTemplateConnectors(objects);
}

export function finalizeTemplate(
  objects: CanvasObject[],
  templateId?: string,
): CanvasObject[] {
  const refreshed = refreshTemplateConnectors(objects);
  validateCanvasTemplate(refreshed, templateId);
  return refreshed;
}
