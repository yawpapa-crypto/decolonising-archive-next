export type WorkbenchUserPreferences = {
  user_id: string;
  preferred_citation_style: string;
  preferred_board_view: string;
  preferred_note_mode: string;
  dismissed_suggestions: string[];
  pinned_collections: string[];
  updated_at: string;
};

export type IntelligenceItemType =
  | "record"
  | "reading_list_item"
  | "note"
  | "board_card"
  | "citation"
  | "task"
  | "canvas_block";

export type IntelligenceSource =
  | "bookmark"
  | "reading_list"
  | "project"
  | "note"
  | "board"
  | "canvas";

export type IntelligenceWorkflowStatus =
  | "unsorted"
  | "collecting"
  | "reviewing"
  | "cited"
  | "used"
  | "ready"
  | "needs_metadata"
  | "needs_cultural_care";

export type IntelligenceFilter =
  | "all"
  | "unsorted"
  | "bookmarks"
  | "reading_lists"
  | "projects"
  | "cited"
  | "uncited"
  | "needs_metadata"
  | "needs_action"
  | "questions"
  | "images"
  | "tasks";

export type IntelligenceSummaryKey =
  | "saved_records"
  | "reading_lists"
  | "cited_records"
  | "uncited_records"
  | "unsorted_records"
  | "open_questions"
  | "images_needing_alt"
  | "needs_metadata"
  | "needs_cultural_care"
  | "ready_to_export";

export type SuggestionConfidence = "low" | "medium" | "high";

export type IntelligenceRelation = {
  kind: string;
  label: string;
  href?: string;
};

export type IntelligenceItem = {
  id: string;
  title: string;
  subtitle?: string;
  type: IntelligenceItemType;
  source: IntelligenceSource;
  recordId?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  readingListId?: string | null;
  readingListTitle?: string | null;
  noteId?: string | null;
  noteTitle?: string | null;
  status: IntelligenceWorkflowStatus;
  cited: boolean;
  usedInWriting: boolean;
  creator?: string | null;
  date?: string | null;
  sourceLabel?: string | null;
  openHref?: string;
  collections: string[];
  relations: IntelligenceRelation[];
};

export type IntelligenceCollection = {
  id: string;
  title: string;
  description: string;
  itemIds: string[];
};

export type IntelligenceSuggestion = {
  id: string;
  type: string;
  title: string;
  body: string;
  reason: string;
  actionLabel: string;
  actionHref?: string;
  confidence: SuggestionConfidence;
  dismissible: boolean;
  filter?: IntelligenceFilter;
  summaryKey?: IntelligenceSummaryKey;
  collectionId?: string;
};

export type UserResearchProfile = {
  totalSavedRecords: number;
  totalReadingLists: number;
  totalNotes: number;
  totalCitations: number;
  totalBoardCards: number;
  totalCanvasBlocks: number;
  totalTasks: number;
  unsortedSavedRecords: number;
  recordsInReadingLists: number;
  recordsLinkedToProjects: number;
  recordsCitedInNotes: number;
  recordsNotYetCited: number;
  imageCardsMissingAlt: number;
  openQuestionCards: number;
  boardCardsNotSentToDocument: number;
  frequentCitationStyle: string | null;
  frequentSourceTypes: string[];
  activeProjects: Array<{ id: string; title: string; recordCount: number; taskCount: number }>;
  recentActivity: Array<{
    eventType: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
};

export type IntelligenceSnapshot = {
  items: IntelligenceItem[];
  collections: IntelligenceCollection[];
  summary: Record<IntelligenceSummaryKey, number>;
  suggestions: IntelligenceSuggestion[];
  profile: UserResearchProfile;
  preferences: WorkbenchUserPreferences | null;
  recordRelations: Array<{
    recordId: string;
    title: string;
    relations: IntelligenceRelation[];
  }>;
  errors: string[];
};
