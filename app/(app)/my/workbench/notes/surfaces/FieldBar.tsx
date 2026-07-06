"use client";

import type { NoteMode } from "../workbench-note-types";

const LENS_MODES: { id: NoteMode; label: string }[] = [
  { id: "document", label: "Reading" },
  { id: "canvas", label: "Canvas" },
  { id: "board", label: "Board" },
];

type FieldBarProps = {
  statsLabel: string;
  noteMode: NoteMode;
  onNoteModeChange: (mode: NoteMode) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
};

export function FieldBar({
  statsLabel,
  noteMode,
  onNoteModeChange,
  isFocusMode,
  onToggleFocusMode,
}: FieldBarProps) {
  return (
    <footer className="workbench-field-bar" aria-label="Field instruments">
      <span className="workbench-field-bar__stats">{statsLabel}</span>
      <div className="workbench-field-bar__lens" role="group" aria-label="View lens">
        {LENS_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`workbench-field-bar__lens-btn${noteMode === mode.id ? " is-active" : ""}`}
            onClick={() => onNoteModeChange(mode.id)}
            aria-pressed={noteMode === mode.id}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`workbench-field-bar__focus${isFocusMode ? " is-active" : ""}`}
        onClick={onToggleFocusMode}
        aria-pressed={isFocusMode}
      >
        {isFocusMode ? "Exit focus" : "Focus"}
      </button>
    </footer>
  );
}
