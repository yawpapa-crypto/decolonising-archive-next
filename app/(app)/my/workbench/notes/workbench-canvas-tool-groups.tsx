import type { ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  Circle,
  CircleHelp,
  FileText,
  Frame,
  GitBranch,
  Hand,
  Image as ImageIcon,
  Link2,
  ListTodo,
  MessageSquare,
  Minus,
  MousePointer2,
  Quote,
  Shapes,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import type { CanvasToolId } from "./workbench-canvas-types";

export type CanvasToolGroupId =
  | "selection"
  | "structure"
  | "connections"
  | "media"
  | "archive";

export type CanvasToolDef = {
  id: CanvasToolId;
  label: string;
  icon: ReactNode;
};

export type CanvasToolGroup = {
  id: CanvasToolGroupId;
  label: string;
  tools: CanvasToolDef[];
};

/* Short group labels for the left rail; full names live in tooltips. */
export const CANVAS_TOOL_GROUPS: CanvasToolGroup[] = [
  {
    id: "selection",
    label: "Cursor",
    tools: [
      { id: "select", label: "Select", icon: <MousePointer2 size={20} strokeWidth={1.75} /> },
      { id: "pan", label: "Pan", icon: <Hand size={20} strokeWidth={1.75} /> },
    ],
  },
  {
    id: "structure",
    label: "Shapes",
    tools: [
      { id: "text", label: "Text", icon: <Type size={20} strokeWidth={1.75} /> },
      { id: "sticky", label: "Sticky", icon: <StickyNote size={20} strokeWidth={1.75} /> },
      { id: "frame", label: "Frame", icon: <Frame size={20} strokeWidth={1.75} /> },
      { id: "rectangle", label: "Rectangle", icon: <Square size={20} strokeWidth={1.75} /> },
      { id: "roundedRectangle", label: "Rounded", icon: <Shapes size={20} strokeWidth={1.75} /> },
      { id: "circle", label: "Circle", icon: <Circle size={20} strokeWidth={1.75} /> },
    ],
  },
  {
    id: "connections",
    label: "Connect",
    tools: [
      { id: "line", label: "Line", icon: <Minus size={20} strokeWidth={1.75} /> },
      { id: "arrow", label: "Arrow", icon: <ArrowRight size={20} strokeWidth={1.75} /> },
      { id: "connector", label: "Connector", icon: <GitBranch size={20} strokeWidth={1.75} /> },
    ],
  },
  {
    id: "media",
    label: "Media",
    tools: [
      { id: "image", label: "Image", icon: <ImageIcon size={20} strokeWidth={1.75} /> },
      { id: "link", label: "Link", icon: <Link2 size={20} strokeWidth={1.75} /> },
      { id: "comment", label: "Comment", icon: <MessageSquare size={20} strokeWidth={1.75} /> },
    ],
  },
  {
    id: "archive",
    label: "Archive",
    tools: [
      { id: "source", label: "Source", icon: <Archive size={20} strokeWidth={1.75} /> },
      { id: "quote", label: "Quote", icon: <Quote size={20} strokeWidth={1.75} /> },
      { id: "question", label: "Question", icon: <CircleHelp size={20} strokeWidth={1.75} /> },
      { id: "task", label: "Task", icon: <ListTodo size={20} strokeWidth={1.75} /> },
      { id: "citation", label: "Citation", icon: <FileText size={20} strokeWidth={1.75} /> },
    ],
  },
];
