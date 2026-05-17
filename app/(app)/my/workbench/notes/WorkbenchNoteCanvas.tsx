"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";

export type CanvasBlockType = "text" | "sticky" | "quote" | "archiveRecord" | "imagePlaceholder";

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

export type WorkbenchCanvasData = {
  blocks: WorkbenchCanvasBlock[];
};

type DragState = {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

type ResizeState = {
  id: string;
  pointerId: number;
  startWidth: number;
  startHeight: number;
  startCanvasX: number;
  startCanvasY: number;
};

type PanState = {
  pointerId: number;
  startScrollLeft: number;
  startScrollTop: number;
  startClientX: number;
  startClientY: number;
};

const BLOCK_LABELS: Record<CanvasBlockType, string> = {
  text: "Text",
  sticky: "Sticky",
  quote: "Quote",
  archiveRecord: "Source",
  imagePlaceholder: "Image",
};

const ZOOM_PRESETS = [75, 100, 125] as const;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const MIN_BLOCK_WIDTH = 120;
const MIN_BLOCK_HEIGHT = 80;

const EDITABLE_BLOCK_TYPES = new Set<CanvasBlockType>(["text", "sticky", "quote", "imagePlaceholder"]);

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value / ZOOM_STEP) * ZOOM_STEP));
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable ||
      Boolean(target.closest("[contenteditable='true']")))
  );
}

function isBlockInteractionTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "textarea, button, select, input, .workbench-note-canvas-resize-handle, .workbench-note-canvas-block-actions",
    ),
  );
}

function defaultContent(type: CanvasBlockType, record?: WorkbenchLinkableRecord) {
  switch (type) {
    case "sticky":
      return "Working thought…";
    case "quote":
      return "Quote or interpretive note";
    case "archiveRecord":
      return record?.title ?? "Archive source card";
    case "imagePlaceholder":
      return "";
    default:
      return "Text block";
  }
}

function blockHtml(block: WorkbenchCanvasBlock) {
  const escaped = block.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (block.type === "quote") return `<blockquote><p>${escaped}</p></blockquote><p></p>`;
  if (block.type === "archiveRecord") {
    return `<p><strong>Source:</strong> ${escaped}</p><p></p>`;
  }
  return `<p><strong>${BLOCK_LABELS[block.type]}:</strong> ${escaped}</p><p></p>`;
}

