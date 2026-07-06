"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  MoreVertical,
  Quote as QuoteIcon,
  Send,
  Trash2,
} from "lucide-react";
import type { NoteType, WorkbenchNote, ColumnId } from "./workbench-board-figma-types";
import { resolveBoardImageUpload } from "./workbench-board-image-upload";
import { BOARD_NOTE_TYPE_LABELS } from "./workbench-board-presentation";

interface WorkbenchBoardCardImmersiveProps {
  note: WorkbenchNote;
  onUpdate: (id: string, updates: Partial<WorkbenchNote>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDuplicateAsType?: (targetType: NoteType) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  zoom: number;
  canEdit?: boolean;
  onOpenRecord?: () => void;
  onCite?: () => void;
  onSendToDocument?: () => void;
}

type EditDraft = {
  title: string;
  content: string;
  imageUrl: string;
  imageAlt: string;
  columnId: ColumnId | "";
  linkUrl: string;
  quoteSource: string;
};

function stopPointer(event: React.PointerEvent | React.MouseEvent) {
  event.stopPropagation();
}

function makeDraft(note: WorkbenchNote): EditDraft {
  return {
    title: note.title ?? "",
    content: note.content ?? "",
    imageUrl: note.imageUrl ?? "",
    imageAlt: note.imageAlt ?? "",
    columnId: (note.columnId ?? "") as EditDraft["columnId"],
    linkUrl: note.linkUrl ?? "",
    quoteSource: note.quoteSource ?? "",
  };
}

export function WorkbenchBoardCardImmersive({
  note,
  onUpdate,
  onDelete,
  onDuplicate,
  onDuplicateAsType,
  isSelected,
  onSelect,
  canEdit = true,
  onOpenRecord,
  onCite,
  onSendToDocument,
}: WorkbenchBoardCardImmersiveProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerAnchor, setTypePickerAnchor] = useState<"menu" | "edit" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft>(() => makeDraft(note));
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setTypePickerOpen(false);
    setTypePickerAnchor(null);
  };

  const openTypePicker = (anchor: "menu" | "edit") => {
    setTypePickerAnchor(anchor);
    setTypePickerOpen(true);
    if (anchor === "menu") setMenuOpen(true);
  };

  const closeTypePicker = () => {
    setTypePickerOpen(false);
    setTypePickerAnchor(null);
  };

  const handleMenuAction = (action: () => void) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      action();
    };
  };

  const handleCardClick = () => {
    if (editing) return;
    onSelect(note.id);
  };

  const startEdit = () => {
    setDraft(makeDraft(note));
    setUploadError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = () => {
    const updates: Partial<WorkbenchNote> = {
      title: draft.title,
      content: draft.content,
    };
    // Always allow image fields on every card type per spec
    if (draft.imageUrl !== (note.imageUrl ?? "")) {
      updates.imageUrl = draft.imageUrl || undefined;
    }
    if (draft.imageAlt !== (note.imageAlt ?? "")) {
      updates.imageAlt = draft.imageAlt || undefined;
    }
    if (draft.columnId !== (note.columnId ?? "")) {
      updates.columnId = (draft.columnId || undefined) as ColumnId | undefined;
    }
    if (note.type === "link" && draft.linkUrl !== (note.linkUrl ?? "")) {
      updates.linkUrl = draft.linkUrl || undefined;
    }
    if (note.type === "quote" && draft.quoteSource !== (note.quoteSource ?? "")) {
      updates.quoteSource = draft.quoteSource || undefined;
    }
    onUpdate(note.id, updates);
    setEditing(false);
  };

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setImageUploading(true);
    try {
      const imageUrl = await resolveBoardImageUpload(file, note.id);
      setDraft((d) => ({
        ...d,
        imageUrl,
        imageAlt: d.imageAlt.trim() ? d.imageAlt : file.name,
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not add image.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleDuplicateAsType = (targetType: NoteType) => {
    onDuplicateAsType?.(targetType);
    closeMenu();
    closeTypePicker();
    setEditing(false);
  };

  const noteTypeOptions = (Object.keys(BOARD_NOTE_TYPE_LABELS) as NoteType[]).filter(
    (type) => type !== note.type,
  );

  const renderTypePicker = (onBack?: () => void) => (
    <div
      className="workbench-note-board-card-type-picker"
      role="menu"
      onPointerDown={stopPointer}
      onClick={stopPointer}
    >
      <p className="workbench-note-board-card-type-picker-hint">
        Creates a new card with shared content. The original card is unchanged.
      </p>
      {noteTypeOptions.map((type) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          className="workbench-note-board-card-type-picker-item"
          onClick={handleMenuAction(() => handleDuplicateAsType(type))}
        >
          {BOARD_NOTE_TYPE_LABELS[type]}
        </button>
      ))}
      {onBack ? (
        <button
          type="button"
          className="workbench-note-board-card-type-picker-back"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onBack();
          }}
        >
          Back
        </button>
      ) : null}
    </div>
  );

  const isImageCard = note.type === "image";
  const hasImage = Boolean(note.imageUrl);

  const renderImageBlock = () => {
    if (!hasImage) return null;
    return (
      <div className="workbench-note-board-card-image-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={note.imageUrl as string} alt={note.imageAlt || ""} />
      </div>
    );
  };

  const renderCardContent = () => {
    switch (note.type) {
      case "image":
        return (
          <div className="workbench-note-board-card-image">
            {hasImage ? (
              <>
                <div className="workbench-note-board-card-image-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={note.imageUrl as string} alt={note.imageAlt || ""} />
                </div>
                {!note.imageAlt && (
                  <div className="workbench-note-board-card-badge workbench-note-board-card-badge-warning">
                    Missing alt text
                  </div>
                )}
              </>
            ) : (
              <div className="workbench-note-board-card-image-placeholder">
                <ImageIcon size={32} />
                <p>No image</p>
                {canEdit && (
                  <button
                    type="button"
                    className="workbench-note-board-card-image-empty-cta"
                    onPointerDown={stopPointer}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit();
                    }}
                  >
                    <ImageIcon size={14} />
                    <span>Add image</span>
                  </button>
                )}
              </div>
            )}
            {note.title && <h3 className="workbench-note-board-card-caption">{note.title}</h3>}
            {note.content && <p className="workbench-note-board-card-caption-text">{note.content}</p>}
          </div>
        );

      case "quote":
        return (
          <div className="workbench-note-board-card-quote">
            {renderImageBlock()}
            <blockquote>{note.content || "Empty quote"}</blockquote>
            {note.quoteSource && (
              <cite className="workbench-note-board-card-citation">— {note.quoteSource}</cite>
            )}
            {!note.sourceCitation && (
              <div className="workbench-note-board-card-badge workbench-note-board-card-badge-info">
                Needs citation
              </div>
            )}
          </div>
        );

      case "source":
        return (
          <div className="workbench-note-board-card-source">
            {renderImageBlock()}
            <div className="workbench-note-board-card-badge workbench-note-board-card-badge-archive">
              Archive Source
            </div>
            <h3>{note.title || "Untitled Source"}</h3>
            {note.content && <p className="workbench-note-board-card-meta">{note.content}</p>}
            {note.sourceOrigin && (
              <div className="workbench-note-board-card-origin-badge">
                From {note.sourceOrigin.replace("-", " ")}
              </div>
            )}
            <div className="workbench-note-board-card-actions">
              <button
                type="button"
                className="workbench-note-board-card-action-btn"
                disabled={!onOpenRecord}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRecord?.();
                }}
              >
                Open record
              </button>
              <button
                type="button"
                className="workbench-note-board-card-action-btn"
                disabled={!onCite}
                onClick={(e) => {
                  e.stopPropagation();
                  onCite?.();
                }}
              >
                Cite
              </button>
              <button
                type="button"
                className="workbench-note-board-card-action-btn"
                disabled={!onSendToDocument}
                onClick={(e) => {
                  e.stopPropagation();
                  onSendToDocument?.();
                }}
              >
                Send to document
              </button>
            </div>
          </div>
        );

      case "question":
        return (
          <div className="workbench-note-board-card-question">
            {renderImageBlock()}
            <div className="workbench-note-board-card-badge workbench-note-board-card-badge-research">
              Research Question
            </div>
            <h3>{note.title || "Untitled Question"}</h3>
            {note.content && <p>{note.content}</p>}
          </div>
        );

      case "task":
        return (
          <div className="workbench-note-board-card-task">
            {renderImageBlock()}
            <div className="workbench-note-board-card-task-row">
              <input
                type="checkbox"
                checked={note.taskCompleted || false}
                disabled={!canEdit}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdate(note.id, { taskCompleted: e.target.checked });
                }}
                className="workbench-note-board-card-checkbox"
              />
              <div className="workbench-note-board-card-task-content">
                <h3>{note.title || "Untitled Task"}</h3>
                {note.content && <p>{note.content}</p>}
              </div>
            </div>
          </div>
        );

      case "link":
        return (
          <div className="workbench-note-board-card-link">
            {renderImageBlock()}
            <LinkIcon size={20} className="workbench-note-board-card-link-icon" />
            <h3>{note.title || "Untitled Link"}</h3>
            {note.linkUrl && (
              <a
                href={note.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="workbench-note-board-card-link-url"
                onClick={(e) => e.stopPropagation()}
              >
                {note.linkUrl}
              </a>
            )}
            {note.content && <p>{note.content}</p>}
          </div>
        );

      case "note":
      default:
        return (
          <div className="workbench-note-board-card-note">
            {renderImageBlock()}
            {note.title && <h3>{note.title}</h3>}
            {note.content && <p>{note.content}</p>}
            {!note.title && !note.content && !hasImage && (
              <p className="workbench-note-board-card-empty">Empty note</p>
            )}
          </div>
        );
    }
  };

  const renderEditPanel = () => (
    <div
      ref={editRef}
      className="workbench-note-board-card-edit"
      onPointerDown={stopPointer}
      onClick={stopPointer}
      onMouseDown={stopPointer}
    >
      <div className="workbench-note-board-card-edit-field workbench-note-board-card-edit-type-row">
        <label>Type</label>
        <div className="workbench-note-board-card-type-row">
          <span className="workbench-note-board-card-type-pill">{BOARD_NOTE_TYPE_LABELS[note.type]}</span>
          {canEdit && onDuplicateAsType ? (
            <button
              type="button"
              className="workbench-note-board-card-edit-btn"
              onPointerDown={stopPointer}
              onClick={(e) => {
                e.stopPropagation();
                openTypePicker("edit");
              }}
            >
              Duplicate as type…
            </button>
          ) : null}
        </div>
        {typePickerOpen && typePickerAnchor === "edit"
          ? renderTypePicker(() => closeTypePicker())
          : null}
      </div>

      <div className="workbench-note-board-card-edit-field">
        <label htmlFor={`title-${note.id}`}>Title</label>
        <input
          id={`title-${note.id}`}
          type="text"
          value={draft.title}
          placeholder="Card title"
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onPointerDown={stopPointer}
        />
      </div>

      <div className="workbench-note-board-card-edit-field">
        <label htmlFor={`content-${note.id}`}>
          {note.type === "quote" ? "Quote" : "Body / caption"}
        </label>
        <textarea
          id={`content-${note.id}`}
          value={draft.content}
          placeholder={note.type === "quote" ? "Quote text" : "Notes, caption, or body copy"}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
          onPointerDown={stopPointer}
        />
      </div>

      {note.type === "quote" && (
        <div className="workbench-note-board-card-edit-field">
          <label htmlFor={`source-${note.id}`}>Source attribution</label>
          <input
            id={`source-${note.id}`}
            type="text"
            value={draft.quoteSource}
            placeholder="e.g. Author, Title (Year)"
            onChange={(e) => setDraft((d) => ({ ...d, quoteSource: e.target.value }))}
            onPointerDown={stopPointer}
          />
        </div>
      )}

      {note.type === "link" && (
        <div className="workbench-note-board-card-edit-field">
          <label htmlFor={`link-${note.id}`}>URL</label>
          <input
            id={`link-${note.id}`}
            type="url"
            value={draft.linkUrl}
            placeholder="https://…"
            onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
            onPointerDown={stopPointer}
          />
        </div>
      )}

      <div className="workbench-note-board-card-edit-field">
        <label htmlFor={`image-url-${note.id}`}>Image URL</label>
        <input
          id={`image-url-${note.id}`}
          type="url"
          value={draft.imageUrl}
          placeholder="https://… (paste or use file picker)"
          onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
          onPointerDown={stopPointer}
        />
      </div>

      <div className="workbench-note-board-card-edit-field">
        <label htmlFor={`image-alt-${note.id}`}>Image alt text</label>
        <input
          id={`image-alt-${note.id}`}
          type="text"
          value={draft.imageAlt}
          placeholder="Describe the image"
          onChange={(e) => setDraft((d) => ({ ...d, imageAlt: e.target.value }))}
          onPointerDown={stopPointer}
        />
      </div>

      {draft.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="workbench-note-board-card-edit-image-preview"
          src={draft.imageUrl}
          alt={draft.imageAlt || "Preview"}
        />
      ) : (
        <div className="workbench-note-board-card-edit-image-empty">
          No image preview yet
        </div>
      )}

      <div className="workbench-note-board-card-edit-field">
        <label htmlFor={`column-${note.id}`}>Workflow column</label>
        <select
          id={`column-${note.id}`}
          value={draft.columnId}
          onChange={(e) => setDraft((d) => ({ ...d, columnId: e.target.value as EditDraft["columnId"] }))}
          onPointerDown={stopPointer}
        >
          <option value="">No column</option>
          <option value="collecting">Collecting</option>
          <option value="reviewing">Reviewing</option>
          <option value="ready">Ready for writing</option>
          <option value="used">Used in document</option>
        </select>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onPointerDown={stopPointer}
        onChange={(e) => {
          void onFilePicked(e.target.files?.[0] || undefined);
          e.target.value = "";
        }}
      />

      {uploadError ? (
        <p className="workbench-note-board-card-upload-error" role="alert">
          {uploadError}
        </p>
      ) : null}

      <div className="workbench-note-board-card-edit-actions">
        <button
          type="button"
          className="workbench-note-board-card-edit-btn"
          disabled={imageUploading}
          onPointerDown={stopPointer}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          {imageUploading ? "Uploading…" : "Choose image file"}
        </button>
        <button
          type="button"
          className="workbench-note-board-card-edit-btn"
          onPointerDown={stopPointer}
          onClick={(e) => {
            e.stopPropagation();
            cancelEdit();
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="workbench-note-board-card-edit-btn workbench-note-board-card-edit-btn--primary"
          onPointerDown={stopPointer}
          onClick={(e) => {
            e.stopPropagation();
            saveEdit();
          }}
        >
          Save
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={[
        "workbench-note-board-card",
        `workbench-note-board-card-type-${note.type}`,
        isImageCard ? "is-image" : "",
        isImageCard && hasImage ? "has-image" : "",
        note.type === "task" && note.taskCompleted ? "is-complete" : "",
        isSelected ? "is-selected" : "",
        editing ? "is-editing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleCardClick}
      data-note-id={note.id}
      data-card-type={note.type}
    >
      <div className="workbench-note-board-card-drag-handle" />

      <div className="workbench-note-board-card-menu" ref={menuRef}>
        <button
          type="button"
          className="workbench-note-board-card-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          aria-label="Card menu"
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div
            className="workbench-note-board-card-menu-panel"
            role="menu"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {typePickerOpen && typePickerAnchor === "menu" ? (
              renderTypePicker(() => closeTypePicker())
            ) : (
              <>
                <button
                  type="button"
                  className="workbench-note-board-card-menu-item"
                  disabled={!canEdit}
                  onClick={handleMenuAction(startEdit)}
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
                {onSendToDocument ? (
                  <button
                    type="button"
                    className="workbench-note-board-card-menu-item"
                    onClick={handleMenuAction(() => onSendToDocument())}
                  >
                    <Send size={14} />
                    <span>Send to document</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="workbench-note-board-card-menu-item"
                  disabled={!canEdit}
                  onClick={handleMenuAction(() => onDuplicate(note.id))}
                >
                  <Copy size={14} />
                  <span>Duplicate</span>
                </button>
                {canEdit && onDuplicateAsType ? (
                  <button
                    type="button"
                    className="workbench-note-board-card-menu-item"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openTypePicker("menu");
                    }}
                  >
                    <Copy size={14} />
                    <span>Duplicate as type…</span>
                  </button>
                ) : null}
                {note.type === "source" && onOpenRecord ? (
                  <button
                    type="button"
                    className="workbench-note-board-card-menu-item"
                    onClick={handleMenuAction(() => onOpenRecord())}
                  >
                    <ExternalLink size={14} />
                    <span>Open record</span>
                  </button>
                ) : null}
                {note.type === "source" && onCite ? (
                  <button
                    type="button"
                    className="workbench-note-board-card-menu-item"
                    onClick={handleMenuAction(() => onCite())}
                  >
                    <QuoteIcon size={14} />
                    <span>Cite</span>
                  </button>
                ) : null}
                {isImageCard && canEdit ? (
                  <button
                    type="button"
                    className="workbench-note-board-card-menu-item"
                    onClick={handleMenuAction(startEdit)}
                  >
                    <ImageIcon size={14} />
                    <span>{hasImage ? "Replace image" : "Add image"}</span>
                  </button>
                ) : null}
                <div className="workbench-note-board-card-menu-divider" />
              </>
            )}
            <button
              type="button"
              className="workbench-note-board-card-menu-item workbench-note-board-card-menu-item-danger"
              disabled={!canEdit}
              onClick={handleMenuAction(() => onDelete(note.id))}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="workbench-note-board-card-body">
        {editing ? renderEditPanel() : renderCardContent()}
      </div>
    </div>
  );
}
