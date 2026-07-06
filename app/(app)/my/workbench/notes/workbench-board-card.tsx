"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import {
  computeBoardResearchBadges,
  isBoardTypingTarget,
  type BoardResearchBadge,
} from "./workbench-board-utils";
import type { BoardCardColour, BoardWorkflowStatus, WorkbenchBoardCard } from "./workbench-board-types";
import { normalizeCardType } from "./WorkbenchNoteBoard";

const BOARD_COLOURS: BoardCardColour[] = ["lemon", "pink", "blue", "green", "lavender", "cream", "white"];

const WORKFLOW_OPTIONS: { value: BoardWorkflowStatus; label: string }[] = [
  { value: "collecting", label: "Collecting" },
  { value: "reviewing", label: "Reviewing" },
  { value: "ready", label: "Ready" },
  { value: "used", label: "Used" },
];

const BADGE_LABELS: Record<BoardResearchBadge, string> = {
  "needs-citation": "Needs citation",
  "missing-alt": "Missing alt",
  unsorted: "Unsorted",
  "ready-for-writing": "Ready to write",
  "used-in-document": "In document",
  "from-bookmark": "Bookmark",
  "from-reading-list": "Reading list",
  "has-image": "Has image",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function uploadBoardImage(file: File, noteId: string | null) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Unsupported file type. Use PNG, JPG, GIF, or WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller.");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("noteId", noteId || "temp");
  const res = await fetch("/api/workbench/notes/upload-image", { method: "POST", body: form });
  const data = (await res.json()) as { url?: string; error?: string; details?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || data.details || "Could not upload image.");
  }
  return data.url;
}

function normalizeWorkflow(card: WorkbenchBoardCard): BoardWorkflowStatus {
  if (
    card.workflowStatus === "collecting" ||
    card.workflowStatus === "reviewing" ||
    card.workflowStatus === "ready" ||
    card.workflowStatus === "used"
  ) {
    return card.workflowStatus;
  }
  if (card.column === "reviewing") return "reviewing";
  if (card.column === "ready") return "ready";
  return "collecting";
}

