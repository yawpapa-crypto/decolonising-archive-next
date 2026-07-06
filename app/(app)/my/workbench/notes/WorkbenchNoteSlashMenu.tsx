"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkbenchNoteTemplateId } from "@/lib/workbench-note-templates";

export type SlashMenuItem = {
  id: string;
  label: string;
  kind: "format" | "template";
  templateId?: WorkbenchNoteTemplateId;
};

const SLASH_ITEMS: SlashMenuItem[] = [
  { id: "h2", label: "Heading 2", kind: "format" },
  { id: "h3", label: "Heading 3", kind: "format" },
  { id: "bullet", label: "Bullet list", kind: "format" },
  { id: "ordered", label: "Numbered list", kind: "format" },
  { id: "task", label: "Task list", kind: "format" },
  { id: "quote", label: "Quote", kind: "format" },
  { id: "divider", label: "Divider", kind: "format" },
  { id: "table", label: "Table", kind: "format" },
  { id: "image", label: "Image", kind: "format" },
  { id: "source_annotation", label: "Source note", kind: "template", templateId: "source_annotation" },
  { id: "project_decision_log", label: "Decision log", kind: "template", templateId: "project_decision_log" },
  { id: "ethics_cultural_care", label: "Ethics note", kind: "template", templateId: "ethics_cultural_care" },
];

type Props = {
  open: boolean;
  query: string;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
};

export default function WorkbenchNoteSlashMenu({ open, query, onSelect, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

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
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="workbench-slash-menu" role="listbox" aria-label="Slash commands">
      {filtered.length ? (
        filtered.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            className={`workbench-slash-menu-item${index === activeIndex ? " is-active" : ""}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(item)}
          >
            {item.label}
          </button>
        ))
      ) : (
        <p className="workbench-muted">No commands match</p>
      )}
    </div>
  );
}
