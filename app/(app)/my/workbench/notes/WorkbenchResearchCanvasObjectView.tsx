"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  Frame,
  Globe,
  ImageIcon,
  Link2,
  ListTodo,
  MessageSquare,
  MoreVertical,
  Quote,
  StickyNote,
  Type,
} from "lucide-react";
import type { CanvasObject, CanvasSourceOrigin } from "./workbench-canvas-types";
import {
  WorkbenchCanvasObjectMenu,
  type CanvasObjectMenuAnchor,
} from "./WorkbenchCanvasObjectMenu";
import { linkHostname, ObjectCardShell } from "./workbench-canvas-object-card";
import { WorkbenchResearchCanvasShapeView } from "./WorkbenchResearchCanvasShapeView";

function sourceOriginLabel(origin?: CanvasSourceOrigin) {
  switch (origin) {
    case "bookmark":
      return "Bookmark";
    case "reading_list":
      return "Reading list";
    case "archive":
      return "Archive source";
    default:
      return "Source";
  }
}

function isShapeMinimal(obj: CanvasObject) {
  return obj.type === "shape" && !obj.body.trim() && !obj.title.trim();
}

export type WorkbenchResearchCanvasObjectViewProps = {
  obj: CanvasObject;
  selected: boolean;
  hovered: boolean;
  dragging: boolean;
  dimmed?: boolean;
  connectorDraftSource: boolean;
  canEdit: boolean;
  lockHeldBy?: string | null;
  onSelect: () => void;
  onStartDrag: (event: ReactPointerEvent<HTMLElement>, obj: CanvasObject) => void;
  onUpdate: (id: string, patch: Partial<CanvasObject>) => void;
  onOpenRecord?: (recordId: string) => void;
  onCiteRecord?: (recordId: string) => void;
  onInspect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onLayerForward: () => void;
  onLayerBackward: () => void;
  onSendToDocument?: () => void;
  onReplaceImage?: () => void;
};

