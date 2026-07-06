"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Circle,
  FileText,
  Frame,
  Image as ImageIcon,
  Link2,
  ListTodo,
  MessageSquare,
  Minus,
  Plus,
  Quote,
  Shapes,
  Square,
  StickyNote,
} from "lucide-react";
import type { CanvasToolId } from "./workbench-canvas-types";

type AddMenuItem = {
  id: string;
  label: string;
  tool: CanvasToolId;
  icon: React.ReactNode;
};

const ADD_MENU_ITEMS: AddMenuItem[] = [
  { id: "text", label: "Note", tool: "text", icon: <FileText size={16} /> },
  { id: "image", label: "Image", tool: "image", icon: <ImageIcon size={16} /> },
  { id: "quote", label: "Quote", tool: "quote", icon: <Quote size={16} /> },
  { id: "source", label: "Source", tool: "source", icon: <FileText size={16} /> },
  { id: "question", label: "Question", tool: "question", icon: <MessageSquare size={16} /> },
  { id: "task", label: "Task", tool: "task", icon: <ListTodo size={16} /> },
  { id: "link", label: "Link", tool: "link", icon: <Link2 size={16} /> },
  { id: "frame", label: "Frame", tool: "frame", icon: <Frame size={16} /> },
  { id: "shape", label: "Shape", tool: "rectangle", icon: <Shapes size={16} /> },
  { id: "arrow", label: "Arrow", tool: "arrow", icon: <ArrowRight size={16} /> },
  { id: "sticky", label: "Sticky", tool: "sticky", icon: <StickyNote size={16} /> },
  { id: "line", label: "Line", tool: "line", icon: <Minus size={16} /> },
  { id: "circle", label: "Circle", tool: "circle", icon: <Circle size={16} /> },
  { id: "rect", label: "Rectangle", tool: "rectangle", icon: <Square size={16} /> },
];

export type WorkbenchCanvasFloatingAddProps = {
  canEdit: boolean;
  focusMode?: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onPickTool: (tool: CanvasToolId) => void;
  onAddFromArchive: () => void;
};

export function WorkbenchCanvasFloatingAdd({
  canEdit,
  focusMode = false,
  menuOpen,
  onMenuOpenChange,
  onPickTool,
  onAddFromArchive,
}: WorkbenchCanvasFloatingAddProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMenuOpenChange(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onMenuOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen, onMenuOpenChange]);

  return (
    <div
      ref={rootRef}
      className={[
        "workbench-canvas-floating-add",
        menuOpen ? "is-open" : "",
        focusMode ? "is-focus-mode" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {menuOpen ? (
        <div className="workbench-canvas-floating-add__menu" role="menu" aria-label="Add to canvas">
          {ADD_MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="workbench-canvas-floating-add__item"
              disabled={!canEdit}
              onClick={() => {
                onPickTool(item.tool);
                onMenuOpenChange(false);
              }}
            >
              <span className="workbench-canvas-floating-add__icon" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="workbench-canvas-floating-add__item workbench-canvas-floating-add__item--archive"
            disabled={!canEdit}
            onClick={() => {
              onAddFromArchive();
              onMenuOpenChange(false);
            }}
          >
            <span className="workbench-canvas-floating-add__icon" aria-hidden>
              <FileText size={16} />
            </span>
            <span>Add from archive</span>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="workbench-canvas-floating-add__fab"
        aria-label="Add object"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        disabled={!canEdit}
        onClick={() => onMenuOpenChange(!menuOpen)}
      >
        <Plus size={22} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
