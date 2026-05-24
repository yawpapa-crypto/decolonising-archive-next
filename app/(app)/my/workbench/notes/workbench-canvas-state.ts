import type { CanvasPanelState, CanvasPanelTab } from "./workbench-canvas-panel-types";
import {
  CANVAS_DATA_VERSION,
  type CanvasObject,
  type LegacyWorkbenchCanvasData,
  type WorkbenchCanvasData,
} from "./workbench-canvas-types";
import { migrateLegacyBlock, parseCanvasObject } from "./workbench-canvas-data";

export const CANVAS_STATE_VERSION = 3;

export type CanvasViewport = {
  zoom: number;
  panX: number;
  panY: number;
};

export type CanvasSettings = {
  theme: string;
  controlsVisible: boolean;
  rightPanelState: CanvasPanelState;
  rightPanelTab: CanvasPanelTab;
};

export type WorkbenchCanvasRecord = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  objects: CanvasObject[];
  viewport: CanvasViewport;
  settings: CanvasSettings;
};

export type WorkbenchCanvasState = {
  version: typeof CANVAS_STATE_VERSION;
  activeCanvasId: string;
  canvases: WorkbenchCanvasRecord[];
};

export const DEFAULT_CANVAS_VIEWPORT: CanvasViewport = {
  zoom: 100,
  panX: 0,
  panY: 0,
};

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  theme: "archive",
  controlsVisible: true,
  rightPanelState: "expanded",
  rightPanelTab: "templates",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeViewport(raw: unknown): CanvasViewport {
  if (!isRecord(raw)) return { ...DEFAULT_CANVAS_VIEWPORT };
  let zoom = numberValue(raw.zoom, DEFAULT_CANVAS_VIEWPORT.zoom);
  if (zoom > 0 && zoom <= 3) zoom = Math.round(zoom * 100);
  if (zoom < 10) zoom = DEFAULT_CANVAS_VIEWPORT.zoom;
  return {
    zoom: Math.min(250, Math.max(25, zoom)),
    panX: numberValue(raw.panX, DEFAULT_CANVAS_VIEWPORT.panX),
    panY: numberValue(raw.panY, DEFAULT_CANVAS_VIEWPORT.panY),
  };
}

function normalizeSettings(raw: unknown): CanvasSettings {
  if (!isRecord(raw)) return { ...DEFAULT_CANVAS_SETTINGS };
  const tab = stringValue(raw.rightPanelTab, DEFAULT_CANVAS_SETTINGS.rightPanelTab);
  const panel = stringValue(raw.rightPanelState, DEFAULT_CANVAS_SETTINGS.rightPanelState);
  return {
    theme: stringValue(raw.theme, DEFAULT_CANVAS_SETTINGS.theme),
    controlsVisible: boolValue(raw.controlsVisible, DEFAULT_CANVAS_SETTINGS.controlsVisible),
    rightPanelState:
      panel === "collapsed" || panel === "hidden" ? panel : "expanded",
    rightPanelTab:
      tab === "inspect" || tab === "theme" || tab === "smart" ? tab : "templates",
  };
}

function parseObjectsFromLegacy(raw: LegacyWorkbenchCanvasData): CanvasObject[] {
  if (Array.isArray(raw.objects) && raw.objects.length) {
    return raw.objects
      .filter(isRecord)
      .map((item, index) => parseCanvasObject(item, index))
      .sort((a, b) => a.zIndex - b.zIndex);
  }
  const blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (!blocks.length) return [];
  return blocks
    .filter(isRecord)
    .map((block, index) =>
      migrateLegacyBlock(
        {
          id: stringValue(block.id, `canvas-${index}`),
          type: (stringValue(block.type, "text") as "text") || "text",
          x: numberValue(block.x, 80),
          y: numberValue(block.y, 80),
          width: numberValue(block.width, 260),
          height: numberValue(block.height, 132),
          content: stringValue(block.content, ""),
          linkedRecordId: typeof block.linkedRecordId === "string" ? block.linkedRecordId : null,
        },
        index,
      ),
    );
}

function createEmptyCanvasRecord(name: string, objects: CanvasObject[] = []): WorkbenchCanvasRecord {
  const ts = new Date().toISOString();
  return {
    id: createId("wcanvas"),
    name,
    createdAt: ts,
    updatedAt: ts,
    objects,
    viewport: { ...DEFAULT_CANVAS_VIEWPORT },
    settings: { ...DEFAULT_CANVAS_SETTINGS },
  };
}

