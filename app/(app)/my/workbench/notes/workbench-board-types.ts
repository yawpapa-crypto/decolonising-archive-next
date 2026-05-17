export type BoardCardColour = "lemon" | "pink" | "blue" | "green" | "lavender" | "cream" | "white";

export type BoardCardType =
  | "note"
  | "image"
  | "quote"
  | "source"
  | "question"
  | "task"
  | "link"
  | "imagePlaceholder";

export type BoardWorkflowStatus = "collecting" | "reviewing" | "ready" | "used";

/** @deprecated Kanban lanes kept for persisted data compatibility only */
export type BoardCardStatus = "draft" | "review" | "important" | "ready";
/** @deprecated Kanban lanes kept for persisted data compatibility only */
export type BoardCardColumn = "collecting" | "reviewing" | "ready";

export type WorkbenchBoardCard = {
  id: string;
  type: BoardCardType;
  title: string;
  body: string;
  order?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
  linkUrl?: string;
  colour?: BoardCardColour;
  tag?: string;
  linkedRecordId?: string | null;
  sourceOrigin?: BoardSourceOrigin | null;
  taskDone?: boolean;
  workflowStatus?: BoardWorkflowStatus;
  cited?: boolean;
  usedInDocument?: boolean;
  createdAt?: string;
  updatedAt?: string;
  status?: BoardCardStatus;
  column?: BoardCardColumn;
};

export type BoardSortMode =
  | "manual"
  | "newest"
  | "oldest"
  | "type"
  | "colour"
  | "source"
  | "recently-edited";

export type BoardFilterType =
  | "all"
  | "note"
  | "image"
  | "quote"
  | "source"
  | "question"
  | "task"
  | "link";

export type BoardViewDensity = "comfortable" | "compact" | "gallery";

export type BoardLayoutMode = "wall" | "grid" | "columns" | "gallery" | "storyboard" | "map";

export type BoardVisualTheme =
  | "archive-paper"
  | "gallery-light"
  | "green-field"
  | "dark-storyboard"
  | "night-archive"
  | "map-research";

export type BoardSourceOrigin = "bookmark" | "reading_list" | "linked";

export type BoardSmartChip =
  | "needs-citation"
  | "has-image"
  | "unsorted"
  | "questions"
  | "ready-for-writing"
  | "missing-alt";

export type WorkbenchBoardSettings = {
  sort?: BoardSortMode;
  filter?: BoardFilterType;
  search?: string;
  density?: BoardViewDensity;
  layout?: BoardLayoutMode;
  boardTheme?: BoardVisualTheme;
  smartChip?: BoardSmartChip | null;
};

export type WorkbenchBoardData = {
  cards: WorkbenchBoardCard[];
  settings?: WorkbenchBoardSettings;
};