function workflowLabel(status: BoardWorkflowStatus) {
  return WORKFLOW_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function BoardCardImage({
  card,
  canEdit,
  isEditing,
  noteId,
  onImageChange,
  onError,
}: {
  card: WorkbenchBoardCard;
  canEdit: boolean;
  isEditing: boolean;
  noteId: string | null;
  onImageChange: (patch: Partial<WorkbenchBoardCard>) => void;
  onError: (message: string) => void;
}) {
  const [broken, setBroken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const url = card.imageUrl?.trim();

  useEffect(() => {
    setBroken(false);
  }, [url]);

  const applyFile = useCallback(
    async (file: File) => {
      if (!canEdit) return;
      setUploading(true);
      try {
        const uploadedUrl = await uploadBoardImage(file, noteId);
        onImageChange({ imageUrl: uploadedUrl, imagePath: undefined });
      } catch (error) {
        onError(error instanceof Error ? error.message : "Could not upload image.");
      } finally {
        setUploading(false);
      }
    },
    [canEdit, noteId, onImageChange, onError],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!canEdit || !isEditing || isBoardTypingTarget(event.target)) return;
      const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void applyFile(file);
        return;
      }
      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        event.preventDefault();
        onImageChange({ imageUrl: text });
      }
    },
    [applyFile, canEdit, isEditing, onImageChange],
  );

  if (!url || broken) {
    return (
      <div
        className={`workbench-note-board-image-placeholder${dragOver ? " is-drag-over" : ""}${
          isEditing ? "" : " is-compact"
        }`}
        onDragOver={(event: DragEvent) => {
          if (!canEdit || !isEditing) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event: DragEvent) => {
          if (!canEdit || !isEditing) return;
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void applyFile(file);
        }}
        onPaste={handlePaste}
      >
        <span>{broken ? "Image unavailable" : uploading ? "Uploading…" : "No image yet"}</span>
        {isEditing ? (
          <>
            <small>{broken ? "Check image URL" : "Upload or paste an image URL in edit mode"}</small>
            {canEdit ? (
              <div className="workbench-note-board-image-placeholder-actions">
                <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  Upload image
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="workbench-note-board-file-input"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void applyFile(file);
            event.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="workbench-note-board-image-preview" onPaste={isEditing ? handlePaste : undefined}>
      <img
        className="workbench-note-board-card-image"
        src={url}
        alt={card.imageAlt || card.title || "Board image"}
        loading="lazy"
        onError={() => setBroken(true)}
      />
      {isEditing && canEdit ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="workbench-note-board-file-input"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void applyFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="workbench-note-board-inline-button"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Change image
          </button>
        </>
      ) : null}
    </div>
  );
}

function ColourSwatches({
  value,
  disabled,
  onChange,
}: {
  value: BoardCardColour;
  disabled: boolean;
  onChange: (colour: BoardCardColour) => void;
}) {
  return (
    <div className="workbench-note-board-colour-swatches" role="group" aria-label="Card colour">
      {BOARD_COLOURS.map((colour) => (
        <button
          key={colour}
          type="button"
          className={`is-${colour}${value === colour ? " is-active" : ""}`}
          disabled={disabled}
          aria-label={colour}
          aria-pressed={value === colour}
          onClick={(event) => {
            event.stopPropagation();
            onChange(colour);
          }}
        />
      ))}
    </div>
  );
}

export type BoardCardAction = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
};

export function WorkbenchBoardCardView({
  card,
  canEdit,
  isEditing,
  isSelected,
  isDragging,
  isDropBefore,
  linkableRecords,
  noteId,
  actions,
  onSelect,
  onEnterEdit,
  onExitEdit,
  onUpdate,
  onDragHandlePointerDown,
  onError,
  style,
}: {
  card: WorkbenchBoardCard;
  canEdit: boolean;
  isEditing: boolean;
  isSelected: boolean;
  isDragging: boolean;
  isDropBefore: boolean;
  linkableRecords: WorkbenchLinkableRecord[];
  noteId: string | null;
  actions: BoardCardAction[];
  onSelect: () => void;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onUpdate: (patch: Partial<WorkbenchBoardCard>) => void;
  onDragHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onError: (message: string) => void;
  style?: CSSProperties;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const type = normalizeCardType(card.type);
  const colour = card.colour ?? "white";
  const workflow = normalizeWorkflow(card);
  const badges = computeBoardResearchBadges(card);
  const record = card.linkedRecordId
    ? linkableRecords.find((item) => item.record_id === card.linkedRecordId)
    : null;
  const metaLine = [record?.source_type, card.tag].filter(Boolean).join(" · ");

  useEffect(() => {
    if (!isEditing) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onExitEdit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing, onExitEdit]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (isEditing) setMenuOpen(false);
  }, [isEditing]);

  const className = [
    "workbench-note-board-card",
    `workbench-note-board-card-type-${type === "image" ? "image" : type}`,
    `is-${type === "image" ? "image" : type}`,
    `is-${colour}`,
    isSelected ? "is-selected" : "",
    isEditing ? "is-editing" : "is-view",
    isDragging ? "is-dragging" : "",
    isDropBefore ? "is-drop-before" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {isDropBefore ? <div className="workbench-note-board-drop-indicator" aria-hidden /> : null}
      <article
        data-board-card-id={card.id}
        data-card-type={type}
        className={className}
        style={style}
        onClick={onSelect}
        onDoubleClick={(event) => {
          if (!canEdit) return;
          if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
          onEnterEdit();
        }}
      >
        <div className="workbench-note-board-card-top">
          <button
            type="button"
            className="workbench-note-board-card-drag-handle"
            aria-label={canEdit ? "Drag to move card" : "Move disabled"}
            disabled={!canEdit}
            onPointerDown={onDragHandlePointerDown}
            onClick={(event) => event.stopPropagation()}
          >
            ⋮⋮
          </button>
          <div className="workbench-note-board-card-header">
            <span className="workbench-note-board-card-type">{type}</span>
            {isEditing && canEdit ? (
              <select
                className="workbench-note-board-workflow-select"
                value={workflow}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) =>
                  onUpdate({
                    workflowStatus: event.target.value as BoardWorkflowStatus,
                    column:
                      event.target.value === "reviewing"
                        ? "reviewing"
                        : event.target.value === "ready" || event.target.value === "used"
                          ? "ready"
                          : "collecting",
                  })
                }
              >
                {WORKFLOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="workbench-note-board-workflow-chip">{workflowLabel(workflow)}</span>
            )}
          </div>
          <div className="workbench-note-board-card-menu" ref={menuRef}>
            <button
              type="button"
              className="workbench-note-board-card-menu-trigger"
              aria-label="Card actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <span className="workbench-note-board-menu-icon" aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div
                className="workbench-note-board-card-menu-panel"
                role="menu"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    role="menuitem"
                    className={[
                      "workbench-note-board-card-menu-item",
                      action.primary ? "is-primary" : "",
                      action.id === "delete" ? "workbench-note-board-card-menu-item-danger is-danger" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={action.disabled}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      action.onClick();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {type === "source" ? (
          <span className="workbench-note-board-source-badge">
            {card.sourceOrigin === "bookmark"
              ? "Bookmark"
              : card.sourceOrigin === "reading_list"
                ? "Reading list"
                : "Archive source"}
          </span>
        ) : null}

        {badges.length ? (
          <div className="workbench-note-board-research-badges" aria-label="Research state">
            {badges.map((badge) => (
              <span key={badge} className={`is-${badge}`}>
                {BADGE_LABELS[badge]}
              </span>
            ))}
          </div>
        ) : null}

        {type === "image" ? (
          <BoardCardImage
            card={card}
            canEdit={canEdit}
            isEditing={isEditing}
            noteId={noteId}
            onImageChange={(patch) => onUpdate(patch)}
            onError={onError}
          />
        ) : null}

        {isEditing ? (
          <>
            <input
              className="workbench-note-board-card-title"
              value={card.title}
              readOnly={!canEdit}
              placeholder={type === "image" ? "Caption" : "Title"}
              onChange={(event) => onUpdate({ title: event.target.value })}
              onClick={(event) => event.stopPropagation()}
              onFocus={onEnterEdit}
            />
            {type === "source" ? (
              <label className="workbench-note-board-field">
                <span>Linked record</span>
                <select
                  value={card.linkedRecordId ?? ""}
                  disabled={!canEdit}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const next = linkableRecords.find((item) => item.record_id === event.target.value);
                    onUpdate({
                      linkedRecordId: event.target.value || null,
                      title: next?.title ?? card.title,
                    });
                  }}
                >
                  <option value="">Choose a record…</option>
                  {linkableRecords.map((item) => (
                    <option key={item.record_id} value={item.record_id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {type === "link" ? (
              <label className="workbench-note-board-field">
                <span>Link URL</span>
                <input
                  type="url"
                  value={card.linkUrl ?? ""}
                  readOnly={!canEdit}
                  placeholder="https://"
                  onChange={(event) => onUpdate({ linkUrl: event.target.value })}
                  onClick={(event) => event.stopPropagation()}
                />
              </label>
            ) : null}
            {type === "image" ? (
              <>
                <label className="workbench-note-board-field">
                  <span>Image URL</span>
                  <input
                    type="url"
                    value={card.imageUrl ?? ""}
                    readOnly={!canEdit}
                    placeholder="https://example.com/image.jpg"
                    onChange={(event) => onUpdate({ imageUrl: event.target.value })}
                    onClick={(event) => event.stopPropagation()}
                  />
                </label>
                <label className="workbench-note-board-field">
                  <span>Alt text</span>
                  <input
                    type="text"
                    value={card.imageAlt ?? ""}
                    readOnly={!canEdit}
                    placeholder="Describe the image"
                    onChange={(event) => onUpdate({ imageAlt: event.target.value })}
                    onClick={(event) => event.stopPropagation()}
                  />
                </label>
              </>
            ) : null}
            {type === "task" ? (
              <label className="workbench-note-board-task-row">
                <input
                  type="checkbox"
                  checked={Boolean(card.taskDone)}
                  disabled={!canEdit}
                  onChange={(event) => onUpdate({ taskDone: event.target.checked })}
                  onClick={(event) => event.stopPropagation()}
                />
                <span>Mark complete</span>
              </label>
            ) : null}
            <textarea
              className={`workbench-note-board-card-body${type === "quote" ? " is-quote-body" : ""}`}
              value={card.body}
              readOnly={!canEdit}
              placeholder={
                type === "quote"
                  ? "Paste your quote…"
                  : type === "question"
                    ? "What are you wondering?"
                    : type === "image"
                      ? "Caption"
                      : "Write your note…"
              }
              onChange={(event) => onUpdate({ body: event.target.value })}
              onClick={(event) => event.stopPropagation()}
              onFocus={onEnterEdit}
            />
            {canEdit ? (
              <ColourSwatches
                value={colour}
                disabled={!canEdit}
                onChange={(nextColour) => onUpdate({ colour: nextColour })}
              />
            ) : null}
          </>
        ) : (
          <>
            {type !== "image" ? (
              <h3 className="workbench-note-board-card-title-preview">{card.title || "Untitled"}</h3>
            ) : card.title ? (
              <p className="workbench-note-board-card-caption-preview">{card.title}</p>
            ) : null}
            {metaLine ? <p className="workbench-note-board-card-meta-line">{metaLine}</p> : null}
            {type === "question" ? (
              <p className="workbench-note-board-question-label">Open question</p>
            ) : null}
            {type === "task" ? (
              <p className="workbench-note-board-task-preview">
                {card.taskDone ? "☑ Complete" : "☐ To do"}
              </p>
            ) : null}
            {card.body?.trim() ? (
              <p
                className={`workbench-note-board-card-body-preview${
                  type === "quote" ? " is-quote-body" : ""
                }`}
              >
                {card.body}
              </p>
            ) : null}
            {type === "link" && card.linkUrl?.trim() ? (
              <p className="workbench-note-board-card-link-preview">{card.linkUrl}</p>
            ) : null}
          </>
        )}
      </article>
    </>
  );
}