function normalizeCanvasRecord(raw: unknown, fallbackName: string): WorkbenchCanvasRecord | null {
  if (!isRecord(raw)) return null;
  const ts = new Date().toISOString();
  const objects = Array.isArray(raw.objects)
    ? raw.objects.filter(isRecord).map((item, index) => parseCanvasObject(item, index))
    : [];
  return {
    id: stringValue(raw.id, createId("wcanvas")),
    name: stringValue(raw.name, fallbackName).trim() || fallbackName,
    description: typeof raw.description === "string" ? raw.description : undefined,
    createdAt: stringValue(raw.createdAt, ts),
    updatedAt: stringValue(raw.updatedAt, ts),
    objects: objects.sort((a, b) => a.zIndex - b.zIndex),
    viewport: normalizeViewport(raw.viewport),
    settings: normalizeSettings(raw.settings),
  };
}

/** Normalise raw contentJson.workbenchCanvas into multi-canvas state (v3). */
export function normalizeWorkbenchCanvasState(
  json: Record<string, unknown> | null | undefined,
): WorkbenchCanvasState {
  const rawRoot = isRecord(json?.workbenchCanvas) ? json.workbenchCanvas : null;

  if (rawRoot && Array.isArray(rawRoot.canvases) && rawRoot.canvases.length) {
    const canvases = rawRoot.canvases
      .map((item, index) => normalizeCanvasRecord(item, `Canvas ${index + 1}`))
      .filter((c): c is WorkbenchCanvasRecord => Boolean(c));
    if (canvases.length) {
      const activeId = stringValue(rawRoot.activeCanvasId, canvases[0].id);
      const activeExists = canvases.some((c) => c.id === activeId);
      return {
        version: CANVAS_STATE_VERSION,
        activeCanvasId: activeExists ? activeId : canvases[0].id,
        canvases,
      };
    }
  }

  const legacy = (rawRoot ?? {}) as LegacyWorkbenchCanvasData;
  const objects = parseObjectsFromLegacy(legacy);
  const first = createEmptyCanvasRecord("Canvas 1", objects);
  return {
    version: CANVAS_STATE_VERSION,
    activeCanvasId: first.id,
    canvases: [first],
  };
}

export function serializeWorkbenchCanvasState(state: WorkbenchCanvasState): WorkbenchCanvasState {
  return {
    version: CANVAS_STATE_VERSION,
    activeCanvasId: state.activeCanvasId,
    canvases: state.canvases.map((canvas) => ({
      ...canvas,
      name: canvas.name.trim() || "Untitled canvas",
      objects: canvas.objects.map((obj) => ({ ...obj })),
      viewport: { ...canvas.viewport },
      settings: { ...canvas.settings },
    })),
  };
}

export function getActiveCanvasRecord(state: WorkbenchCanvasState): WorkbenchCanvasRecord {
  return (
    state.canvases.find((c) => c.id === state.activeCanvasId) ?? state.canvases[0]!
  );
}

export function activeCanvasData(state: WorkbenchCanvasState): WorkbenchCanvasData {
  const active = getActiveCanvasRecord(state);
  return {
    version: CANVAS_DATA_VERSION,
    objects: active.objects,
  };
}

export function nextCanvasName(state: WorkbenchCanvasState): string {
  let n = state.canvases.length + 1;
  let candidate = `Canvas ${n}`;
  const names = new Set(state.canvases.map((c) => c.name.toLowerCase()));
  while (names.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `Canvas ${n}`;
  }
  return candidate;
}

export function setActiveCanvas(state: WorkbenchCanvasState, canvasId: string): WorkbenchCanvasState {
  if (!state.canvases.some((c) => c.id === canvasId)) return state;
  return { ...state, activeCanvasId: canvasId };
}

export function updateCanvasRecord(
  state: WorkbenchCanvasState,
  canvasId: string,
  patch: Partial<
    Pick<WorkbenchCanvasRecord, "name" | "description" | "objects" | "viewport" | "settings">
  >,
): WorkbenchCanvasState {
  const ts = new Date().toISOString();
  return {
    ...state,
    canvases: state.canvases.map((canvas) =>
      canvas.id === canvasId
        ? {
            ...canvas,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() || canvas.name : canvas.name,
            updatedAt: ts,
            objects: patch.objects ?? canvas.objects,
            viewport: patch.viewport ? { ...patch.viewport } : canvas.viewport,
            settings: patch.settings ? { ...canvas.settings, ...patch.settings } : canvas.settings,
          }
        : canvas,
    ),
  };
}

