"use client";

import "./workbench-research-canvas/index.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { WorkbenchCitationSource, WorkbenchLinkableRecord } from "@/lib/workbench-data";
import { canvasObjectToDocumentHtml } from "./workbench-canvas-html";
import {
  CANVAS_MAX_IMAGE_BYTES,
  CANVAS_WORLD_HEIGHT,
  CANVAS_WORLD_WIDTH,
  createCanvasObject,
  defaultSizeForType,
  nextZIndex,
  refreshLinkedConnectors,
  serializeCanvasData,
  shapeTypeForTool,
  toolToObjectType,
} from "./workbench-canvas-data";
import {
  refreshTemplateConnectors,
  resolveTemplateInsertionOffset,
  translateTemplateObjects,
} from "./workbench-canvas-template-layout";
import { CANVAS_TEMPLATES, type CanvasTemplateId } from "./workbench-canvas-templates";
import type {
  CanvasObject,
  CanvasToolId,
  WorkbenchCanvasData,
} from "./workbench-canvas-types";
import {
  applyResizeHandle,
  isLineLikeObject,
  type ResizeHandle,
} from "./workbench-canvas-geometry";
import { WorkbenchResearchCanvasObjectView } from "./WorkbenchResearchCanvasObjectView";
import {
  findLineAtPoint,
  PREVIEW_LINE_ID,
  WorkbenchResearchCanvasLines,
} from "./WorkbenchResearchCanvasLines";
import type { LineEndpoint } from "./WorkbenchResearchCanvasLineHandles";
import { WorkbenchResearchCanvasSelection } from "./WorkbenchResearchCanvasSelection";
import { WorkbenchResearchCanvasToolbar } from "./WorkbenchResearchCanvasToolbar";
import { WorkbenchResearchCanvasTopbar } from "./WorkbenchResearchCanvasTopbar";
import { WorkbenchResearchCanvasInspector } from "./WorkbenchResearchCanvasInspector";
import {
  WorkbenchCanvasProjectHeader,
  type WorkbenchCanvasProjectHeaderProps,
} from "./WorkbenchCanvasProjectHeader";
import { WorkbenchResearchCanvasChrome } from "./WorkbenchResearchCanvasChrome";
import { WorkbenchCanvasFloatingAdd } from "./WorkbenchCanvasFloatingAdd";
import { WorkbenchCanvasMinidock } from "./WorkbenchCanvasMinidock";
import { WorkbenchCanvasPanelRail } from "./WorkbenchCanvasPanelRail";
import { WorkbenchCanvasArchiveMenu } from "./WorkbenchCanvasArchiveMenu";
import { useWorkbenchCanvasChrome } from "./useWorkbenchCanvasChrome";
import { getSpawnWorldPoint } from "./workbench-canvas-viewport";
import {
  applyWheelPan,
  buttonZoomInPercent,
  buttonZoomOutPercent,
  CANVAS_VIEWPORT_PERSIST_MS,
  clampCanvasZoomPercent,
  displayZoomPercent,
  panAroundPointer,
  wheelZoomPercent,
} from "./workbench-canvas-viewport-motion";
import type { CanvasSettings, CanvasViewport } from "./workbench-canvas-state";

const PLACEMENT_TOOLS = new Set<CanvasToolId>([
  "text",
  "sticky",
  "rectangle",
  "roundedRectangle",
  "circle",
  "frame",
  "quote",
  "question",
  "task",
  "link",
  "comment",
  "citation",
]);

const DRAW_TOOLS = new Set<CanvasToolId>(["line", "arrow"]);

