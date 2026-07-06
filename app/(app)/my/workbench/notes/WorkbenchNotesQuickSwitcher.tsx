"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkbenchNoteWithProject } from "@/lib/workbench-data";
import { formatNoteUpdated } from "@/lib/workbench-note-utils";
import { noteStatusLabel } from "@/lib/workbench-note-status";

type Props = {
  open: boolean;
  notes: WorkbenchNoteWithProject[];
  activeId: string;
  onSelect: (note: WorkbenchNoteWithProject) => void;
  onClose: () => void;
};

export default function WorkbenchNotesQuickSwitcher({
  open,
  notes,
  activeId,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(q) ||
        (note.plain_text ?? "").toLowerCase().includes(q) ||
        note.project_title.toLowerCase().includes(q)
      );
    });
  }, [notes, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (!filtered.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onSelect(filtered[activeIndex]);
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="workbench-notes-palette-backdrop" role="presentation" onClick={onClose}>
      <div
        className="workbench-notes-command-palette workbench-notes-quick-switcher"
        role="dialog"
        aria-label="Quick switcher"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          className="workbench-note-search"
          placeholder="Jump to a note..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Search notes"
        />
        <ul role="listbox">
          {filtered.length ? (
            filtered.map((note, index) => (
              <li key={note.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex || note.id === activeId}
                  className={index === activeIndex ? "is-active" : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onSelect(note);
                    onClose();
                  }}
                >
                  <span>
                    {note.pinned ? "★ " : ""}
                    {note.title || "Untitled note"}
                  </span>
                  <small>
                    {noteStatusLabel(note.status)} · {note.project_title} ·{" "}
                    {formatNoteUpdated(note.updated_at)}
                  </small>
                </button>
              </li>
            ))
          ) : (
            <li className="workbench-muted">No notes found</li>
          )}
        </ul>
      </div>
    </div>
  );
}
