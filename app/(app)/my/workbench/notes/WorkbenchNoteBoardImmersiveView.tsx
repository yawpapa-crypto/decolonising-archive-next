"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

import type { WorkbenchCitationSource } from "@/lib/workbench-data";
import type { BoardState, WorkbenchNote } from "./workbench-board-figma-types";
import { WorkbenchBoardCardImmersive } from "./WorkbenchBoardCardImmersive";
import { duplicateNoteAsType, getImmersiveFallbackPosition } from "./workbench-board-presentation";

import {
  Search,
  Plus,
  Grid3x3,
  Columns3,
  Film,
  LayoutGrid,
  Map as MapIcon,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Quote,
  BookOpen,
  HelpCircle,
  CheckSquare,
  Link as LinkIcon,
  Archive,
} from "lucide-react";

type ArchiveGroup = {
  id: string;
  label: string;
  items: WorkbenchCitationSource[];
};

const BOARD_LAYOUT_OPTIONS: Array<{
  id: BoardState["layout"];
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "wall", label: "Wall", icon: <Grid3x3 size={16} /> },
  { id: "columns", label: "Columns", icon: <Columns3 size={16} /> },
  { id: "storyboard", label: "Storyboard", icon: <Film size={16} /> },
  { id: "gallery", label: "Gallery", icon: <LayoutGrid size={16} /> },
  { id: "map", label: "Map", icon: <MapIcon size={16} /> },
];

const BOARD_THEME_OPTIONS: Array<{
  id: BoardState["theme"];
  label: string;
  icon: string;
}> = [
  { id: "archive-paper", label: "Archive", icon: "A" },
  { id: "dark-storyboard", label: "Dark", icon: "D" },
  { id: "gallery-light", label: "Paper", icon: "P" },
  { id: "green-field", label: "Lemon", icon: "L" },
  { id: "night-archive", label: "Minimal", icon: "M" },
];

interface WorkbenchNoteBoardImmersiveViewProps {
  notes: WorkbenchNote[];
  onUpdateNote: (id: string, updates: Partial<WorkbenchNote>) => void;
  onDeleteNote: (id: string) => void;
  onAddNote: (note: Omit<WorkbenchNote, "id" | "createdAt" | "updatedAt">) => void;
  boardState: BoardState;
  onUpdateBoardState: (updates: Partial<BoardState>) => void;
  canEdit?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  archiveGroups?: ArchiveGroup[];
  onAddFromArchive?: (source: WorkbenchCitationSource) => void;
  onOpenRecord?: (noteId: string) => void;
  onCiteNote?: (noteId: string) => void;
  onSendNoteToDocument?: (noteId: string) => void;
}

