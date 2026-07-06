import type {
  BoardLayoutMode,
  BoardSourceOrigin,
  BoardVisualTheme,
  BoardWorkflowStatus,
  WorkbenchBoardCard,
  WorkbenchBoardSettings,
} from "./workbench-board-types";
import type { BoardLayout, BoardState, BoardTheme, ColumnId, NoteType, WorkbenchNote } from "./workbench-board-figma-types";

const FIGMA_LAYOUTS: BoardLayout[] = ["wall", "columns", "storyboard", "gallery", "map"];

function fallbackBoardPosition(index: number) {
  return {
    x: 80 + (index % 5) * 360,
    y: 220 + Math.floor(index / 5) * 280,
  };
}

function cardPosition(card: WorkbenchBoardCard, index: number) {
  const fallback = fallbackBoardPosition(typeof card.order === "number" ? card.order : index);
  return {
    x: typeof card.x === "number" ? card.x : fallback.x,
    y: typeof card.y === "number" ? card.y : fallback.y,
  };
}

function normalizeWorkflow(card: WorkbenchBoardCard): BoardWorkflowStatus {
  if (
    card.workflowStatus === "collecting" ||
    card.workflowStatus === "reviewing" ||
    card.workflowStatus === "ready" ||
    card.workflowStatus === "used"
  ) {
    return card.workflowStatus;
  }
  if (card.column === "reviewing") return "reviewing";
  if (card.column === "ready") return "ready";
  return "collecting";
}

function workflowToColumn(status: BoardWorkflowStatus): ColumnId {
  return status;
}

function mapSourceOriginToFigma(
  origin: BoardSourceOrigin | null | undefined,
): WorkbenchNote["sourceOrigin"] | undefined {
  switch (origin) {
    case "bookmark":
      return "bookmark";
    case "reading_list":
      return "reading-list";
    case "linked":
      return "project";
    default:
      return undefined;
  }
}

function mapSourceOriginFromFigma(
  origin: WorkbenchNote["sourceOrigin"],
): BoardSourceOrigin | null {
  switch (origin) {
    case "bookmark":
      return "bookmark";
    case "reading-list":
      return "reading_list";
    case "project":
    case "saved-record":
      return "linked";
    default:
      return null;
  }
}

export function normalizeFigmaTheme(raw: BoardVisualTheme | string | undefined): BoardTheme {
  switch (raw) {
    case "gallery-light":
    case "green-field":
    case "dark-storyboard":
    case "night-archive":
    case "archive-paper":
      return raw;
    case "map-research":
      return "night-archive";
    case "archive-neutral":
    case "warm-paper":
      return "archive-paper";
    case "gallery-green":
      return "green-field";
    case "storyboard-dark":
    case "dark-archive":
      return "dark-storyboard";
    default:
      return "archive-paper";
  }
}

function figmaThemeToSettings(theme: BoardTheme): BoardVisualTheme {
  return theme;
}

function figmaLayoutToSettings(layout: BoardLayout): BoardLayoutMode {
  return layout;
}

function settingsLayoutToFigma(layout: BoardLayoutMode | undefined): BoardLayout {
  if (layout === "grid") return "wall";
  if (layout && FIGMA_LAYOUTS.includes(layout as BoardLayout)) {
    return layout as BoardLayout;
  }
  return "wall";
}