function toolHintLabel(tool: CanvasToolId, connectorDraftId: string | null) {
  if (tool === "pan") return "Drag to pan. Scroll pans; ⌘/Ctrl + scroll zooms.";
  if (tool === "select") return "Select and drag objects. Delete removes selection.";
  if (tool === "connector") {
    return connectorDraftId
      ? "Click the second object to complete the connector."
      : "Click the first object, then the second.";
  }
  if (DRAW_TOOLS.has(tool)) return "Click and drag on the canvas to draw.";
  if (tool === "source") return "Pick a record from the archive menu.";
  if (tool === "image") return "Click the canvas to place an image (file picker opens).";
  if (PLACEMENT_TOOLS.has(tool)) return "Click the canvas to place this object.";
  return "";
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

function hitTestSolid(obj: CanvasObject, worldX: number, worldY: number) {
  return (
    worldX >= obj.x &&
    worldX <= obj.x + obj.width &&
    worldY >= obj.y &&
    worldY <= obj.y + obj.height
  );
}

export type WorkbenchCanvasShellProps = WorkbenchCanvasProjectHeaderProps;

export type WorkbenchResearchCanvasProps = {
  data: WorkbenchCanvasData;
  canvasInstanceId: string;
  initialViewport?: CanvasViewport;
  onViewportChange?: (viewport: CanvasViewport) => void;
  initialSettings?: CanvasSettings;
  onSettingsChange?: (patch: Partial<CanvasSettings>) => void;
  linkableRecords: WorkbenchLinkableRecord[];
  citationSources?: WorkbenchCitationSource[];
  canEdit: boolean;
  onChange: (data: WorkbenchCanvasData) => void;
  onPersistNow?: () => void;
  onSendToDocument: (html: string) => void;
  onOpenRecord?: (recordId: string) => void;
  onCiteRecord?: (recordId: string) => void;
  shell?: WorkbenchCanvasShellProps;
  collaborationNoteId?: string;
  collaborationUserId?: string | null;
  collaborationLocks?: import("@/lib/workbench-project-collaboration").WorkbenchCanvasObjectLockRow[];
  onCollaborationInteractionChange?: (active: boolean) => void;
};

export default function WorkbenchResearchCanvas({
  data,
  initialViewport,
  onViewportChange,
  initialSettings,
  onSettingsChange,
  linkableRecords,
  citationSources = [],
  canEdit,
  onChange,
  onPersistNow,
  onSendToDocument,
  onOpenRecord,
  onCiteRecord,
  shell,
  collaborationNoteId,
  collaborationUserId,
  collaborationLocks = [],
  onCollaborationInteractionChange,
}: WorkbenchResearchCanvasProps) {
  const [activeTool, setActiveTool] = useState<CanvasToolId>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(() =>
    clampCanvasZoomPercent(initialViewport?.zoom ?? 100),
  );
  const [pan, setPan] = useState(() => ({
    x: initialViewport?.panX ?? 0,
    y: initialViewport?.panY ?? 0,
  }));
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isFitting, setIsFitting] = useState(false);
  const [canvasSearch, setCanvasSearch] = useState("");
  const [inspectorMobileOpen, setInspectorMobileOpen] = useState(false);
  const ui = useWorkbenchCanvasChrome(selectedId, {
    initialSettings,
    onSettingsChange,
  });
  const viewportPersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomPersistRef = useRef(zoom);
  const panPersistRef = useRef(pan);
  const zoomGestureRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectorDraft, setConnectorDraft] = useState<string | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [draftPointer, setDraftPointer] = useState<{ x: number; y: number } | null>(null);

  const peerLockByObjectId = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, string>();
    for (const lock of collaborationLocks) {
      if (lock.user_id === collaborationUserId) continue;
      if (Date.parse(lock.expires_at) <= now) continue;
      map.set(lock.object_id, lock.display_name?.trim() || "Collaborator");
    }
    return map;
  }, [collaborationLocks, collaborationUserId]);

  useEffect(() => {
    if (!collaborationNoteId || !selectedId || !canEdit) return;
    let cancelled = false;
    const objectId = selectedId;
    void (async () => {
      const { acquireWorkbenchCanvasObjectLock } = await import(
        "@/lib/workbench-project-collaboration-actions"
      );
      if (cancelled) return;
      await acquireWorkbenchCanvasObjectLock({ noteId: collaborationNoteId, objectId });
    })();
    return () => {
      cancelled = true;
      void (async () => {
        const { releaseWorkbenchCanvasObjectLock } = await import(
          "@/lib/workbench-project-collaboration-actions"
        );
        await releaseWorkbenchCanvasObjectLock({ noteId: collaborationNoteId, objectId });
      })();
    };
  }, [collaborationNoteId, selectedId, canEdit]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const historyPast = useRef<WorkbenchCanvasData[]>([]);
  const historyFuture = useRef<WorkbenchCanvasData[]>([]);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const resizeRef = useRef<{
    id: string;
    pointerId: number;
    handle: ResizeHandle;
    snapshot: CanvasObject;
    startWorldX: number;
    startWorldY: number;
  } | null>(null);
  const lineEndpointRef = useRef<{
    id: string;
    pointerId: number;
    endpoint: LineEndpoint;
  } | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startPanX: number;
    startPanY: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);
  const lineDrawRef = useRef<{
    pointerId: number;
    type: "line" | "arrow" | "connector";
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    onCollaborationInteractionChange?.(
      isDraggingObject || isPanning || Boolean(resizeRef.current) || Boolean(lineEndpointRef.current),
    );
  }, [isDraggingObject, isPanning, selectedId, onCollaborationInteractionChange]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePointRef = useRef<{ x: number; y: number } | null>(null);

  const objects = data.objects;
  const selected = objects.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    zoomPersistRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panPersistRef.current = pan;
  }, [pan]);

  const flushViewportPersist = useCallback(() => {
    if (!onViewportChange) return;
    if (viewportPersistRef.current) clearTimeout(viewportPersistRef.current);
    viewportPersistRef.current = null;
    const p = panPersistRef.current;
    onViewportChange({
      zoom: zoomPersistRef.current,
      panX: p.x,
      panY: p.y,
    });
  }, [onViewportChange]);

  const scheduleViewportPersist = useCallback(() => {
    if (!onViewportChange) return;
    if (viewportPersistRef.current) clearTimeout(viewportPersistRef.current);
    viewportPersistRef.current = setTimeout(() => {
      viewportPersistRef.current = null;
      flushViewportPersist();
    }, CANVAS_VIEWPORT_PERSIST_MS);
  }, [flushViewportPersist, onViewportChange]);

  useEffect(() => {
    scheduleViewportPersist();
    return () => {
      if (viewportPersistRef.current) clearTimeout(viewportPersistRef.current);
    };
  }, [pan.x, pan.y, zoom, scheduleViewportPersist]);

  const bookmarkSources = useMemo(
    () => citationSources.filter((s) => s.sourceType === "bookmark" || s.bookmarkId),
    [citationSources],
  );
  const readingListSources = useMemo(
    () => citationSources.filter((s) => s.sourceType === "reading_list" || s.readingListId),
    [citationSources],
  );

  const pushHistory = useCallback(() => {
    historyPast.current.push(serializeCanvasData(data));
    if (historyPast.current.length > 40) historyPast.current.shift();
    historyFuture.current = [];
  }, [data]);

  const commit = useCallback(
    (nextObjects: CanvasObject[], skipHistory = false) => {
      if (!skipHistory) pushHistory();
      const refreshed = refreshLinkedConnectors(nextObjects);
      onChange({ version: data.version, objects: refreshed });
    },
    [data.version, onChange, pushHistory],
  );

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return { x: 0, y: 0 };
      const rect = viewport.getBoundingClientRect();
      const scale = zoom / 100;
      return {
        x: (clientX - rect.left - pan.x) / scale,
        y: (clientY - rect.top - pan.y) / scale,
      };
    },
    [pan.x, pan.y, zoom],
  );

  const updateObject = useCallback(
    (id: string, patch: Partial<CanvasObject>) => {
      commit(
        objects.map((obj) =>
          obj.id === id ? { ...obj, ...patch, updatedAt: new Date().toISOString() } : obj,
        ),
        true,
      );
    },
    [commit, objects],
  );

  const addObjectAt = useCallback(
    (tool: CanvasToolId, worldX: number, worldY: number, record?: WorkbenchLinkableRecord, extra?: Partial<CanvasObject>) => {
      if (!canEdit) return;
      const type = toolToObjectType(tool);
      const size = defaultSizeForType(type);
      const shapeType = shapeTypeForTool(tool);
      const obj = createCanvasObject({
        type,
        x: Math.max(24, worldX - size.width / 2),
        y: Math.max(24, worldY - size.height / 2),
        zIndex: nextZIndex(objects),
        shapeType,
        record,
        patch: extra,
      });
      commit([...objects, obj]);
      setSelectedId(obj.id);
      setActiveTool("select");
    },
    [canEdit, commit, objects],
  );

  const spawnToolAtViewport = useCallback(
    (tool: CanvasToolId) => {
      if (!canEdit) return;
      const type = toolToObjectType(tool);
      const size = defaultSizeForType(type);
      const point = getSpawnWorldPoint(
        viewportRef.current,
        pan,
        zoom,
        size.width,
        size.height,
      );
      const centerX = point.x + size.width / 2;
      const centerY = point.y + size.height / 2;
      if (tool === "image") {
        pendingImagePointRef.current = { x: point.x, y: point.y };
        imageInputRef.current?.click();
        return;
      }
      if (tool === "source") {
        setActiveTool("source");
        setArchiveMenuOpen(true);
        return;
      }
      if (DRAW_TOOLS.has(tool) || tool === "connector") {
        setActiveTool(tool);
        return;
      }
      addObjectAt(tool, centerX, centerY);
    },
    [addObjectAt, canEdit, pan, zoom],
  );

  const objectMatchesSearch = useCallback(
    (obj: CanvasObject) => {
      const query = canvasSearch.trim().toLowerCase();
      if (!query) return true;
      const haystack = [
        obj.title,
        obj.body,
        obj.label,
        obj.imageCaption,
        obj.creator,
        obj.sourceLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    },
    [canvasSearch],
  );

  const smartOrganise = useCallback(() => {
    if (!canEdit || !objects.length) return;
    pushHistory();
    const solids = objects.filter((o) => !isLineLikeObject(o));
    const lines = objects.filter((o) => isLineLikeObject(o));
    const gap = 28;
    const cols = 3;
    const startX = 120;
    const startY = 140;
    const organised = solids.map((obj, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellW =
        Math.max(...solids.filter((_, i) => i % cols === col).map((o) => o.width), 200) + gap;
      const cellH =
        Math.max(
          ...solids
            .filter((_, i) => Math.floor(i / cols) === row)
            .map((o) => o.height),
          120,
        ) + gap;
      return {
        ...obj,
        x: startX + col * cellW,
        y: startY + row * cellH,
        updatedAt: new Date().toISOString(),
      };
    });
    commit([...organised, ...lines]);
  }, [canEdit, commit, objects, pushHistory]);

  const {
    focusMode,
    addMenuOpen,
    archiveMenuOpen,
    rightPanelState,
    rightPanelTab,
    panelExpanded,
    panelCollapsed,
    panelHidden,
    setAddMenuOpen,
    setArchiveMenuOpen,
    setRightPanelTab,
    restoreControls,
    openPanel,
    togglePanelVisibility,
    collapsePanel,
    toggleFocusMode,
    cyclePanel,
  } = ui;

  const layerObjectById = useCallback(
    (id: string, mode: "forward" | "backward" | "front" | "back") => {
      const target = objects.find((o) => o.id === id);
      if (!target || !canEdit || isLineLikeObject(target)) return;
      const solids = objects.filter((o) => !isLineLikeObject(o));
      const zValues = solids.map((o) => o.zIndex);
      const minZ = Math.min(...zValues, 1);
      const maxZ = Math.max(...zValues, 1);
      let nextZ = target.zIndex;
      if (mode === "forward") nextZ = maxZ + 1;
      if (mode === "backward") nextZ = Math.max(1, minZ - 1);
      if (mode === "front") nextZ = maxZ + 2;
      if (mode === "back") nextZ = 1;
      updateObject(id, { zIndex: nextZ });
    },
    [canEdit, objects, updateObject],
  );

  const deleteObjectById = useCallback(
    (id: string) => {
      if (!canEdit) return;
      pushHistory();
      commit(objects.filter((o) => o.id !== id && o.sourceId !== id && o.targetId !== id));
      setSelectedId((current) => (current === id ? null : current));
    },
    [canEdit, commit, objects, pushHistory],
  );

  const duplicateObjectById = useCallback(
    (id: string) => {
      const source = objects.find((o) => o.id === id);
      if (!source || !canEdit || isLineLikeObject(source)) return;
      pushHistory();
      const copy = {
        ...source,
        id: `canvas-${crypto.randomUUID?.() ?? Date.now()}`,
        x: source.x + 28,
        y: source.y + 28,
        zIndex: nextZIndex(objects),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      commit([...objects, copy]);
      setSelectedId(copy.id);
    },
    [canEdit, commit, objects, pushHistory],
  );

  const deleteSelected = useCallback(() => {
    if (selectedId) deleteObjectById(selectedId);
  }, [deleteObjectById, selectedId]);

  const duplicateSelected = useCallback(() => {
    if (selectedId) duplicateObjectById(selectedId);
  }, [duplicateObjectById, selectedId]);

  const layerSelected = useCallback(
    (mode: "forward" | "backward" | "front" | "back") => {
      if (selectedId) layerObjectById(selectedId, mode);
    },
    [layerObjectById, selectedId],
  );

  const applyTemplate = useCallback(
    (templateId: CanvasTemplateId) => {
      const template = CANVAS_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      const built = template.build();
      if (!built.length) return;
      if (objects.length > 0) {
        const ok = window.confirm(
          "Apply this template? New objects will be added below existing content without removing current items.",
        );
        if (!ok) return;
      }
      pushHistory();
      const { dx, dy } = resolveTemplateInsertionOffset(objects, built);
      const placed = refreshTemplateConnectors(translateTemplateObjects(built, dx, dy));
      const offsetZ = nextZIndex(objects);
      const merged = [
        ...objects,
        ...placed.map((obj, i) => ({ ...obj, zIndex: offsetZ + i })),
      ];
      commit(merged);
    },
    [commit, objects, pushHistory],
  );

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let targetZoom = 100;
    let targetPan = {
      x: Math.max(0, (viewport.clientWidth - CANVAS_WORLD_WIDTH) / 2),
      y: Math.max(0, (viewport.clientHeight - CANVAS_WORLD_HEIGHT) / 2),
    };

    if (objects.length) {
      const minX = Math.min(...objects.map((o) => o.x));
      const minY = Math.min(...objects.map((o) => o.y));
      const maxX = Math.max(...objects.map((o) => o.x + o.width));
      const maxY = Math.max(...objects.map((o) => o.y + o.height));
      const pad = 80;
      const bw = maxX - minX + pad * 2;
      const bh = maxY - minY + pad * 2;
      const scale = Math.min(
        (viewport.clientWidth - 40) / bw,
        (viewport.clientHeight - 40) / bh,
        2.5,
      );
      targetZoom = clampCanvasZoomPercent(scale * 100);
      targetPan = {
        x: (viewport.clientWidth - bw * scale) / 2 - minX * scale + pad * scale,
        y: (viewport.clientHeight - bh * scale) / 2 - minY * scale + pad * scale,
      };
    }

    setIsFitting(true);
    setZoom(targetZoom);
    setPan(targetPan);
    window.setTimeout(() => setIsFitting(false), 180);
    flushViewportPersist();
  }, [flushViewportPersist, objects]);

  const undo = useCallback(() => {
    const prev = historyPast.current.pop();
    if (!prev) return;
    historyFuture.current.push(serializeCanvasData(data));
    onChange(prev);
  }, [data, onChange]);

  const redo = useCallback(() => {
    const next = historyFuture.current.pop();
    if (!next) return;
    historyPast.current.push(serializeCanvasData(data));
    onChange(next);
  }, [data, onChange]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (!viewport.contains(event.target as Node)) return;
      if (isTypingTarget(event.target)) return;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const currentZoom = zoomPersistRef.current;
        const currentPan = panPersistRef.current;
        const nextZoom = wheelZoomPercent(
          currentZoom,
          event.deltaY,
          event.deltaMode,
        );
        const nextPan = panAroundPointer({
          currentZoomPercent: currentZoom,
          nextZoomPercent: nextZoom,
          panX: currentPan.x,
          panY: currentPan.y,
          pointerX,
          pointerY,
        });
        setZoom(nextZoom);
        setPan({ x: nextPan.panX, y: nextPan.panY });
        setIsZooming(true);
        if (zoomGestureRef.current) clearTimeout(zoomGestureRef.current);
        zoomGestureRef.current = setTimeout(() => setIsZooming(false), 160);
        return;
      }

      event.preventDefault();
      setPan((p) => {
        const next = applyWheelPan(
          p.x,
          p.y,
          event.deltaX,
          event.deltaY,
          event.shiftKey,
          event.deltaMode,
        );
        const updated = { x: next.panX, y: next.panY };
        panPersistRef.current = updated;
        return updated;
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      if (zoomGestureRef.current) clearTimeout(zoomGestureRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "Escape") {
        setArchiveMenuOpen(false);
        setAddMenuOpen(false);
        setConnectorDraft(null);
        if (focusMode) {
          restoreControls();
          return;
        }
        if (rightPanelState === "expanded" && selectedId) {
          setSelectedId(null);
          return;
        }
        if (selectedId) {
          setSelectedId(null);
          return;
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && canEdit) {
        event.preventDefault();
        deleteSelected();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && selectedId) {
        event.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canEdit,
    focusMode,
    deleteSelected,
    setAddMenuOpen,
    setArchiveMenuOpen,
    duplicateSelected,
    redo,
    restoreControls,
    rightPanelState,
    selectedId,
    undo,
  ]);

  function handleViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".workbench-research-canvas-line")) return;
    if ((event.target as HTMLElement).closest(".workbench-research-canvas-object")) return;
    if ((event.target as HTMLElement).closest("button, input, textarea, select, label")) return;

    const world = screenToWorld(event.clientX, event.clientY);

    if (activeTool === "pan" || event.button === 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = {
        pointerId: event.pointerId,
        startPanX: pan.x,
        startPanY: pan.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      setIsPanning(true);
      return;
    }

    if (activeTool === "line" || activeTool === "arrow") {
      if (!canEdit) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      lineDrawRef.current = {
        pointerId: event.pointerId,
        type: activeTool,
        startX: world.x,
        startY: world.y,
      };
      return;
    }

    if (activeTool !== "select") {
      if (!canEdit) return;
      if (activeTool === "image") {
        pendingImagePointRef.current = { x: world.x, y: world.y };
        imageInputRef.current?.click();
        return;
      }
      if (activeTool === "source") {
        setArchiveMenuOpen(true);
        return;
      }
      addObjectAt(activeTool, world.x, world.y);
      setSelectedId(null);
      return;
    }

    setSelectedId(null);
    setConnectorDraft(null);
  }

  function handleViewportPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const panState = panRef.current;
    if (panState && panState.pointerId === event.pointerId) {
      setPan({
        x: panState.startPanX + (event.clientX - panState.startClientX),
        y: panState.startPanY + (event.clientY - panState.startClientY),
      });
      return;
    }

    const world = screenToWorld(event.clientX, event.clientY);

    if (activeTool === "connector" && connectorDraft) {
      setDraftPointer(world);
    }

    const lineEndpoint = lineEndpointRef.current;
    if (lineEndpoint && lineEndpoint.pointerId === event.pointerId) {
      const next = objects.map((o) => {
        if (o.id !== lineEndpoint.id) return o;
        if (lineEndpoint.endpoint === "start") {
          return {
            ...o,
            startX: world.x,
            startY: world.y,
            x: Math.min(world.x, o.endX ?? o.x + o.width),
            y: Math.min(world.y, o.endY ?? o.y + o.height),
            width: Math.max(24, Math.abs((o.endX ?? o.x + o.width) - world.x)),
            height: Math.max(24, Math.abs((o.endY ?? o.y + o.height) - world.y)),
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...o,
          endX: world.x,
          endY: world.y,
          x: Math.min(o.startX ?? o.x, world.x),
          y: Math.min(o.startY ?? o.y, world.y),
          width: Math.max(24, Math.abs(world.x - (o.startX ?? o.x))),
          height: Math.max(24, Math.abs(world.y - (o.startY ?? o.y))),
          updatedAt: new Date().toISOString(),
        };
      });
      commit(refreshLinkedConnectors(next), true);
      return;
    }

    const line = lineDrawRef.current;
    if (line && line.pointerId === event.pointerId) {
      const previewId = PREVIEW_LINE_ID;
      const preview = createCanvasObject({
        type: line.type,
        x: Math.min(line.startX, world.x),
        y: Math.min(line.startY, world.y),
        zIndex: 9999,
        patch: {
          id: previewId,
          startX: line.startX,
          startY: line.startY,
          endX: world.x,
          endY: world.y,
          width: Math.max(24, Math.abs(world.x - line.startX)),
          height: Math.max(24, Math.abs(world.y - line.startY)),
        },
      });
      onChange({
        version: data.version,
        objects: [...objects.filter((o) => o.id !== previewId), preview],
      });
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      commit(
        refreshLinkedConnectors(
          objects.map((o) =>
            o.id === drag.id
              ? {
                  ...o,
                  x: Math.max(0, world.x - drag.offsetX),
                  y: Math.max(0, world.y - drag.offsetY),
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        ),
        true,
      );
    }

    const resize = resizeRef.current;
    if (resize && resize.pointerId === event.pointerId) {
      commit(
        refreshLinkedConnectors(
          objects.map((o) =>
            o.id === resize.id
              ? {
                  ...o,
                  ...applyResizeHandle(resize.handle, resize.snapshot, world.x, world.y),
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        ),
        true,
      );
      return;
    }

    if (
      !panRef.current &&
      !dragRef.current &&
      !resizeRef.current &&
      !lineDrawRef.current &&
      !lineEndpointRef.current &&
      activeTool === "select"
    ) {
      const lineHit = findLineAtPoint(objects, world.x, world.y);
      if (lineHit) {
        setHoveredLineId(lineHit.id);
        setHoveredObjectId(null);
      } else {
        setHoveredLineId(null);
        const solids = objects.filter((o) => !isLineLikeObject(o));
        const top = [...solids]
          .sort((a, b) => b.zIndex - a.zIndex)
          .find((o) => hitTestSolid(o, world.x, world.y));
        setHoveredObjectId(top?.id ?? null);
      }
    }
  }

  function handleViewportPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const line = lineDrawRef.current;
    if (line && line.pointerId === event.pointerId) {
      const world = screenToWorld(event.clientX, event.clientY);
      pushHistory();
      const obj = createCanvasObject({
        type: line.type,
        x: Math.min(line.startX, world.x),
        y: Math.min(line.startY, world.y),
        zIndex: nextZIndex(objects.filter((o) => o.id !== PREVIEW_LINE_ID)),
        patch: {
          startX: line.startX,
          startY: line.startY,
          endX: world.x,
          endY: world.y,
          width: Math.max(24, Math.abs(world.x - line.startX)),
          height: Math.max(24, Math.abs(world.y - line.startY)),
          arrowEnd: line.type === "arrow" ? "arrow" : undefined,
        },
      });
      commit([...objects.filter((o) => o.id !== PREVIEW_LINE_ID), obj]);
      setSelectedId(obj.id);
      lineDrawRef.current = null;
      setActiveTool("select");
    }
    const wasPanning = Boolean(panRef.current);
    const wasDraggingObject = Boolean(dragRef.current);
    const wasResizing = Boolean(resizeRef.current);
    const wasLineEdit = Boolean(lineEndpointRef.current);
    panRef.current = null;
    dragRef.current = null;
    resizeRef.current = null;
    lineEndpointRef.current = null;
    setDraftPointer(null);
    setIsPanning(false);
    setIsDraggingObject(false);
    if (wasPanning) flushViewportPersist();
    if (wasPanning || wasDraggingObject || wasResizing || wasLineEdit) {
      onPersistNow?.();
    }
  }

  function handleSelectTool(tool: CanvasToolId) {
    setActiveTool(tool);
    setConnectorDraft(null);
    setDraftPointer(null);
    if (tool === "source") {
      setArchiveMenuOpen(true);
      return;
    }
    if (tool !== "connector") setArchiveMenuOpen(false);
  }

  function startObjectResize(
    event: ReactPointerEvent<HTMLSpanElement>,
    handle: ResizeHandle,
    worldX: number,
    worldY: number,
  ) {
    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;
    resizeRef.current = {
      id: obj.id,
      pointerId: event.pointerId,
      handle,
      snapshot: { ...obj },
      startWorldX: worldX,
      startWorldY: worldY,
    };
  }

  function startLineEndpointDrag(
    event: ReactPointerEvent<SVGCircleElement>,
    endpoint: LineEndpoint,
    obj: CanvasObject,
  ) {
    lineEndpointRef.current = {
      id: obj.id,
      pointerId: event.pointerId,
      endpoint,
    };
    setSelectedId(obj.id);
  }

  function startObjectDrag(event: ReactPointerEvent<HTMLElement>, obj: CanvasObject) {
    if (!canEdit || obj.locked || activeTool === "pan" || peerLockByObjectId.has(obj.id)) return;
    if (activeTool !== "select" && activeTool !== "connector") return;
    if ((event.target as HTMLElement).closest("input, textarea, select, button")) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const world = screenToWorld(event.clientX, event.clientY);
    setSelectedId(obj.id);

    if (activeTool === "connector" && canEdit) {
      if (!connectorDraft) {
        setConnectorDraft(obj.id);
        return;
      }
      if (connectorDraft !== obj.id) {
        pushHistory();
        const c = createCanvasObject({
          type: "connector",
          x: 0,
          y: 0,
          zIndex: nextZIndex(objects),
          patch: { sourceId: connectorDraft, targetId: obj.id, arrowEnd: "arrow" },
        });
        const withConnector = refreshLinkedConnectors([...objects, c]);
        commit(withConnector);
        setConnectorDraft(null);
        setActiveTool("select");
      }
      return;
    }

    dragRef.current = {
      id: obj.id,
      pointerId: event.pointerId,
      offsetX: world.x - obj.x,
      offsetY: world.y - obj.y,
    };
    setIsDraggingObject(true);
  }

  function addFromCitationSource(source: WorkbenchCitationSource, origin: "archive" | "bookmark" | "reading_list") {
    pushHistory();
    const obj = createCanvasObject({
      type: "source",
      x: 120 + objects.length * 16,
      y: 120 + objects.length * 12,
      zIndex: nextZIndex(objects),
      patch: {
        title: source.title,
        body: source.creator ? `${source.creator}${source.date ? ` · ${source.date}` : ""}` : "",
        linkedRecordId: source.recordId ?? null,
        bookmarkId: source.bookmarkId ?? null,
        readingListId: source.readingListId ?? null,
        sourceOrigin: origin,
        creator: source.creator ?? undefined,
        date: source.date ?? undefined,
        sourceLabel: source.sourceLabel ?? source.sourceType,
      },
    });
    commit([...objects, obj]);
    setSelectedId(obj.id);
    setArchiveMenuOpen(false);
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }
    if (file.size > CANVAS_MAX_IMAGE_BYTES) {
      window.alert("Image must be 4MB or smaller.");
      return;
    }
    // TODO: upload to Supabase Storage and store public URL instead of data URL.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    pushHistory();
    const point = pendingImagePointRef.current;
    const size = defaultSizeForType("image");
    const obj = createCanvasObject({
      type: "image",
      x: point ? Math.max(24, point.x - size.width / 2) : 160,
      y: point ? Math.max(24, point.y - size.height / 2) : 160,
      zIndex: nextZIndex(objects),
      patch: { imageUrl: dataUrl, imageAlt: file.name, title: "Image" },
    });
    pendingImagePointRef.current = null;
    commit([...objects, obj]);
    setSelectedId(obj.id);
  }

  const solidObjects = objects.filter((o) => !isLineLikeObject(o));
  const selectedSolid =
    selected && !isLineLikeObject(selected) ? selected : null;

  const zoomScale = zoom / 100;
  const worldTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`;
  const zoomDisplay = displayZoomPercent(zoom);
  const activeHint = toolHintLabel(activeTool, connectorDraft);

  const zoomIn = useCallback(() => {
    setZoom((z) => buttonZoomInPercent(z));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => buttonZoomOutPercent(z));
  }, []);

  return (
    <section
      className={[
        "workbench-research-canvas",
        panelExpanded ? "has-inspector-panel" : "",
        panelCollapsed ? "has-collapsed-panel" : "",
        panelHidden ? "has-hidden-panel" : "",
        focusMode ? "is-focus-mode" : "",
        shell ? "has-project-header has-chrome-stack" : "has-chrome-stack",
        selected ? "has-inspector" : "",
        selectedSolid ? "has-solid-selection" : "",
        activeTool === "connector" && connectorDraft ? "is-connector-editing" : "",
        isPanning ? "is-panning" : "",
        isZooming ? "is-zooming" : "",
        isDraggingObject ? "is-dragging" : "",
        isFitting ? "is-fitting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Research canvas"
    >
      <WorkbenchResearchCanvasToolbar
        activeTool={activeTool}
        canEdit={canEdit}
        hidden={focusMode}
        onSelectTool={handleSelectTool}
      />

      <WorkbenchResearchCanvasChrome>
        {shell ? <WorkbenchCanvasProjectHeader {...shell} hidden={focusMode} /> : null}
        <WorkbenchResearchCanvasTopbar
          canEdit={canEdit}
          hidden={focusMode}
          zoom={zoomDisplay}
          controlsHidden={focusMode}
          searchQuery={canvasSearch}
          onSearchChange={setCanvasSearch}
          hasSelection={Boolean(selected)}
          bookmarkCount={bookmarkSources.length}
          readingListCount={readingListSources.length}
          onZoomOut={zoomOut}
          onZoomIn={zoomIn}
          onFit={fitToScreen}
          onUndo={undo}
          onRedo={redo}
          panelState={rightPanelState}
          onToggleFocus={toggleFocusMode}
          onTogglePanel={cyclePanel}
          onHidePanel={togglePanelVisibility}
          onApplyTemplate={applyTemplate}
          onToggleArchiveMenu={() => setArchiveMenuOpen(!archiveMenuOpen)}
          onAddBookmark={() => {
            if (bookmarkSources.length === 1) {
              addFromCitationSource(bookmarkSources[0], "bookmark");
            } else {
              setArchiveMenuOpen(true);
            }
          }}
          onAddReadingList={() => {
            if (readingListSources.length === 1) {
              addFromCitationSource(readingListSources[0], "reading_list");
            } else {
              setArchiveMenuOpen(true);
            }
          }}
          onSendToDocument={
            selected ? () => onSendToDocument(canvasObjectToDocumentHtml(selected)) : undefined
          }
        />
      </WorkbenchResearchCanvasChrome>

      <WorkbenchCanvasMinidock
        zoom={zoomDisplay}
        focusMode={focusMode}
        canEdit={canEdit}
        onShowUi={restoreControls}
        onZoomOut={zoomOut}
        onZoomIn={zoomIn}
        onFit={fitToScreen}
        onOpenAdd={() => setAddMenuOpen(true)}
        onTogglePanel={() => {
          if (focusMode) restoreControls();
          openPanel();
        }}
      />

      <WorkbenchCanvasFloatingAdd
        canEdit={canEdit}
        focusMode={focusMode}
        menuOpen={addMenuOpen}
        onMenuOpenChange={setAddMenuOpen}
        onPickTool={spawnToolAtViewport}
        onAddFromArchive={() => setArchiveMenuOpen(true)}
      />

      {panelCollapsed ? (
        <WorkbenchCanvasPanelRail
          activeTab={rightPanelTab}
          hasSelection={Boolean(selected)}
          onSelectTab={setRightPanelTab}
          onExpand={() => openPanel()}
        />
      ) : null}

      {panelHidden && !focusMode ? (
        <button
          type="button"
          className="workbench-canvas-panel-reopen"
          aria-label="Open side panel"
          onClick={() => openPanel()}
        >
          Panel
        </button>
      ) : null}

      <WorkbenchCanvasArchiveMenu
        open={archiveMenuOpen}
        linkableRecords={linkableRecords}
        bookmarkSources={bookmarkSources}
        readingListSources={readingListSources}
        citationSources={citationSources}
        onClose={() => setArchiveMenuOpen(false)}
        onAddRecord={(record) => {
          pushHistory();
          const size = defaultSizeForType("source");
          const spawn = getSpawnWorldPoint(
            viewportRef.current,
            pan,
            zoom,
            size.width,
            size.height,
          );
          const obj = createCanvasObject({
            type: "source",
            x: spawn.x,
            y: spawn.y,
            zIndex: nextZIndex(objects),
            record,
            patch: { sourceOrigin: "archive" },
          });
          commit([...objects, obj]);
          setSelectedId(obj.id);
          setArchiveMenuOpen(false);
          openPanel("inspect");
        }}
        onAddCitationSource={(source, origin) => {
          addFromCitationSource(source, origin);
          setArchiveMenuOpen(false);
        }}
      />

      {activeHint && !focusMode ? (
        <p className="workbench-research-canvas-hint" role="status">
          {activeHint}
        </p>
      ) : null}

      <div className="workbench-research-canvas-stage-wrap">
        <div
          ref={viewportRef}
          className={`workbench-research-canvas-viewport${activeTool === "pan" ? " is-pan-tool" : ""}${isPanning ? " is-panning" : ""}`}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
          onPointerLeave={() => {
            setHoveredObjectId(null);
            setHoveredLineId(null);
            if (!connectorDraft) setDraftPointer(null);
          }}
        >
          <div
            className="workbench-research-canvas-world"
            style={{
              width: CANVAS_WORLD_WIDTH,
              height: CANVAS_WORLD_HEIGHT,
              transform: worldTransform,
            }}
          >
            <WorkbenchResearchCanvasLines
              objects={objects}
              worldWidth={CANVAS_WORLD_WIDTH}
              worldHeight={CANVAS_WORLD_HEIGHT}
              selectedId={selectedId}
              hoveredLineId={hoveredLineId}
              connectorDraftId={connectorDraft}
              draftPointer={draftPointer}
              canEdit={canEdit}
              onSelectLine={(id) => {
                setSelectedId(id);
                setInspectorMobileOpen(true);
              }}
              onLinePointerDown={(event, obj) => {
                event.stopPropagation();
                setSelectedId(obj.id);
              }}
              onStartEndpointDrag={startLineEndpointDrag}
            />
            {solidObjects
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((obj) => (
                <WorkbenchResearchCanvasObjectView
                  key={obj.id}
                  obj={obj}
                  selected={selectedId === obj.id}
                  hovered={hoveredObjectId === obj.id}
                  dimmed={Boolean(canvasSearch.trim()) && !objectMatchesSearch(obj)}
                  connectorDraftSource={connectorDraft === obj.id}
                  dragging={dragRef.current?.id === obj.id}
                  canEdit={canEdit && !peerLockByObjectId.has(obj.id)}
                  lockHeldBy={peerLockByObjectId.get(obj.id) ?? null}
                  onOpenRecord={onOpenRecord}
                  onCiteRecord={onCiteRecord}
                  onSelect={() => {
                    setSelectedId(obj.id);
                    setInspectorMobileOpen(true);
                  }}
                  onStartDrag={startObjectDrag}
                  onUpdate={updateObject}
                  onInspect={() => {
                    setSelectedId(obj.id);
                    setRightPanelTab("inspect");
                    openPanel("inspect");
                    setInspectorMobileOpen(true);
                  }}
                  onDuplicate={() => duplicateObjectById(obj.id)}
                  onDelete={() => deleteObjectById(obj.id)}
                  onToggleLock={() =>
                    updateObject(obj.id, { locked: !obj.locked })
                  }
                  onLayerForward={() => layerObjectById(obj.id, "forward")}
                  onLayerBackward={() => layerObjectById(obj.id, "backward")}
                  onSendToDocument={() =>
                    onSendToDocument(canvasObjectToDocumentHtml(obj))
                  }
                  onReplaceImage={() => {
                    setSelectedId(obj.id);
                    imageInputRef.current?.click();
                  }}
                />
              ))}
            {selectedSolid ? (
              <WorkbenchResearchCanvasSelection
                obj={selectedSolid}
                canEdit={canEdit}
                connectorDraftSource={connectorDraft === selectedSolid.id}
                onStartResize={(event, handle) => {
                  const world = screenToWorld(event.clientX, event.clientY);
                  startObjectResize(event, handle, world.x, world.y);
                }}
                screenToWorld={screenToWorld}
              />
            ) : null}
            {!objects.length ? (
              <div className="workbench-research-canvas-empty">
                <strong>Visual research canvas</strong>
                <p>Map sources, arguments, and themes. Board mode stays separate for collecting.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {panelExpanded ? (
        <WorkbenchResearchCanvasInspector
          selected={selected}
          canEdit={canEdit}
          mobileOpen={inspectorMobileOpen}
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
          onCollapsePanel={collapsePanel}
          onHidePanel={togglePanelVisibility}
          linkableCount={linkableRecords.length}
          objectCount={objects.length}
          onUpdate={updateObject}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onLayerForward={() => layerSelected("forward")}
          onLayerBackward={() => layerSelected("backward")}
          onLayerFront={() => layerSelected("front")}
          onLayerBack={() => layerSelected("back")}
          onSendToDocument={onSendToDocument}
          onOpenRecord={onOpenRecord}
          onCiteRecord={onCiteRecord}
          onReplaceImage={() => imageInputRef.current?.click()}
          onRemoveImage={() => selected && updateObject(selected.id, { imageUrl: undefined })}
          onApplyTemplate={applyTemplate}
          onSmartOrganise={smartOrganise}
          canvasObjectToDocumentHtml={canvasObjectToDocumentHtml}
        />
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImageFile(file);
        }}
      />
    </section>
  );
}