function blockClassName(
  block: WorkbenchCanvasBlock,
  selectedId: string | null,
  draggingId: string | null,
  resizingId: string | null,
) {
  const typeClass =
    block.type === "sticky"
      ? "workbench-note-canvas-sticky"
      : block.type === "archiveRecord"
        ? "workbench-note-canvas-source-card"
        : block.type === "imagePlaceholder"
          ? "workbench-note-canvas-image-placeholder"
          : `is-${block.type}`;
  return [
    "workbench-note-canvas-block",
    typeClass,
    selectedId === block.id ? "is-selected" : "",
    draggingId === block.id ? "is-dragging" : "",
    resizingId === block.id ? "is-resizing" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function WorkbenchNoteCanvas({
  data,
  linkableRecords,
  canEdit,
  onChange,
  onSendToDocument,
}: {
  data: WorkbenchCanvasData;
  linkableRecords: WorkbenchLinkableRecord[];
  canEdit: boolean;
  onChange: (data: WorkbenchCanvasData) => void;
  onSendToDocument: (html: string) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const shellRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const canvasEngagedRef = useRef(false);

  const sortedBlocks = useMemo(
    () => [...data.blocks].sort((a, b) => a.y - b.y || a.x - b.x),
    [data.blocks],
  );

  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    const scale = zoom / 100;
    return {
      x: (clientX - rect.left + viewport.scrollLeft) / scale,
      y: (clientY - rect.top + viewport.scrollTop) / scale,
    };
  }, [zoom]);

  function updateBlock(id: string, patch: Partial<WorkbenchCanvasBlock>) {
    onChange({
      blocks: data.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    });
  }

  function addBlock(type: CanvasBlockType) {
    if (!canEdit) return;
    const record = type === "archiveRecord" ? linkableRecords[0] : undefined;
    const index = data.blocks.length;
    const newBlock: WorkbenchCanvasBlock = {
      id: createId("canvas"),
      type,
      x: 80 + (index % 4) * 40,
      y: 80 + index * 36,
      width: type === "sticky" ? 220 : type === "imagePlaceholder" ? 240 : 260,
      height: type === "imagePlaceholder" ? 168 : type === "sticky" ? 140 : 132,
      content: defaultContent(type, record),
      linkedRecordId: record?.record_id ?? null,
    };
    onChange({ blocks: [...data.blocks, newBlock] });
    setSelectedId(newBlock.id);
  }

  function removeBlock(id: string) {
    if (!canEdit) return;
    onChange({ blocks: data.blocks.filter((block) => block.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id: string) {
    if (!canEdit) return;
    const block = data.blocks.find((item) => item.id === id);
    if (!block) return;
    const copy: WorkbenchCanvasBlock = {
      ...block,
      id: createId("canvas"),
      x: block.x + 24,
      y: block.y + 24,
    };
    onChange({ blocks: [...data.blocks, copy] });
    setSelectedId(copy.id);
  }

  const canvasShortcutsEnabled = useCallback(() => {
    if (isTypingTarget(document.activeElement)) return false;
    if (!canvasEngagedRef.current && !shellRef.current?.contains(document.activeElement)) {
      return false;
    }
    return true;
  }, []);

  function startPan(event: ReactPointerEvent<HTMLElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    panRef.current = {
      pointerId: event.pointerId,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  function movePan(event: ReactPointerEvent<HTMLElement>) {
    const pan = panRef.current;
    const viewport = viewportRef.current;
    if (!pan || !viewport || pan.pointerId !== event.pointerId) return;
    viewport.scrollLeft = pan.startScrollLeft - (event.clientX - pan.startClientX);
    viewport.scrollTop = pan.startScrollTop - (event.clientY - pan.startClientY);
  }

  function endPan(event: ReactPointerEvent<HTMLElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, block: WorkbenchCanvasBlock) {
    if (!canEdit || isSpacePressed) return;
    if (isBlockInteractionTarget(event.target)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(block.id);
    setDraggingId(block.id);
    const pos = clientToCanvas(event.clientX, event.clientY);
    dragRef.current = {
      id: block.id,
      pointerId: event.pointerId,
      offsetX: pos.x - block.x,
      offsetY: pos.y - block.y,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const pos = clientToCanvas(event.clientX, event.clientY);
    updateBlock(drag.id, {
      x: Math.max(24, Math.round(pos.x - drag.offsetX)),
      y: Math.max(48, Math.round(pos.y - drag.offsetY)),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDraggingId(null);
  }

  function startResize(event: ReactPointerEvent<HTMLElement>, block: WorkbenchCanvasBlock) {
    if (!canEdit) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(block.id);
    setResizingId(block.id);
    const pos = clientToCanvas(event.clientX, event.clientY);
    resizeRef.current = {
      id: block.id,
      pointerId: event.pointerId,
      startWidth: block.width,
      startHeight: block.height,
      startCanvasX: pos.x,
      startCanvasY: pos.y,
    };
  }

  function moveResize(event: ReactPointerEvent<HTMLElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const pos = clientToCanvas(event.clientX, event.clientY);
    updateBlock(resize.id, {
      width: Math.max(MIN_BLOCK_WIDTH, Math.round(resize.startWidth + (pos.x - resize.startCanvasX))),
      height: Math.max(MIN_BLOCK_HEIGHT, Math.round(resize.startHeight + (pos.y - resize.startCanvasY))),
    });
  }

  function endResize(event: ReactPointerEvent<HTMLElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    setResizingId(null);
  }

  function handleViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    canvasEngagedRef.current = true;
    const target = event.target as HTMLElement;
    if (target.closest(".workbench-note-canvas-block")) return;

    if (isSpacePressed) {
      event.preventDefault();
      startPan(event);
      return;
    }

    setSelectedId(null);
  }

  function handleBlockDoubleClick(event: ReactMouseEvent<HTMLElement>, block: WorkbenchCanvasBlock) {
    if (!EDITABLE_BLOCK_TYPES.has(block.type)) return;
    const textarea = event.currentTarget.querySelector("textarea");
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.focus();
      textarea.select();
    }
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) return;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        setZoom((value) => clampZoom(value + direction * ZOOM_STEP));
        return;
      }

      if (event.shiftKey) {
        event.preventDefault();
        viewport.scrollLeft += event.deltaY;
      }
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        if (isTypingTarget(event.target)) return;
        if (!shellRef.current?.contains(document.activeElement) && !canvasEngagedRef.current) return;
        event.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (!canvasShortcutsEnabled()) return;

      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && canEdit) {
        event.preventDefault();
        removeBlock(selectedId);
        return;
      }

      if (mod && event.key.toLowerCase() === "d" && selectedId && canEdit) {
        event.preventDefault();
        duplicateBlock(selectedId);
        return;
      }

      if (mod && event.key === "0") {
        event.preventDefault();
        setZoom(100);
        return;
      }

      if (mod && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        setZoom((value) => clampZoom(value + ZOOM_STEP));
        return;
      }

      if (mod && event.key === "-") {
        event.preventDefault();
        setZoom((value) => clampZoom(value - ZOOM_STEP));
        return;
      }

      if (!mod && event.key.toLowerCase() === "s" && canEdit) {
        event.preventDefault();
        addBlock("sticky");
        return;
      }

      if (!mod && event.key.toLowerCase() === "t" && canEdit) {
        event.preventDefault();
        addBlock("text");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
        if (panRef.current) {
          panRef.current = null;
          setIsPanning(false);
        }
      }
    };

    const onBlur = () => {
      canvasEngagedRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [canvasShortcutsEnabled, selectedId, canEdit]);

  function linkedRecordMeta(recordId: string | null | undefined) {
    if (!recordId) return null;
    const record = linkableRecords.find((item) => item.record_id === recordId);
    if (!record) return null;
    const parts = [record.source_type, record.project_id ? "Linked project" : null].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Archive record";
  }

  function renderBlockContent(block: WorkbenchCanvasBlock) {
    if (block.type === "archiveRecord") {
      const meta = linkedRecordMeta(block.linkedRecordId);
      return (
        <>
          <span className="workbench-note-canvas-source-badge">Source</span>
          {canEdit ? (
            <select
              className="workbench-note-canvas-source-select"
              value={block.linkedRecordId ?? ""}
              disabled={!canEdit}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => {
                const record = linkableRecords.find((item) => item.record_id === event.target.value);
                updateBlock(block.id, {
                  linkedRecordId: event.target.value || null,
                  content: record?.title ?? block.content,
                });
              }}
            >
              <option value="">Choose a record…</option>
              {linkableRecords.map((record) => (
                <option key={record.record_id} value={record.record_id}>
                  {record.title}
                </option>
              ))}
            </select>
          ) : null}
          <p className="workbench-note-canvas-source-title">{block.content || "Untitled source"}</p>
          {meta ? <p className="workbench-note-canvas-source-meta">{meta}</p> : null}
        </>
      );
    }

    if (block.type === "imagePlaceholder") {
      return (
        <>
          <span className="workbench-note-canvas-image-label">Image placeholder</span>
          <p className="workbench-note-canvas-image-hint">Add image</p>
          <textarea
            className="workbench-note-canvas-block-input"
            value={block.content}
            readOnly={!canEdit}
            placeholder="Caption or notes"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => updateBlock(block.id, { content: event.target.value })}
            onFocus={() => setSelectedId(block.id)}
          />
        </>
      );
    }

    return (
      <textarea
        className="workbench-note-canvas-block-input"
        value={block.content}
        readOnly={!canEdit}
        placeholder={
          block.type === "sticky"
            ? "Working thought…"
            : block.type === "quote"
              ? "Quote or interpretive note"
              : "Text block"
        }
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => updateBlock(block.id, { content: event.target.value })}
        onFocus={() => setSelectedId(block.id)}
      />
    );
  }

  const viewportClassName = [
    "workbench-note-canvas-viewport",
    isSpacePressed ? "is-space-panning" : "",
    isPanning ? "is-panning" : "",
    draggingId ? "is-block-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={shellRef}
      className="workbench-note-canvas workbench-note-canvas-shell"
      aria-label="Canvas mode"
      onPointerDown={() => {
        canvasEngagedRef.current = true;
      }}
    >
      <div className="workbench-note-canvas-toolbar">
        <div className="workbench-note-canvas-add-tools">
          <span className="workbench-note-canvas-toolbar-label">Add</span>
          <button type="button" onClick={() => addBlock("text")} disabled={!canEdit}>
            Text
          </button>
          <button type="button" onClick={() => addBlock("sticky")} disabled={!canEdit}>
            Sticky
          </button>
          <button type="button" onClick={() => addBlock("archiveRecord")} disabled={!canEdit}>
            Source card
          </button>
          <button type="button" onClick={() => addBlock("imagePlaceholder")} disabled={!canEdit}>
            Image
          </button>
        </div>
        <div className="workbench-note-canvas-zoom-controls" aria-label="Canvas zoom">
          {ZOOM_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              className={zoom === value ? "is-active" : undefined}
              onClick={() => setZoom(value)}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      <div
        ref={viewportRef}
        className={viewportClassName}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="workbench-note-canvas-grid" style={{ transform: `scale(${zoom / 100})` }}>
          {sortedBlocks.length ? (
            sortedBlocks.map((block) => (
              <article
                key={block.id}
                className={blockClassName(block, selectedId, draggingId, resizingId)}
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.width,
                  minHeight: block.height,
                  height: block.height,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  if (!isSpacePressed) startDrag(event, block);
                }}
                onPointerMove={(event) => {
                  moveDrag(event);
                  moveResize(event);
                }}
                onPointerUp={(event) => {
                  endDrag(event);
                  endResize(event);
                }}
                onPointerCancel={(event) => {
                  endDrag(event);
                  endResize(event);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(block.id);
                }}
                onDoubleClick={(event) => handleBlockDoubleClick(event, block)}
              >
                <div
                  className="workbench-note-canvas-block-toolbar"
                  aria-label={`${BLOCK_LABELS[block.type]} actions`}
                >
                  <div
                    className="workbench-note-canvas-block-actions"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onSendToDocument(blockHtml(block))}
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => duplicateBlock(block.id)}
                      disabled={!canEdit}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => removeBlock(block.id)}
                      disabled={!canEdit}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="workbench-note-canvas-block-content">
                  <span className="workbench-note-canvas-block-label">{BLOCK_LABELS[block.type]}</span>
                  {renderBlockContent(block)}
                </div>

                <span
                  className="workbench-note-canvas-resize-handle"
                  aria-hidden="true"
                  onPointerDown={(event) => startResize(event, block)}
                />
              </article>
            ))
          ) : (
            <div className="workbench-note-canvas-empty">
              <strong>Start mapping your research</strong>
              <p>Add a sticky, text block, source card, or image placeholder.</p>
              <div className="workbench-note-canvas-empty-actions">
                <button type="button" onClick={() => addBlock("sticky")} disabled={!canEdit}>
                  Add sticky
                </button>
                <button type="button" onClick={() => addBlock("archiveRecord")} disabled={!canEdit}>
                  Add source card
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
