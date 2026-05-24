import type { CanvasObjectType } from "./workbench-canvas-types";

export const CANVAS_TYPE_LABELS: Record<CanvasObjectType, string> = {
  text: "Text block",
  sticky: "Sticky note",
  shape: "Shape",
  line: "Line",
  arrow: "Arrow",
  connector: "Connector",
  frame: "Section frame",
  image: "Image card",
  source: "Archive source",
  quote: "Quote card",
  question: "Question",
  task: "Task",
  link: "Link",
  comment: "Comment",
  citation: "Citation",
};