export function cardToNote(card: WorkbenchBoardCard, index: number): WorkbenchNote {
  const pos = cardPosition(card, index);
  const rawType = card.type === "imagePlaceholder" ? "image" : card.type;
  const type = (
    rawType === "image" ||
    rawType === "quote" ||
    rawType === "source" ||
    rawType === "question" ||
    rawType === "task" ||
    rawType === "link"
      ? rawType
      : "note"
  ) as NoteType;

  return {
    id: card.id,
    type,
    title: card.title ?? "",
    content: card.body ?? "",
    x: pos.x,
    y: pos.y,
    columnId: workflowToColumn(normalizeWorkflow(card)),
    imageUrl: card.imageUrl,
    imageAlt: card.imageAlt,
    linkUrl: card.linkUrl,
    taskCompleted: card.taskDone,
    archiveRecordId: card.linkedRecordId ?? undefined,
    sourceOrigin: mapSourceOriginToFigma(card.sourceOrigin),
    sourceCitation: card.cited ? "cited" : undefined,
    createdAt: card.createdAt ? Date.parse(card.createdAt) : Date.now(),
    updatedAt: card.updatedAt ? Date.parse(card.updatedAt) : Date.now(),
  };
}

export function notePatchToCard(patch: Partial<WorkbenchNote>): Partial<WorkbenchBoardCard> {
  const out: Partial<WorkbenchBoardCard> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.content !== undefined) out.body = patch.content;
  if (patch.x !== undefined) out.x = patch.x;
  if (patch.y !== undefined) out.y = patch.y;
  if (patch.columnId !== undefined) {
    out.workflowStatus = patch.columnId;
    out.column =
      patch.columnId === "used"
        ? "ready"
        : patch.columnId === "reviewing"
          ? "reviewing"
          : "collecting";
  }
  if (patch.imageUrl !== undefined) out.imageUrl = patch.imageUrl;
  if (patch.imageAlt !== undefined) out.imageAlt = patch.imageAlt;
  if (patch.linkUrl !== undefined) out.linkUrl = patch.linkUrl;
  if (patch.taskCompleted !== undefined) out.taskDone = patch.taskCompleted;
  if (patch.archiveRecordId !== undefined) out.linkedRecordId = patch.archiveRecordId;
  if (patch.sourceOrigin !== undefined) out.sourceOrigin = mapSourceOriginFromFigma(patch.sourceOrigin);
  return out;
}

export function noteToCardFields(
  note: Omit<WorkbenchNote, "id" | "createdAt" | "updatedAt">,
): Omit<WorkbenchBoardCard, "id" | "createdAt" | "updatedAt"> {
  return {
    type: note.type,
    title: note.title,
    body: note.content,
    x: note.x,
    y: note.y,
    workflowStatus: note.columnId,
    column:
      note.columnId === "used"
        ? "ready"
        : note.columnId === "reviewing"
          ? "reviewing"
          : "collecting",
    imageUrl: note.imageUrl,
    imageAlt: note.imageAlt,
    linkUrl: note.linkUrl,
    taskDone: note.taskCompleted,
    linkedRecordId: note.archiveRecordId ?? null,
    sourceOrigin: mapSourceOriginFromFigma(note.sourceOrigin),
  };
}

export function settingsToBoardState(
  settings: WorkbenchBoardSettings | undefined,
  ui: Pick<BoardState, "zoom" | "panX" | "panY" | "isFullscreen" | "controlsVisible" | "selectedNoteIds">,
): BoardState {
  return {
    layout: settingsLayoutToFigma(settings?.layout),
    theme: normalizeFigmaTheme(settings?.boardTheme),
    zoom: ui.zoom,
    panX: ui.panX,
    panY: ui.panY,
    isFullscreen: ui.isFullscreen,
    controlsVisible: ui.controlsVisible,
    selectedNoteIds: ui.selectedNoteIds,
  };
}

export function boardStatePatchToSettings(
  patch: Partial<BoardState>,
  prev: WorkbenchBoardSettings,
): WorkbenchBoardSettings {
  const next = { ...prev };
  if (patch.layout !== undefined) {
    next.layout = figmaLayoutToSettings(patch.layout);
    if (patch.layout === "gallery") next.density = "gallery";
    else if (next.density === "gallery") next.density = "comfortable";
  }
  if (patch.theme !== undefined) {
    next.boardTheme = figmaThemeToSettings(patch.theme);
  }
  return next;
}
