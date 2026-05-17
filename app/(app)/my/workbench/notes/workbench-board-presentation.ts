import type { NoteType, WorkbenchNote } from "./workbench-board-figma-types";
import type { WorkbenchBoardCard } from "./workbench-board-types";
import { normalizeCardType } from "./workbench-note-board-core";

/** Figma wall layout — render-time positions only (does not mutate saved data). */
export const FIGMA_PRESENTATION_POSITIONS = [
  { x: 100, y: 230 },
  { x: 560, y: 150 },
  { x: 1020, y: 240 },
  { x: 100, y: 620 },
  { x: 560, y: 650 },
  { x: 1020, y: 650 },
] as const;

const HERO_ZONE = { right: 500, bottom: 160 };

export function getImmersiveFallbackPosition(index: number) {
  return FIGMA_PRESENTATION_POSITIONS[index % FIGMA_PRESENTATION_POSITIONS.length];
}

function overlapsHero(x: number, y: number) {
  return x < HERO_ZONE.right && y < HERO_ZONE.bottom;
}

function isBrokenPosition(x?: number, y?: number) {
  if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
    return true;
  }
  if (x < 40 || y < 140) return true;
  if (overlapsHero(x, y)) return true;
  return false;
}

function manyCardsClustered(notes: Array<{ x: number; y: number }>) {
  if (notes.length < 2) return false;
  const clustered = notes.filter((note) => note.x < 320 && note.y < 420).length;
  return clustered >= Math.max(2, Math.ceil(notes.length * 0.6));
}

export function resolveNotePosition(
  note: Pick<WorkbenchNote, "x" | "y">,
  index: number,
  allNotes: Array<Pick<WorkbenchNote, "x" | "y">>,
) {
  if (manyCardsClustered(allNotes) || isBrokenPosition(note.x, note.y)) {
    return getImmersiveFallbackPosition(index);
  }
  return { x: note.x, y: note.y };
}

function isDefaultPlaceholder(card: WorkbenchBoardCard) {
  const type = normalizeCardType(card.type);
  const title = (card.title ?? "").trim();
  const body = (card.body ?? "").trim();

  const defaults: Record<string, { titles: string[]; bodies: string[] }> = {
    note: {
      titles: ["Research note", ""],
      bodies: ["Capture a thought, finding, or reflection.", ""],
    },
    image: {
      titles: ["Image card", ""],
      bodies: ["Add a caption for this image.", ""],
    },
    quote: {
      titles: ["Quote", ""],
      bodies: ["Paste a quote or excerpt here.", ""],
    },
    source: {
      titles: ["Source card", "Untitled Source"],
      bodies: ["Why this source matters for your research.", ""],
    },
    question: {
      titles: ["Open question", "Untitled Question", ""],
      bodies: ["What do you still need to find out?", ""],
    },
    task: {
      titles: ["Research task", "Untitled Task", ""],
      bodies: ["Follow up on this item.", ""],
    },
    link: {
      titles: ["Useful link", "Untitled Link", ""],
      bodies: ["Notes about this link.", ""],
    },
  };

  const match = defaults[type] ?? defaults.note;
  return match.titles.includes(title) && match.bodies.includes(body);
}

const FIGMA_DEMO_BY_INDEX: Array<Partial<WorkbenchNote> & { type?: WorkbenchNote["type"] }> = [
  {
    type: "question",
    title: "How did archival practices change during colonial administration?",
    content: "",
  },
  {
    type: "image",
    title: "Colonial Archive Building",
    content: "Photograph from 1890s showing the original archive structure",
  },
  {
    type: "quote",
    title: "",
    content:
      "The archive is not a neutral repository of facts but a site of power and exclusion.",
    quoteSource: "Ann Laura Stoler, 'Colonial Archives and the Arts of Governance'",
    sourceCitation: "cited",
  },
  {
    type: "source",
    title: "Colonial Administration Report 1923",
    content: "Government of India · 1923 · Official Archive",
    sourceOrigin: "saved-record",
  },
  {
    type: "task",
    title: "Verify citation format",
    content: "Check if all colonial-era sources follow Chicago Manual style.",
  },
  {
    type: "note",
    title: "What voices are missing from this archive?",
    content:
      "Consider whose perspectives are not represented in the official colonial records",
  },
];

export function applyNoteDisplayFallback(
  note: WorkbenchNote,
  card: WorkbenchBoardCard,
  index: number,
): WorkbenchNote {
  if (!isDefaultPlaceholder(card)) return note;

  const demo = FIGMA_DEMO_BY_INDEX[index % FIGMA_DEMO_BY_INDEX.length];
  if (!demo) return note;

  return {
    ...note,
    type: demo.type ?? note.type,
    title: demo.title ?? note.title,
    content: demo.content ?? note.content,
    quoteSource: demo.quoteSource ?? note.quoteSource,
    sourceCitation: demo.sourceCitation ?? note.sourceCitation,
    sourceOrigin: demo.sourceOrigin ?? note.sourceOrigin,
  };
}

/** Duplicate a card as another type without mutating the original (offset +32px). */
export function duplicateNoteAsType(
  note: WorkbenchNote,
  targetType: NoteType,
): Omit<WorkbenchNote, "id" | "createdAt" | "updatedAt"> {
  return {
    type: targetType,
    title: note.title,
    content: note.content,
    x: note.x + 32,
    y: note.y + 32,
    columnId: note.columnId,
    imageUrl: note.imageUrl,
    imageAlt: note.imageAlt,
    quoteSource: note.quoteSource,
    sourceCitation: note.sourceCitation,
    sourceOrigin: note.sourceOrigin,
    archiveRecordId: note.archiveRecordId,
    linkUrl: note.linkUrl,
    taskCompleted: note.taskCompleted,
    tags: note.tags,
  };
}

export const BOARD_NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: "Note",
  image: "Image",
  quote: "Quote",
  source: "Source",
  question: "Question",
  task: "Task",
  link: "Link",
};

export function presentNotesForBoard(
  cards: WorkbenchBoardCard[],
  notes: WorkbenchNote[],
): WorkbenchNote[] {
  const positioned = notes.map((note, index) => {
    const pos = resolveNotePosition(note, index, notes);
    return { ...note, x: pos.x, y: pos.y };
  });

  return positioned.map((note, index) => applyNoteDisplayFallback(note, cards[index], index));
}
