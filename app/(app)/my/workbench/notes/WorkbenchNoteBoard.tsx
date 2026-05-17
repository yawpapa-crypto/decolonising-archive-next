"use client";

export type {
  BoardCardColour,
  BoardCardType,
  BoardCardColumn,
  BoardCardStatus,
  BoardWorkflowStatus,
  WorkbenchBoardCard,
  WorkbenchBoardData,
} from "./workbench-board-types";

export {
  normalizeCardType,
  createDefaultBoardCard,
  cardHtml,
} from "./workbench-note-board-core";

export {
  getImmersiveFallbackPosition,
  FIGMA_PRESENTATION_POSITIONS,
  resolveNotePosition,
  applyNoteDisplayFallback,
  presentNotesForBoard,
} from "./workbench-board-presentation";

export { default } from "./workbench-note-board-bridge";
