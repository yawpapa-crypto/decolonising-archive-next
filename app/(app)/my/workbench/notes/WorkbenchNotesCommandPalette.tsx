"use client";

import { useEffect, useMemo, useState } from "react";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  commands: CommandItem[];
  onClose: () => void;
};

export default function WorkbenchNotesCommandPalette({ open, commands, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [commands, query]);

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
        filtered[activeIndex]?.run();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div className="workbench-notes-palette-backdrop" role="presentation" onClick={onClose}>
      <div
        className="workbench-notes-command-palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          className="workbench-note-search"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Search commands"
        />
        <ul role="listbox">
          {filtered.length ? (
            filtered.map((cmd, index) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "is-active" : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    cmd.run();
                    onClose();
                  }}
                >
                  <span>{cmd.label}</span>
                  {cmd.hint ? <kbd>{cmd.hint}</kbd> : null}
                </button>
              </li>
            ))
          ) : (
            <li className="workbench-muted">No matching commands</li>
          )}
        </ul>
        <p className="workbench-notes-palette-hint">
          ↑↓ navigate · Enter run · Esc close
        </p>
      </div>
    </div>
  );
}