export function WorkbenchNoteBoardImmersiveView({
  notes,
  onUpdateNote,
  onDeleteNote,
  onAddNote,
  boardState,
  onUpdateBoardState,
  canEdit = true,
  searchQuery: controlledSearch = "",
  onSearchChange,
  archiveGroups = [],
  onAddFromArchive,
  onOpenRecord,
  onCiteNote,
  onSendNoteToDocument,
}: WorkbenchNoteBoardImmersiveViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("workbench-board-is-fullscreen", boardState.isFullscreen);

    return () => {
      document.body.classList.remove("workbench-board-is-fullscreen");
    };
  }, [boardState.isFullscreen]);


  const [searchQuery, setSearchQuery] = useState(controlledSearch);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [archivePickerOpen, setArchivePickerOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  useEffect(() => {
    setSearchQuery(controlledSearch);
  }, [controlledSearch]);

  useEffect(() => {
    if (!boardState.isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [boardState.isFullscreen]);

  function setSearch(value: string) {
    setSearchQuery(value);
    onSearchChange?.(value);
  }
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add menu when clicking outside the + button or portal menu.
  useEffect(() => {
    if (!addMenuOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(".workbench-note-board-add-popover-wrap") ||
        target?.closest(".workbench-note-board-add-popover--portal")
      ) {
        return;
      }

      setAddMenuOpen(false);
      setArchivePickerOpen(false);
      setAddMenuAnchor(null);
    };

    window.addEventListener("pointerdown", handlePointerDownOutside, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside, true);
    };
  }, [addMenuOpen]);

  // Keep add menu open after pressing +.
  // It now closes only when selecting an item or pressing + again.
  // Check if target is an interactive element that should not trigger drag/pan
  const isInteractiveBoardTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;

    const interactiveSelectors = [
      '.workbench-note-board-card-menu',
      '.workbench-note-board-card-menu-panel',
      '.workbench-note-board-card-menu-trigger',
      '.workbench-note-board-card-menu-item',
      '.workbench-note-board-card-edit',
      '.workbench-note-board-card-edit-field',
      '.workbench-note-board-card-edit-actions',
      '.workbench-note-board-card-edit-btn',
      '.workbench-note-board-card-image-empty-cta',
      '.workbench-note-board-floating-add',
      '.workbench-note-board-add-panel',
      '.workbench-note-board-add-popover',
      '.workbench-note-board-add-popover-wrap',
      '.workbench-note-board-floating-search',
      '.workbench-note-board-side-rail',
      '.workbench-note-board-control-panel',
      '.workbench-note-board-fullscreen-controls',
      '.workbench-note-board-show-controls',
      '.workbench-note-board-rail-toggle',
      '.workbench-note-board-card-checkbox',
      '.workbench-note-board-card-link-url',
      '.workbench-note-board-card-action-btn',
      '.workbench-note-board-card-type-picker',
      '.workbench-note-board-card-type-picker-item',
      '.workbench-note-board-card-type-picker-back',
      '.workbench-note-board-card-type-pill',
      '.workbench-note-board-card-upload-error',
      'input',
      'select',
      'textarea',
      'button',
      'a',
      'label'
    ];

    return interactiveSelectors.some(selector =>
      target.closest(selector) !== null
    );
  };

  // Handle pointer down for card dragging or empty-board panning
  const handlePointerDown = (event: React.PointerEvent) => {
    const target = event.target as HTMLElement;

    if (isInteractiveBoardTarget(target)) {
      return;
    }

    // Drag cards when the pointer starts on a card.
    const cardElement = target.closest(".workbench-note-board-card");
    if (cardElement) {
      const noteId = cardElement.getAttribute("data-note-id");
      if (noteId) {
        const note = notes.find((n) => n.id === noteId);
        if (note) {
          setIsDragging(true);
          setDraggedNoteId(noteId);

          const rect = cardElement.getBoundingClientRect();
          setDragOffset({
            x: (event.clientX - rect.left) / boardState.zoom,
            y: (event.clientY - rect.top) / boardState.zoom,
          });

          event.currentTarget.setPointerCapture?.(event.pointerId);
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }

    // Dragging empty board pans the canvas.
    if (event.button === 0) {
      setIsPanning(true);
      setPanStart({
        x: event.clientX - boardState.panX,
        y: event.clientY - boardState.panY,
      });

      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Handle pointer move
  const handlePointerMove = (event: React.PointerEvent) => {
    if (isDragging && draggedNoteId) {
      const note = notes.find(n => n.id === draggedNoteId);
      if (note && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const newX = (event.clientX - rect.left - boardState.panX) / boardState.zoom - dragOffset.x;
        const newY = (event.clientY - rect.top - boardState.panY) / boardState.zoom - dragOffset.y;

        onUpdateNote(draggedNoteId, { x: newX, y: newY });
      }
      event.preventDefault();
      event.stopPropagation();
    } else if (isPanning) {
      const newPanX = event.clientX - panStart.x;
      const newPanY = event.clientY - panStart.y;
      onUpdateBoardState({ panX: newPanX, panY: newPanY });
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Handle pointer up
  const handlePointerUp = (event?: React.PointerEvent) => {
    if (event?.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    setIsDragging(false);
    setDraggedNoteId(null);
    setIsPanning(false);
  };

  // Handle wheel for board pan and zoom
  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Cmd/Ctrl + wheel zooms around the board.
    if (event.ctrlKey || event.metaKey) {
      const delta = -event.deltaY;
      const zoomFactor = delta > 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(boardState.zoom * zoomFactor, 0.35), 2.2);
      onUpdateBoardState({ zoom: newZoom });
      return;
    }

    // Shift + wheel pans horizontally.
    if (event.shiftKey) {
      onUpdateBoardState({
        panX: boardState.panX - event.deltaY,
      });
      return;
    }

    // Normal trackpad/mouse scroll pans the board, not the page behind it.
    onUpdateBoardState({
      panX: boardState.panX - event.deltaX,
      panY: boardState.panY - event.deltaY,
    });
  };

  // Handle duplicate note
  const handleDuplicateNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      const newNote: Omit<WorkbenchNote, 'id' | 'createdAt' | 'updatedAt'> = {
        ...note,
        x: note.x + 20,
        y: note.y + 20,
        title: `${note.title} (copy)`
      };
      onAddNote(newNote);
    }
  };

  const handleDuplicateNoteAsType = (id: string, targetType: WorkbenchNote["type"]) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      onAddNote(duplicateNoteAsType(note, targetType));
    }
  };

  const handleAddNote = (type: WorkbenchNote["type"]) => {
    if (!canEdit) return;
    const slot = getImmersiveFallbackPosition(notes.length);

    const newNote: Omit<WorkbenchNote, "id" | "createdAt" | "updatedAt"> = {
      type,
      title: "",
      content: "",
      x: slot.x,
      y: slot.y,
    };

    onAddNote(newNote);
    setAddMenuOpen(false);
    setAddMenuAnchor(null);
    setArchivePickerOpen(false);
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.type.includes(query)
    );
  });

  const cardProps = (note: WorkbenchNote) => ({
    note,
    onUpdate: onUpdateNote,
    onDelete: onDeleteNote,
    onDuplicate: handleDuplicateNote,
    onDuplicateAsType: canEdit
      ? (targetType: WorkbenchNote["type"]) => handleDuplicateNoteAsType(note.id, targetType)
      : undefined,
    isSelected: boardState.selectedNoteIds.includes(note.id),
    onSelect: (id: string) => onUpdateBoardState({ selectedNoteIds: [id] }),
    zoom: boardState.zoom,
    canEdit,
    onOpenRecord:
      note.type === "source" && note.archiveRecordId
        ? () => onOpenRecord?.(note.id)
        : undefined,
    onCite: note.type === "source" ? () => onCiteNote?.(note.id) : undefined,
    onSendToDocument: onSendNoteToDocument
      ? () => onSendNoteToDocument(note.id)
      : undefined,
  });

  const addTools: Array<{
    type: WorkbenchNote["type"];
    label: string;
    icon: React.ReactNode;
  }> = [
    { type: "note", label: "Note", icon: <FileText size={16} /> },
    { type: "image", label: "Image", icon: <ImageIcon size={16} /> },
    { type: "quote", label: "Quote", icon: <Quote size={16} /> },
    { type: "source", label: "Source", icon: <BookOpen size={16} /> },
    { type: "question", label: "Question", icon: <HelpCircle size={16} /> },
    { type: "task", label: "Task", icon: <CheckSquare size={16} /> },
    { type: "link", label: "Link", icon: <LinkIcon size={16} /> },
  ];

  const boardElement = (
    <section
      className={[
        "workbench-note-board-immersive",
        `theme-${boardState.theme}`,
        boardState.isFullscreen ? "is-fullscreen" : "",
        !boardState.controlsVisible ? "controls-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="workbench-note-board-bg" />

      <div
        ref={addMenuRef}
        className="workbench-note-board-add-popover-wrap"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="workbench-note-board-floating-add"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (isMobileViewport) {
              setAddMenuAnchor({ x: 0, y: 0 });
            } else {
              const rect = event.currentTarget.getBoundingClientRect();
              setAddMenuAnchor({
                x: Math.min(rect.right + 14, window.innerWidth - 340),
                y: Math.min(rect.top, window.innerHeight - 420),
              });
            }
            setAddMenuOpen((open) => !open);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          aria-label="Add from your archive"
          aria-expanded={addMenuOpen}
        >
          <Plus size={24} />
        </button>

        {addMenuOpen && addMenuAnchor && isMounted ? createPortal(
          <div
            className={`workbench-note-board-add-popover workbench-note-board-add-popover--portal${isMobileViewport ? " is-mobile" : ""}`}
            role="menu"
            style={
              isMobileViewport
                ? undefined
                : {
                    left: addMenuAnchor.x,
                    top: addMenuAnchor.y,
                  }
            }
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {addTools.map((tool) => (
              <button
                key={tool.type}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleAddNote(tool.type);
                }}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            ))}
            <div className="workbench-note-board-add-divider" />
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setArchivePickerOpen((open) => !open);
              }}
            >
              <Archive size={16} />
              <span>Add from archive</span>
            </button>
            {archivePickerOpen &&
              archiveGroups.map((group) => (
                <div key={group.id} className="workbench-note-board-add-archive-group">
                  <p>{group.label}</p>
                  {group.items.map((item) => (
                    <button
                      key={`${group.id}-${item.recordId}`}
                      type="button"
                      role="menuitem"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onAddFromArchive?.(item);
                        setArchivePickerOpen(false);
                        setAddMenuOpen(false);
                      }}
                    >
                      <span>{item.title}</span>
                    </button>
                  ))}
                </div>
              ))}
          </div>,
          document.body
        ) : null}
      </div>

      {boardState.controlsVisible && (
        <>
          <header className="workbench-note-board-hero">
            <div className="workbench-note-board-avatar">DA</div>
            <div>
              <p className="workbench-note-board-meta">Archive Workbench</p>
              <h2>Research Board</h2>
              <p>Collect, connect, cite, and write from your archive.</p>
            </div>
          </header>

          <div
            className="workbench-note-board-floating-search"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Search size={18} />
            <input
              type="search"
              placeholder="Search board..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <aside
            className={`workbench-note-board-side-rail ${railCollapsed ? "is-collapsed" : ""}`}
            aria-label="Board controls"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="workbench-note-board-rail-toggle"
              onClick={() => setRailCollapsed(!railCollapsed)}
              aria-label={railCollapsed ? "Expand panel" : "Collapse panel"}
            >
              <ChevronLeft size={16} style={railCollapsed ? undefined : { transform: "rotate(180deg)" }} />
            </button>

            {!railCollapsed ? (
              <>
                <div className="workbench-note-board-rail-section">
                  <h3 className="board-section-title">Layout</h3>
                  {BOARD_LAYOUT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`board-layout-option${boardState.layout === option.id ? " is-active" : ""}`}
                      onClick={() => onUpdateBoardState({ layout: option.id })}
                    >
                      <span className="board-layout-option__icon" aria-hidden="true">
                        {option.icon}
                      </span>
                      <span className="board-layout-option__label">{option.label}</span>
                    </button>
                  ))}
                </div>

                <div className="workbench-note-board-rail-section">
                  <h3 className="board-section-title">Theme</h3>
                  {BOARD_THEME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`board-layout-option${boardState.theme === option.id ? " is-active" : ""}`}
                      onClick={() => onUpdateBoardState({ theme: option.id })}
                    >
                      <span className="board-layout-option__icon" aria-hidden="true">
                        {option.icon}
                      </span>
                      <span className="board-layout-option__label">{option.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </aside>

        </>
      )}

      {boardState.controlsVisible ? (
        <div
          className="workbench-note-board-fullscreen-controls"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() =>
              onUpdateBoardState({
                isFullscreen: !boardState.isFullscreen,
                controlsVisible: true,
              })
            }
          >
            {boardState.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateBoardState({
                controlsVisible: false,
              })
            }
          >
            Hide controls
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="workbench-note-board-show-controls"
          onClick={() => onUpdateBoardState({ controlsVisible: true })}
        >
          Show controls
        </button>
      )}

      <div
        ref={viewportRef}
        className="workbench-note-board-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          ref={worldRef}
          className={`workbench-note-board-world layout-${boardState.layout}`}
          style={{
            transform: `translate(${boardState.panX}px, ${boardState.panY}px) scale(${boardState.zoom})`
          }}
        >
          {boardState.layout === 'wall' && filteredNotes.map((note, index) => (
            <div
              key={note.id}
              className="workbench-note-board-card-wrapper"
              style={{
                transform: `translate(${note.x ?? getImmersiveFallbackPosition(index).x}px, ${note.y ?? getImmersiveFallbackPosition(index).y}px)`
              }}
            >
              <WorkbenchBoardCardImmersive {...cardProps(note)} />
            </div>
          ))}

          {boardState.layout === 'columns' && (
            <div className="workbench-note-board-columns">
              {(['collecting', 'reviewing', 'ready', 'used'] as const).map(columnId => (
                <div key={columnId} className="workbench-note-board-column">
                  <h3 className="workbench-note-board-column-header">
                    {columnId === 'collecting' && 'Collecting'}
                    {columnId === 'reviewing' && 'Reviewing'}
                    {columnId === 'ready' && 'Ready for Writing'}
                    {columnId === 'used' && 'Used in Document'}
                  </h3>
                  <div className="workbench-note-board-column-cards">
                    {filteredNotes
                      .filter(note => (note.columnId ?? 'collecting') === columnId)
                      .map(note => (
                        <WorkbenchBoardCardImmersive key={note.id} {...cardProps(note)} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {boardState.layout === 'storyboard' && (
            <div className="workbench-note-board-storyboard">
              {filteredNotes.map(note => (
                <WorkbenchBoardCardImmersive key={note.id} {...cardProps(note)} />
              ))}
            </div>
          )}

          {boardState.layout === 'gallery' && (
            <div className="workbench-note-board-gallery">
              {filteredNotes.map(note => (
                <WorkbenchBoardCardImmersive key={note.id} {...cardProps(note)} />
              ))}
            </div>
          )}

          {boardState.layout === 'map' && (
            <div className="workbench-note-board-map-placeholder">
              <MapIcon size={48} />
              <p>Map view available when location metadata exists</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  if (!isMounted || !boardState.isFullscreen) return boardElement;

  return createPortal(boardElement, document.body);
}
