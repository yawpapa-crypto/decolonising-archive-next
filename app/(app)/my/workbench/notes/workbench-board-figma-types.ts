// Figma Make immersive board types (from Immersive Research Board Design export)

export type NoteType = "note" | "image" | "quote" | "source" | "question" | "task" | "link";

export type BoardLayout = "wall" | "columns" | "storyboard" | "gallery" | "map";

export type BoardTheme =
  | "archive-paper"
  | "dark-storyboard"
  | "green-field"
  | "night-archive"
  | "gallery-light";

export type ColumnId = "collecting" | "reviewing" | "ready" | "used";

export interface WorkbenchNote {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  x: number;
  y: number;
  columnId?: ColumnId;
  imageUrl?: string;
  imageAlt?: string;
  quoteSource?: string;
  sourceCitation?: string;
  sourceOrigin?: "bookmark" | "reading-list" | "saved-record" | "project";
  archiveRecordId?: string;
  linkUrl?: string;
  taskCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface BoardState {
  layout: BoardLayout;
  theme: BoardTheme;
  zoom: number;
  panX: number;
  panY: number;
  isFullscreen: boolean;
  controlsVisible: boolean;
  selectedNoteIds: string[];
}
