export type ArchiveGuideState =
  | "idle"
  | "listening"
  | "thinking"
  | "curious"
  | "encouraging"
  | "pointing"
  | "celebrating"
  | "careful"
  | "sleeping";

export type ArchiveGuideArea =
  | "library"
  | "record"
  | "reading_list"
  | "workbench_document"
  | "workbench_board"
  | "workbench_canvas"
  | "community";

export type ArchiveGuideMode =
  | "expand_search"
  | "ask_better_questions"
  | "compare_sources"
  | "what_am_i_missing"
  | "build_reading_path"
  | "cultural_care_check"
  | "reflect_on_process"
  | "suggest_next_step";

export type ArchiveGuideContextItem = {
  id?: string;
  title: string;
  snippet?: string;
  provider?: string;
  creator?: string;
  date?: string;
  type?: string;
};

export type ArchiveGuideStructuredContext = {
  area: ArchiveGuideArea;
  title?: string;
  query?: string;
  previousQueries?: string[];
  resultCount?: number;
  filters?: string[];
  results?: ArchiveGuideContextItem[];
  savedRecords?: ArchiveGuideContextItem[];
  readingListItems?: ArchiveGuideContextItem[];
  boardCards?: ArchiveGuideContextItem[];
  boardLayout?: string;
  canvasObjects?: ArchiveGuideContextItem[];
  publicThread?: {
    title?: string;
    bodySnippet?: string;
    commentSnippets?: string[];
  };
  privacyNote?: string;
};

export type ArchiveGuideNextAction = {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
};

export type ArchiveGuideSuccess = {
  ok: true;
  /** The mode that produced this response — used by the renderer for mode-specific section labels. */
  mode: ArchiveGuideMode;
  /** True when Gemini was unavailable and the response came from the offline fallback. */
  isFallback?: boolean;
  response: string;
  learningMove: string;
  guidingQuestions: string[];
  suggestedSearches: string[];
  /** Optional parallel array to suggestedSearches — one short reason per search explaining what it surfaces. */
  searchReasons?: string[];
  nextActions: ArchiveGuideNextAction[];
  characterState: ArchiveGuideState;
};

export type ArchiveGuideFailure = {
  ok: false;
  error: string;
};

export type ArchiveGuideApiResponse = ArchiveGuideSuccess | ArchiveGuideFailure;