export function WorkbenchResearchCanvasObjectView({
  obj,
  selected,
  hovered,
  dragging,
  dimmed = false,
  connectorDraftSource,
  canEdit,
  lockHeldBy = null,
  onSelect,
  onStartDrag,
  onUpdate,
  onOpenRecord,
  onCiteRecord,
  onInspect,
  onDuplicate,
  onDelete,
  onToggleLock,
  onLayerForward,
  onLayerBackward,
  onSendToDocument,
  onReplaceImage,
}: WorkbenchResearchCanvasObjectViewProps) {
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<CanvasObjectMenuAnchor | null>(null);

  const openMenu = (anchor: CanvasObjectMenuAnchor) => {
    onSelect();
    setMenuAnchor(anchor);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuAnchor(null);
  };

  const shapeMinimal = isShapeMinimal(obj);
  const isHeadingText = obj.type === "text" && obj.textSize >= 20;

  const inlineStyle: React.CSSProperties = {
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    zIndex: obj.zIndex,
    opacity: dimmed ? 0.38 : obj.opacity,
    borderRadius: obj.cornerRadius,
  };

  const stickyHasCustomFill =
    obj.type === "sticky" &&
    Boolean(obj.fill) &&
    obj.fill !== "#f7fbe8" &&
    obj.fill !== "#ffffff";

  if (obj.type === "sticky") {
    if (obj.fill) inlineStyle.background = obj.fill;
    inlineStyle.borderColor = "rgba(47, 45, 56, 0.12)";
  } else if (obj.type === "frame") {
    inlineStyle.background = obj.fill || "rgba(255, 255, 255, 0.55)";
    inlineStyle.borderColor = obj.stroke || "rgba(47, 45, 56, 0.14)";
  }

  return (
    <article
      className={[
        "workbench-research-canvas-object",
        lockHeldBy ? "is-peer-locked" : "",
        `is-type-${obj.type}`,
        obj.type === "sticky" ? "is-sticky" : "",
        stickyHasCustomFill ? "has-custom-fill" : "",
        obj.type === "frame" ? "is-frame" : "",
        obj.type === "shape" ? "is-shape" : "",
        obj.type === "shape" && obj.shapeType
          ? `is-shape-${obj.shapeType}`
          : obj.type === "shape"
            ? "is-shape-roundedRectangle"
            : "",
        obj.type === "image" ? "is-image-card" : "",
        obj.type === "source" ? "is-source-card" : "",
        obj.type === "quote" ? "is-quote-card" : "",
        obj.type === "task" ? "is-task-card" : "",
        obj.type === "link" ? "is-link-card" : "",
        obj.type === "comment" ? "is-comment-card" : "",
        obj.type === "question" ? "is-question-card" : "",
        obj.type === "citation" ? "is-citation-card" : "",
        ["text", "sticky", "question", "comment", "citation"].includes(obj.type)
          ? "is-note-card"
          : "",
        isHeadingText ? "is-heading-text" : "",
        shapeMinimal ? "is-shape-minimal" : "",
        selected ? "is-selected" : "",
        hovered && !selected ? "is-hovered" : "",
        connectorDraftSource ? "is-connector-draft" : "",
        dragging ? "is-dragging" : "",
        dimmed ? "is-search-dimmed" : "",
        obj.locked ? "is-locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={inlineStyle}
      onPointerDown={(e) => {
        if (obj.locked || !canEdit || lockHeldBy) return;
        onStartDrag(e, obj);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenu({ type: "pointer", x: e.clientX, y: e.clientY });
      }}
    >
      {lockHeldBy ? (
        <span className="workbench-canvas-object-lock-badge" title={`Editing: ${lockHeldBy}`}>
          {lockHeldBy}
        </span>
      ) : null}
      <div className="workbench-research-canvas-object-menu">
        <button
          ref={menuTriggerRef}
          type="button"
          className="workbench-research-canvas-object-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Card actions"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = menuTriggerRef.current?.getBoundingClientRect();
            if (rect) openMenu({ type: "button", rect });
            else setMenuOpen((open) => !open);
          }}
        >
          <MoreVertical size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <WorkbenchCanvasObjectMenu
        obj={obj}
        open={menuOpen}
        anchor={menuAnchor}
        canEdit={canEdit}
        onClose={closeMenu}
        onInspect={() => {
          onInspect();
          closeMenu();
        }}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onToggleLock={onToggleLock}
        onLayerForward={onLayerForward}
        onLayerBackward={onLayerBackward}
        onSendToDocument={onSendToDocument}
        onOpenRecord={
          obj.linkedRecordId && onOpenRecord
            ? () => onOpenRecord(obj.linkedRecordId!)
            : undefined
        }
        onCite={
          obj.linkedRecordId && onCiteRecord
            ? () => onCiteRecord(obj.linkedRecordId!)
            : undefined
        }
        onReplaceImage={obj.type === "image" ? onReplaceImage : undefined}
      />
      {obj.type === "frame" ? (
        <ObjectCardShell
          typeLabel="Section"
          accent="frame"
          icon={<Frame size={15} strokeWidth={1.75} aria-hidden />}
        >
          <input
            className="workbench-research-canvas-object-card__title"
            value={obj.title}
            placeholder="Section title"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          <textarea
            className="workbench-research-canvas-object-card__text is-muted"
            value={obj.body}
            placeholder="Optional description"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "source" ? (
        <ObjectCardShell
          typeLabel={sourceOriginLabel(obj.sourceOrigin)}
          accent="source"
          icon={<BookOpen size={15} strokeWidth={1.75} aria-hidden />}
        >
          <input
            className="workbench-research-canvas-object-card__title"
            value={obj.title}
            placeholder="Source title"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          {(obj.creator || obj.date || obj.sourceLabel) && (
            <p className="workbench-research-canvas-object-card__meta">
              {[obj.creator, obj.date, obj.sourceLabel].filter(Boolean).join(" · ")}
            </p>
          )}
          <textarea
            className="workbench-research-canvas-object-card__text"
            value={obj.body}
            placeholder="Notes about this source"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
          {obj.linkedRecordId ? (
            <div className="workbench-research-canvas-object-card__actions">
              <button
                type="button"
                className="workbench-research-canvas-object-chip-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRecord?.(obj.linkedRecordId!);
                }}
              >
                <ExternalLink size={12} aria-hidden />
                Open
              </button>
              <button
                type="button"
                className="workbench-research-canvas-object-chip-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onCiteRecord?.(obj.linkedRecordId!);
                }}
              >
                Cite
              </button>
            </div>
          ) : null}
        </ObjectCardShell>
      ) : null}

      {obj.type === "quote" ? (
        <ObjectCardShell
          typeLabel="Quote"
          accent="quote"
          icon={<Quote size={15} strokeWidth={1.75} aria-hidden />}
        >
          <textarea
            className="workbench-research-canvas-object-card__text is-quote"
            value={obj.body}
            placeholder="Quotation text"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
          <input
            className="workbench-research-canvas-object-card__field is-subtle"
            value={obj.title}
            placeholder="Attribution or source line"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "image" ? (
        <div className="workbench-research-canvas-object-image-card">
          <div className="workbench-research-canvas-object-image-stage">
            {obj.imageUrl ? (
              <img
                src={obj.imageUrl}
                alt={obj.imageAlt || obj.title || "Canvas image"}
                className={`workbench-research-canvas-object-image${
                  obj.imageFit === "contain" ? " is-contain" : ""
                }`}
              />
            ) : (
              <div className="workbench-research-canvas-object-image-placeholder">
                <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
                <span>Drop or add image</span>
                <p>Use toolbar or inspector</p>
              </div>
            )}
          </div>
          <div className="workbench-research-canvas-object-image-footer">
            <ImageIcon size={14} strokeWidth={1.75} aria-hidden />
            <input
              className="workbench-research-canvas-object-image-caption"
              value={obj.imageCaption || obj.title}
              placeholder="Caption"
              readOnly={!canEdit}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) =>
                onUpdate(obj.id, { imageCaption: e.target.value, title: e.target.value })
              }
            />
          </div>
        </div>
      ) : null}

      {obj.type === "task" ? (
        <ObjectCardShell
          typeLabel="Task"
          accent="task"
          icon={<ListTodo size={15} strokeWidth={1.75} aria-hidden />}
          headExtra={
            <label className="workbench-research-canvas-object-task-check">
              <input
                type="checkbox"
                checked={obj.workflowStatus === "done"}
                disabled={!canEdit}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onUpdate(obj.id, {
                    workflowStatus: e.target.checked ? "done" : "open",
                  })
                }
              />
            </label>
          }
        >
          <input
            className={`workbench-research-canvas-object-card__title${
              obj.workflowStatus === "done" ? " is-done" : ""
            }`}
            value={obj.title}
            placeholder="Task title"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          <textarea
            className="workbench-research-canvas-object-card__text is-muted"
            value={obj.body}
            placeholder="Details or next step"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "link" ? (
        <ObjectCardShell
          typeLabel="Link"
          accent="link"
          icon={<Link2 size={15} strokeWidth={1.75} aria-hidden />}
        >
          <input
            className="workbench-research-canvas-object-card__title"
            value={obj.title}
            placeholder="Display name"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          <div className="workbench-research-canvas-object-link-url-row">
            <Globe size={14} strokeWidth={1.75} aria-hidden />
            <input
              className="workbench-research-canvas-object-card__field is-mono"
              value={obj.body}
              placeholder="https://example.com"
              readOnly={!canEdit}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
            />
          </div>
          {linkHostname(obj.body) ? (
            <p className="workbench-research-canvas-object-card__meta is-link-host">
              {linkHostname(obj.body)}
            </p>
          ) : null}
        </ObjectCardShell>
      ) : null}

      {obj.type === "shape" ? (
        <WorkbenchResearchCanvasShapeView
          obj={obj}
          canEdit={canEdit}
          showLabel={!shapeMinimal}
          onTitleChange={(value) => onUpdate(obj.id, { title: value })}
        />
      ) : null}

      {obj.type === "text" ? (
        <ObjectCardShell
          typeLabel="Text"
          accent="text"
          icon={<Type size={15} strokeWidth={1.75} aria-hidden />}
          className={isHeadingText ? "is-heading" : ""}
        >
          {(obj.title || isHeadingText) && (
            <input
              className={`workbench-research-canvas-object-card__title${
                isHeadingText ? " is-display" : ""
              }`}
              value={obj.title}
              placeholder="Heading"
              readOnly={!canEdit}
              style={{ fontSize: obj.textSize, textAlign: obj.textAlign }}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
            />
          )}
          <textarea
            className="workbench-research-canvas-object-card__text"
            value={obj.body}
            placeholder="Write here…"
            readOnly={!canEdit}
            style={{ fontSize: Math.max(13, obj.textSize - 2), textAlign: obj.textAlign }}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "sticky" ? (
        <ObjectCardShell
          typeLabel="Sticky"
          accent="sticky"
          className="is-sticky-note"
          icon={<StickyNote size={15} strokeWidth={1.75} aria-hidden />}
        >
          <input
            className="workbench-research-canvas-object-card__title"
            value={obj.title}
            placeholder="Label"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          <textarea
            className="workbench-research-canvas-object-card__text"
            value={obj.body}
            placeholder="Capture a thought…"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "question" ? (
        <ObjectCardShell
          typeLabel="Question"
          accent="question"
          icon={<CircleHelp size={15} strokeWidth={1.75} aria-hidden />}
        >
          <input
            className="workbench-research-canvas-object-card__title"
            value={obj.title}
            placeholder="Research question"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          <textarea
            className="workbench-research-canvas-object-card__text"
            value={obj.body}
            placeholder="What do we need to find out?"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "comment" ? (
        <ObjectCardShell
          typeLabel="Comment"
          accent="comment"
          icon={<MessageSquare size={15} strokeWidth={1.75} aria-hidden />}
        >
          <textarea
            className="workbench-research-canvas-object-card__text"
            value={obj.body}
            placeholder="Annotation or reviewer note"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

      {obj.type === "citation" ? (
        <ObjectCardShell
          typeLabel="Citation"
          accent="citation"
          icon={<BookOpen size={15} strokeWidth={1.75} aria-hidden />}
        >
          <input
            className="workbench-research-canvas-object-card__title"
            value={obj.title}
            placeholder="Source title"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          />
          <textarea
            className="workbench-research-canvas-object-card__text is-mono"
            value={obj.body}
            placeholder="In-text or endnote text"
            readOnly={!canEdit}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(obj.id, { body: e.target.value })}
          />
        </ObjectCardShell>
      ) : null}

    </article>
  );
}