export function updateActiveCanvasObjects(
  state: WorkbenchCanvasState,
  objects: CanvasObject[],
): WorkbenchCanvasState {
  return updateCanvasRecord(state, state.activeCanvasId, { objects });
}

export function updateActiveCanvasViewport(
  state: WorkbenchCanvasState,
  viewport: CanvasViewport,
): WorkbenchCanvasState {
  return updateCanvasRecord(state, state.activeCanvasId, { viewport });
}

export function updateActiveCanvasSettings(
  state: WorkbenchCanvasState,
  settings: Partial<CanvasSettings>,
): WorkbenchCanvasState {
  const active = getActiveCanvasRecord(state);
  return updateCanvasRecord(state, state.activeCanvasId, {
    settings: { ...active.settings, ...settings },
  });
}

export function createCanvas(state: WorkbenchCanvasState, name?: string): WorkbenchCanvasState {
  const record = createEmptyCanvasRecord(name?.trim() || nextCanvasName(state));
  return {
    version: CANVAS_STATE_VERSION,
    activeCanvasId: record.id,
    canvases: [...state.canvases, record],
  };
}

export function renameCanvas(
  state: WorkbenchCanvasState,
  canvasId: string,
  name: string,
): WorkbenchCanvasState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return updateCanvasRecord(state, canvasId, { name: trimmed });
}

function remapObjectIds(objects: CanvasObject[]): CanvasObject[] {
  const idMap = new Map<string, string>();
  for (const obj of objects) {
    idMap.set(obj.id, createId("canvas"));
  }
  return objects.map((obj) => ({
    ...obj,
    id: idMap.get(obj.id)!,
    sourceId: obj.sourceId && idMap.has(obj.sourceId) ? idMap.get(obj.sourceId)! : obj.sourceId,
    targetId: obj.targetId && idMap.has(obj.targetId) ? idMap.get(obj.targetId)! : obj.targetId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function duplicateCanvas(
  state: WorkbenchCanvasState,
  canvasId: string,
): WorkbenchCanvasState {
  const source = state.canvases.find((c) => c.id === canvasId);
  if (!source) return state;
  const ts = new Date().toISOString();
  const copy: WorkbenchCanvasRecord = {
    ...source,
    id: createId("wcanvas"),
    name: `${source.name.trim()} copy`,
    createdAt: ts,
    updatedAt: ts,
    objects: remapObjectIds(source.objects.map((o) => ({ ...o }))),
    viewport: { ...source.viewport },
    settings: { ...source.settings },
  };
  return {
    version: CANVAS_STATE_VERSION,
    activeCanvasId: copy.id,
    canvases: [...state.canvases, copy],
  };
}

export function clearCanvas(state: WorkbenchCanvasState, canvasId: string): WorkbenchCanvasState {
  return updateCanvasRecord(state, canvasId, { objects: [] });
}

export function getCanvasDataFromJson(json: Record<string, unknown> | null): WorkbenchCanvasData {
  if (!isRecord(json)) return { version: CANVAS_DATA_VERSION, objects: [] };
  return activeCanvasData(normalizeWorkbenchCanvasState(json));
}

export function deleteCanvas(state: WorkbenchCanvasState, canvasId: string): WorkbenchCanvasState {
  const remaining = state.canvases.filter((c) => c.id !== canvasId);
  if (!remaining.length) {
    const fresh = createEmptyCanvasRecord("Canvas 1");
    return {
      version: CANVAS_STATE_VERSION,
      activeCanvasId: fresh.id,
      canvases: [fresh],
    };
  }
  const nextActive =
    state.activeCanvasId === canvasId ? remaining[0]!.id : state.activeCanvasId;
  return {
    ...state,
    activeCanvasId: remaining.some((c) => c.id === nextActive) ? nextActive : remaining[0]!.id,
    canvases: remaining,
  };
}

/** Alias for {@link normalizeWorkbenchCanvasState}. */
export const normalizeWorkbenchCanvas = normalizeWorkbenchCanvasState;
