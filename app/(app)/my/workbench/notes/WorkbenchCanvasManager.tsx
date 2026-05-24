"use client";

import { ChevronDown, Copy, Eraser, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  clearCanvas,
  createCanvas,
  deleteCanvas,
  duplicateCanvas,
  getActiveCanvasRecord,
  renameCanvas,
  setActiveCanvas,
  type WorkbenchCanvasState,
} from "./workbench-canvas-state";

export type WorkbenchCanvasManagerProps = {
  state: WorkbenchCanvasState;
  canEdit: boolean;
  onStateChange: (next: WorkbenchCanvasState) => void;
};

type DialogKind = "rename" | "delete" | "clear" | null;

function formatCanvasMeta(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function CanvasOverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export function WorkbenchCanvasManager({
  state,
  canEdit,
  onStateChange,
}: WorkbenchCanvasManagerProps) {
  const active = getActiveCanvasRecord(state);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [renameValue, setRenameValue] = useState(active.name);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRenameValue(active.name);
  }, [active.id, active.name]);

  useEffect(() => {
    if (dialog !== "rename") return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [dialog]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeDialog = useCallback(() => setDialog(null), []);

  useEffect(() => {
    if (!dialog) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDialog, dialog]);

  function handleRenameSubmit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onStateChange(renameCanvas(state, active.id, trimmed));
    closeDialog();
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRenameSubmit();
    }
  }

  if (!canEdit) {
    return (
      <div
        className="workbench-canvas-manager workbench-canvas-manager--readonly"
        title={active.name}
      >
        <div className="workbench-canvas-switcher workbench-canvas-switcher--readonly">
          <span className="workbench-canvas-switcher__name">{active.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`workbench-canvas-manager${menuOpen ? " is-menu-open" : ""}${dialog ? " is-dialog-open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`workbench-canvas-switcher workbench-canvas-switcher-trigger${menuOpen ? " is-open" : ""}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
        onDoubleClick={(event) => {
          event.preventDefault();
          setRenameValue(active.name);
          setDialog("rename");
          setMenuOpen(false);
        }}
        title={`${active.name} — double-click to rename`}
      >
        <span className="workbench-canvas-switcher__name">{active.name}</span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden className="workbench-canvas-switcher__chevron" />
      </button>

      {menuOpen ? (
        <div id={menuId} className="workbench-canvas-switcher-menu" role="menu">
          <div className="workbench-canvas-switcher-menu__section" role="none">
            <button
              type="button"
              role="menuitem"
              className="workbench-canvas-switcher-menu__action"
              onClick={() => {
                onStateChange(createCanvas(state));
                setMenuOpen(false);
              }}
            >
              <Plus size={16} aria-hidden />
              New canvas
            </button>
            <button
              type="button"
              role="menuitem"
              className="workbench-canvas-switcher-menu__action"
              onClick={() => {
                setRenameValue(active.name);
                setDialog("rename");
                setMenuOpen(false);
              }}
            >
              <Pencil size={16} aria-hidden />
              Rename canvas
            </button>
            <button
              type="button"
              role="menuitem"
              className="workbench-canvas-switcher-menu__action"
              onClick={() => {
                onStateChange(duplicateCanvas(state, active.id));
                setMenuOpen(false);
              }}
            >
              <Copy size={16} aria-hidden />
              Duplicate canvas
            </button>
            <button
              type="button"
              role="menuitem"
              className="workbench-canvas-switcher-menu__action"
              onClick={() => {
                setDialog("clear");
                setMenuOpen(false);
              }}
            >
              <Eraser size={16} aria-hidden />
              Clear canvas
            </button>
            <button
              type="button"
              role="menuitem"
              className="workbench-canvas-switcher-menu__action workbench-canvas-switcher-menu__action--danger"
              onClick={() => {
                setDialog("delete");
                setMenuOpen(false);
              }}
            >
              <Trash2 size={16} aria-hidden />
              Delete canvas
            </button>
          </div>
          <div className="workbench-canvas-switcher-menu__divider" role="separator" />
          <ul className="workbench-canvas-switcher-menu__list" role="group" aria-label="Canvases">
            {state.canvases.map((canvas) => {
              const isActive = canvas.id === state.activeCanvasId;
              const meta = formatCanvasMeta(canvas.updatedAt);
              return (
                <li key={canvas.id} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`workbench-canvas-switcher-menu__canvas${isActive ? " is-active" : ""}`}
                    onClick={() => {
                      onStateChange(setActiveCanvas(state, canvas.id));
                      setMenuOpen(false);
                    }}
                  >
                    <span className="workbench-canvas-switcher-menu__canvas-name">{canvas.name}</span>
                    {meta ? (
                      <span className="workbench-canvas-switcher-menu__canvas-meta">{meta}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {dialog === "rename" ? (
        <CanvasOverlayPortal>
          <div
            className="workbench-canvas-dialog-backdrop"
            role="presentation"
            onClick={closeDialog}
          >
            <form
              className="workbench-canvas-dialog-card"
              role="dialog"
              aria-labelledby="workbench-canvas-rename-title"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              onSubmit={handleRenameSubmit}
            >
              <h2 id="workbench-canvas-rename-title" className="workbench-canvas-dialog-card__title">
                Rename canvas
              </h2>
              <label className="workbench-canvas-dialog-card__label">
                <span className="workbench-canvas-dialog-card__label-text">Name</span>
                <input
                  ref={renameInputRef}
                  className="workbench-canvas-dialog-card__input"
                  type="text"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  maxLength={120}
                  required
                />
              </label>
              <div className="workbench-canvas-dialog-card__actions">
                <button
                  type="button"
                  className="workbench-canvas-dialog-card__btn"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="workbench-canvas-dialog-card__btn workbench-canvas-dialog-card__btn--primary"
                  disabled={!renameValue.trim()}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </CanvasOverlayPortal>
      ) : null}

      {dialog === "delete" ? (
        <CanvasOverlayPortal>
          <div
            className="workbench-canvas-dialog-backdrop"
            role="presentation"
            onClick={closeDialog}
          >
            <div
              className="workbench-canvas-dialog-card"
              role="alertdialog"
              aria-labelledby="workbench-canvas-delete-title"
              aria-describedby="workbench-canvas-delete-desc"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="workbench-canvas-delete-title" className="workbench-canvas-dialog-card__title">
                Delete canvas?
              </h2>
              <p id="workbench-canvas-delete-desc" className="workbench-canvas-dialog-card__body">
                This will remove all objects, connectors and layout for &ldquo;{active.name}&rdquo;.
                This cannot be undone.
              </p>
              <div className="workbench-canvas-dialog-card__actions">
                <button
                  type="button"
                  className="workbench-canvas-dialog-card__btn"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="workbench-canvas-dialog-card__btn workbench-canvas-dialog-card__btn--danger"
                  onClick={() => {
                    onStateChange(deleteCanvas(state, active.id));
                    closeDialog();
                  }}
                >
                  Delete canvas
                </button>
              </div>
            </div>
          </div>
        </CanvasOverlayPortal>
      ) : null}

      {dialog === "clear" ? (
        <CanvasOverlayPortal>
          <div
            className="workbench-canvas-dialog-backdrop"
            role="presentation"
            onClick={closeDialog}
          >
            <div
              className="workbench-canvas-dialog-card"
              role="alertdialog"
              aria-labelledby="workbench-canvas-clear-title"
              aria-describedby="workbench-canvas-clear-desc"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="workbench-canvas-clear-title" className="workbench-canvas-dialog-card__title">
                Clear canvas?
              </h2>
              <p id="workbench-canvas-clear-desc" className="workbench-canvas-dialog-card__body">
                Remove all objects and connectors from &ldquo;{active.name}&rdquo;? The canvas name
                and settings will be kept.
              </p>
              <div className="workbench-canvas-dialog-card__actions">
                <button
                  type="button"
                  className="workbench-canvas-dialog-card__btn"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="workbench-canvas-dialog-card__btn workbench-canvas-dialog-card__btn--danger"
                  onClick={() => {
                    onStateChange(clearCanvas(state, active.id));
                    closeDialog();
                  }}
                >
                  Clear canvas
                </button>
              </div>
            </div>
          </div>
        </CanvasOverlayPortal>
      ) : null}
    </div>
  );
}
