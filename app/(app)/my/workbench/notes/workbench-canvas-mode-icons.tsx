import type { LucideIcon } from "lucide-react";
import { FileText, LayoutGrid, PenLine } from "lucide-react";
import type { NoteMode } from "./workbench-note-types";

export const CANVAS_MODE_ICONS: Record<NoteMode, LucideIcon> = {
  document: FileText,
  canvas: PenLine,
  board: LayoutGrid,
};
