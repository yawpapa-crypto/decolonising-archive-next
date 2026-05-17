import type { BookmarkRow, ReadingListItemRow, ReadingListRow } from "@/src/lib/member-workspace";
import { getMemberWorkspaceData, workspaceRecordTitle } from "@/src/lib/member-workspace";
import type { ArchiveRecord } from "@/lib/records";
import {
  listAllWorkbenchProjectRecords,
  listAllWorkbenchTasks,
  listWorkbenchNotes,
  listWorkbenchProjects,
  type WorkbenchNoteWithProject,
  type WorkbenchProjectRecordRow,
  type WorkbenchProjectRow,
  type WorkbenchTaskRow,
} from "@/lib/workbench-data";
type ParsedBoardCard = {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  linkedRecordId?: string | null;
  cited?: boolean;
  usedInDocument?: boolean;
  workflowStatus?: string;
};

import {
  getWorkbenchUserPreferences,
  listRecentWorkbenchActivity,
} from "@/lib/workbench-activity-actions";
import type {
  IntelligenceCollection,
  IntelligenceItem,
  IntelligenceRelation,
  IntelligenceSnapshot,
  IntelligenceSuggestion,
  IntelligenceSummaryKey,
  UserResearchProfile,
} from "@/lib/workbench-intelligence-types";

export type {
  IntelligenceCollection,
  IntelligenceFilter,
  IntelligenceItem,
  IntelligenceItemType,
  IntelligenceRelation,
  IntelligenceSnapshot,
  IntelligenceSuggestion,
  IntelligenceSource,
  IntelligenceSummaryKey,
  IntelligenceWorkflowStatus,
  UserResearchProfile,
} from "@/lib/workbench-intelligence-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseBoardCards(note: WorkbenchNoteWithProject): ParsedBoardCard[] {
  const json = note.content_json;
  if (!isRecord(json?.workbenchBoard)) return [];
  const rawCards = Array.isArray(json.workbenchBoard.cards) ? json.workbenchBoard.cards : [];
  return rawCards.filter(isRecord).map((card, index) => {
    const rawType = textValue(card.type, "note");
    const type =
      rawType === "image" || rawType === "imagePlaceholder"
        ? "image"
        : rawType === "quote" ||
            rawType === "source" ||
            rawType === "question" ||
            rawType === "task" ||
            rawType === "link"
          ? rawType
          : "note";
    return {
      id: textValue(card.id, `board-${note.id}-${index}`),
      type,
      title: textValue(card.title, "Untitled card"),
      body: textValue(card.body, ""),
      imageUrl: typeof card.imageUrl === "string" ? card.imageUrl : undefined,
      imageAlt: typeof card.imageAlt === "string" ? card.imageAlt : undefined,
      linkedRecordId: typeof card.linkedRecordId === "string" ? card.linkedRecordId : null,
      cited: card.cited === true,
      usedInDocument: card.usedInDocument === true,
      workflowStatus:
        card.workflowStatus === "reviewing" ||
        card.workflowStatus === "ready" ||
        card.workflowStatus === "used"
          ? card.workflowStatus
          : "collecting",
    };
  });
}

function parseCanvasBlocks(note: WorkbenchNoteWithProject) {
  const json = note.content_json;
  if (!isRecord(json?.workbenchCanvas)) return [];
  const blocks = Array.isArray(json.workbenchCanvas.blocks) ? json.workbenchCanvas.blocks : [];
  return blocks.filter(isRecord).map((block, index) => ({
    id: textValue(block.id, `canvas-${note.id}-${index}`),
    type: textValue(block.type, "text"),
    content: textValue(block.content, ""),
    linkedRecordId: typeof block.linkedRecordId === "string" ? block.linkedRecordId : null,
  }));
}

function parseCitations(note: WorkbenchNoteWithProject) {
  const json = note.content_json;
  if (!Array.isArray(json?.workbenchCitations)) return [];
  return json.workbenchCitations.filter(isRecord).map((citation, index) => ({
    id: textValue(citation.id, `citation-${note.id}-${index}`),
    recordId: typeof citation.recordId === "string" ? citation.recordId : null,
    title: textValue(citation.title, "Untitled source"),
    sourceType: textValue(citation.sourceType, "custom"),
    style: textValue(citation.style, ""),
    readingListId: typeof citation.readingListId === "string" ? citation.readingListId : null,
    readingListTitle:
      typeof citation.readingListTitle === "string" ? citation.readingListTitle : null,
    creator: typeof citation.creator === "string" ? citation.creator : null,
    date: typeof citation.date === "string" ? citation.date : null,
  }));
}

function recordHref(recordId: string) {
  const id = recordId.replace(/-\d+$/, "");
  return `/records/${encodeURIComponent(id)}`;
}

function missingMetadataForBookmark(bookmark: BookmarkRow) {
  return !bookmark.record_source?.trim() && !bookmark.record_source_url?.trim();
}

function missingMetadataForListItem(item: ReadingListItemRow) {
  return (
    !item.record_author?.trim() &&
    !item.record_year?.trim() &&
    !item.record_source?.trim() &&
    !item.record_source_url?.trim()
  );
}

function isQuestionTask(task: WorkbenchTaskRow) {
  const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
  return task.review_type === "question" || haystack.includes("question");
}

function frequentValue(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function buildIntelligenceSuggestions(input: {
  collections: IntelligenceCollection[];
  summary: Record<IntelligenceSummaryKey, number>;
  projects: WorkbenchProjectRow[];
  projectRecords: WorkbenchProjectRecordRow[];
  tasks: Array<WorkbenchTaskRow & { project_title: string }>;
  readingLists: ReadingListRow[];
  readingListItems: ReadingListItemRow[];
  boardCardsNotSent: number;
  imageCardsMissingAlt: number;
  dismissedIds: Set<string>;
}): IntelligenceSuggestion[] {
  const suggestions: IntelligenceSuggestion[] = [];
  const unsortedCount = input.collections.find((c) => c.id === "unsorted_records")?.itemIds.length ?? 0;

  if (unsortedCount) {
    suggestions.push({
      id: "unsorted-records",
      type: "organisation",
      title: "You saved records. Here’s how to organise them.",
      body: `You have ${unsortedCount} saved record${unsortedCount === 1 ? "" : "s"} not in any reading list or project.`,
      reason: "These bookmarks are only in Saved Records — not yet grouped for reading or project work.",
      actionLabel: "Review saved records",
      actionHref: "/my/workbench/saved-records",
      confidence: unsortedCount >= 5 ? "high" : "medium",
      dismissible: true,
      filter: "unsorted",
      summaryKey: "unsorted_records",
      collectionId: "unsorted_records",
    });
  }

  const uncitedInLists = input.summary.uncited_records;
  if (uncitedInLists) {
    suggestions.push({
      id: "uncited-reading-list",
      type: "citation",
      title: "You have uncited sources in reading lists",
      body: `${uncitedInLists} record${uncitedInLists === 1 ? "" : "s"} in reading lists have not yet been cited in notes.`,
      reason: "These sources are in your reading list but not yet in your literature review note.",
      actionLabel: "Open Notes",
      actionHref: "/my/workbench/notes",
      confidence: uncitedInLists >= 3 ? "high" : "medium",
      dismissible: true,
      filter: "uncited",
      collectionId: "needs_citation",
    });
  }

  if (input.boardCardsNotSent > 0) {
    suggestions.push({
      id: "board-not-sent",
      type: "board",
      title: "Board cards waiting for your document",
      body: `${input.boardCardsNotSent} board card${input.boardCardsNotSent === 1 ? "" : "s"} have not been sent to a document.`,
      reason: "Cards on your board that are not yet marked as used in writing.",
      actionLabel: "Open Board",
      actionHref: "/my/workbench/notes",
      confidence: input.boardCardsNotSent >= 4 ? "high" : "medium",
      dismissible: true,
      filter: "needs_action",
      collectionId: "board_not_sent_to_document",
    });
  }

  if (input.imageCardsMissingAlt > 0) {
    suggestions.push({
      id: "images-missing-alt",
      type: "accessibility",
      title: "These image cards need alt text",
      body: `${input.imageCardsMissingAlt} image card${input.imageCardsMissingAlt === 1 ? "" : "s"} need alt text and can be grouped into a visual board.`,
      reason: "Alt text supports accessibility and careful description of visual material.",
      actionLabel: "Review images",
      actionHref: "/my/workbench/notes",
      confidence: "medium",
      dismissible: true,
      filter: "images",
      summaryKey: "images_needing_alt",
      collectionId: "images_missing_alt",
    });
  }

  const questionCards = input.summary.open_questions;
  if (questionCards) {
    suggestions.push({
      id: "open-questions",
      type: "tasks",
      title: "Open questions could become tasks",
      body: `You have ${questionCards} open question${questionCards === 1 ? "" : "s"} that could become tasks.`,
      reason: "Question cards and question-like tasks are still open in your workbench.",
      actionLabel: "Review tasks",
      actionHref: "/my/workbench/tasks",
      confidence: "medium",
      dismissible: true,
      filter: "questions",
      collectionId: "open_questions",
    });
  }

  if (input.summary.cited_records > 0) {
    suggestions.push({
      id: "citation-export-ready",
      type: "export",
      title: "Citation export ready",
      body: `You have notes with ${input.summary.cited_records} cited record${input.summary.cited_records === 1 ? "" : "s"}. Export a bibliography or citation pack.`,
      reason: "Citations in your notes can be exported for review or sharing.",
      actionLabel: "Open exports",
      actionHref: "/my/workbench/exports",
      confidence: "high",
      dismissible: true,
      summaryKey: "ready_to_export",
    });
  }

  const readyExportCount = input.collections.find((c) => c.id === "ready_to_export")?.itemIds.length ?? 0;
  if (readyExportCount >= 3) {
    suggestions.push({
      id: "teaching-pack-ready",
      type: "export",
      title: "These records can become a teaching pack",
      body: `${readyExportCount} items are cited or used in writing and may be ready to export.`,
      reason: "Grouped records and writing activity suggest an export-ready collection.",
      actionLabel: "Review exports",
      actionHref: "/my/workbench/exports",
      confidence: "medium",
      dismissible: true,
      collectionId: "ready_to_export",
    });
  }

  for (const list of input.readingLists) {
    const count = input.readingListItems.filter((item) => item.reading_list_id === list.id).length;
    if (count >= 3) {
      suggestions.push({
        id: `reading-list-ready-${list.id}`,
        type: "reading_list",
        title: `Reading list may be ready: ${list.title}`,
        body: `This reading list has ${count} records and may be ready to export.`,
        reason: "Reading lists with several records are often ready for review or export.",
        actionLabel: "Review reading lists",
        actionHref: "/my/workbench/reading-lists",
        confidence: count >= 6 ? "high" : "low",
        dismissible: true,
      });
    }
  }

  for (const project of input.projects) {
    const recordCount = input.projectRecords.filter((row) => row.project_id === project.id).length;
    const taskCount = input.tasks.filter((task) => task.project_id === project.id).length;
    if (recordCount > 0 && taskCount === 0) {
      suggestions.push({
        id: `project-gap-${project.id}`,
        type: "project",
        title: `Project gap: ${project.title}`,
        body: `This project has ${recordCount} record${recordCount === 1 ? "" : "s"} but no tasks yet.`,
        reason: "Projects with records but no tasks may need review steps or milestones.",
        actionLabel: "Review project",
        actionHref: `/my/workbench/projects/${project.id}`,
        confidence: "medium",
        dismissible: true,
        filter: "tasks",
      });
    }
  }

  const culturalCount =
    input.collections.find((c) => c.id === "needs_cultural_care")?.itemIds.length ?? 0;
  if (culturalCount) {
    suggestions.push({
      id: "cultural-care-review",
      type: "cultural_care",
      title: "Review cultural care metadata",
      body: `${culturalCount} record${culturalCount === 1 ? "" : "s"} are flagged for cultural care review in your projects.`,
      reason: "Review prompts are based on your project flags — not automated sensitive labelling.",
      actionLabel: "Review records",
      actionHref: "/my/workbench/saved-records",
      confidence: "low",
      dismissible: true,
      collectionId: "needs_cultural_care",
    });
  }

  return suggestions.filter((suggestion) => !input.dismissedIds.has(suggestion.id));
}

export function buildWorkbenchIntelligenceSnapshot(input: {
  bookmarks: BookmarkRow[];
  readingLists: ReadingListRow[];
  readingListItems: ReadingListItemRow[];
  recordsById: Map<string, ArchiveRecord>;
  projects: WorkbenchProjectRow[];
  projectRecords: WorkbenchProjectRecordRow[];
  notes: WorkbenchNoteWithProject[];
  tasks: Array<WorkbenchTaskRow & { project_title: string }>;
  dismissedSuggestionIds?: string[];
  recentActivity?: UserResearchProfile["recentActivity"];
}): IntelligenceSnapshot {
  const items: IntelligenceItem[] = [];
  const errors: string[] = [];

  const readingListTitleById = new Map(input.readingLists.map((l) => [l.id, l.title]));
  const projectTitleById = new Map(input.projects.map((p) => [p.id, p.title]));

  const recordIdsInLists = new Set(input.readingListItems.map((i) => i.record_id));
  const recordIdsInProjects = new Set(input.projectRecords.map((r) => r.record_id));
  const citedRecordIds = new Set<string>();
  const usedRecordIds = new Set<string>();

  const projectRecordByRecordId = new Map<string, WorkbenchProjectRecordRow[]>();
  for (const row of input.projectRecords) {
    const list = projectRecordByRecordId.get(row.record_id) ?? [];
    list.push(row);
    projectRecordByRecordId.set(row.record_id, list);
  }

  const citationsByRecord = new Map<string, IntelligenceRelation[]>();
  const boardByRecord = new Map<string, IntelligenceRelation[]>();
  const canvasByRecord = new Map<string, IntelligenceRelation[]>();
  const citationStyles: string[] = [];
  const citationSourceTypes: string[] = [];
  let totalCitations = 0;
  let totalBoardCards = 0;
  let totalCanvasBlocks = 0;
  let imageCardsMissingAlt = 0;
  let boardCardsNotSentToDocument = 0;
  const listMembership = new Map<string, IntelligenceRelation[]>();
  const projectMembership = new Map<string, IntelligenceRelation[]>();
  const bookmarkByRecord = new Map<string, IntelligenceRelation>();

  for (const bookmark of input.bookmarks) {
    bookmarkByRecord.set(bookmark.record_id, {
      kind: "bookmark",
      label: "Saved bookmark",
      href: "/my/workbench/saved-records",
    });
  }

  for (const item of input.readingListItems) {
    const listTitle = readingListTitleById.get(item.reading_list_id) ?? "Reading list";
    const rel = {
      kind: "reading_list",
      label: `In reading list: ${listTitle}`,
      href: "/my/lists",
    };
    const existing = listMembership.get(item.record_id) ?? [];
    existing.push(rel);
    listMembership.set(item.record_id, existing);
  }

  for (const row of input.projectRecords) {
    const projectTitle = projectTitleById.get(row.project_id) ?? "Project";
    const rel = {
      kind: "project",
      label: `Project: ${projectTitle}`,
      href: `/my/workbench/projects/${row.project_id}`,
    };
    const existing = projectMembership.get(row.record_id) ?? [];
    existing.push(rel);
    projectMembership.set(row.record_id, existing);
    if (row.citation_checked) citedRecordIds.add(row.record_id);
    if (row.status === "used" || row.status === "ready") usedRecordIds.add(row.record_id);
  }

  for (const note of input.notes) {
    for (const citation of parseCitations(note)) {
      totalCitations += 1;
      if (citation.style) citationStyles.push(citation.style);
      if (citation.sourceType) citationSourceTypes.push(citation.sourceType);
      if (citation.recordId) {
        citedRecordIds.add(citation.recordId);
        const rel = {
          kind: "citation",
          label: `Cited in note: ${note.title}`,
          href: "/my/workbench/notes",
        };
        const existing = citationsByRecord.get(citation.recordId) ?? [];
        existing.push(rel);
        citationsByRecord.set(citation.recordId, existing);
      }

      items.push({
        id: `citation-${citation.id}`,
        title: citation.title,
        subtitle: note.title,
        type: "citation",
        source: "note",
        recordId: citation.recordId,
        noteId: note.id,
        noteTitle: note.title,
        projectId: note.project_id,
        projectTitle: note.project_title,
        readingListId: citation.readingListId,
        readingListTitle: citation.readingListTitle,
        status: "cited",
        cited: true,
        usedInWriting: true,
        creator: citation.creator,
        date: citation.date,
        sourceLabel: citation.sourceType,
        openHref: citation.recordId ? recordHref(citation.recordId) : "/my/workbench/notes",
        collections: ["cited_in_notes"],
        relations: [
          { kind: "note", label: `Note: ${note.title}`, href: "/my/workbench/notes" },
          ...(citation.recordId
            ? [{ kind: "record", label: "Archive record", href: recordHref(citation.recordId) }]
            : []),
        ],
      });
    }

    for (const card of parseBoardCards(note)) {
      totalBoardCards += 1;
      const isImage = card.type === "image" || Boolean(card.imageUrl?.trim());
      const missingAlt = isImage && !card.imageAlt?.trim();
      if (missingAlt) imageCardsMissingAlt += 1;
      if (!card.usedInDocument) boardCardsNotSentToDocument += 1;

      if (card.linkedRecordId) {
        if (card.cited) citedRecordIds.add(card.linkedRecordId);
        if (card.usedInDocument) usedRecordIds.add(card.linkedRecordId);
        const rel = {
          kind: "board",
          label: `Board card in: ${note.title}`,
          href: "/my/workbench/notes",
        };
        const existing = boardByRecord.get(card.linkedRecordId) ?? [];
        existing.push(rel);
        boardByRecord.set(card.linkedRecordId, existing);
      }

      const collections: string[] = ["board_cards"];
      if (card.type === "image" || card.imageUrl?.trim()) collections.push("image_records");
      if (missingAlt) collections.push("images_missing_alt");
      if (!card.usedInDocument) collections.push("board_not_sent_to_document");
      if (card.type === "question") collections.push("open_questions");

      items.push({
        id: `board-${note.id}-${card.id}`,
        title: card.title || "Board card",
        subtitle: card.body?.slice(0, 120) || note.title,
        type: "board_card",
        source: "board",
        recordId: card.linkedRecordId,
        noteId: note.id,
        noteTitle: note.title,
        projectId: note.project_id,
        projectTitle: note.project_title,
        status:
          card.workflowStatus === "used"
            ? "used"
            : card.cited
              ? "cited"
              : card.type === "question"
                ? "reviewing"
                : "collecting",
        cited: Boolean(card.cited),
        usedInWriting: Boolean(card.usedInDocument),
        openHref: "/my/workbench/notes",
        collections,
        relations: [
          { kind: "note", label: `Note: ${note.title}`, href: "/my/workbench/notes" },
          ...(card.linkedRecordId
            ? [{ kind: "record", label: "Linked record", href: recordHref(card.linkedRecordId) }]
            : []),
        ],
      });
    }

    for (const block of parseCanvasBlocks(note)) {
      totalCanvasBlocks += 1;
      if (block.linkedRecordId) {
        const rel = {
          kind: "canvas",
          label: `Canvas block in: ${note.title}`,
          href: "/my/workbench/notes",
        };
        const existing = canvasByRecord.get(block.linkedRecordId) ?? [];
        existing.push(rel);
        canvasByRecord.set(block.linkedRecordId, existing);
      }

      items.push({
        id: `canvas-${note.id}-${block.id}`,
        title: block.content || "Canvas block",
        subtitle: note.title,
        type: "canvas_block",
        source: "canvas",
        recordId: block.linkedRecordId,
        noteId: note.id,
        noteTitle: note.title,
        projectId: note.project_id,
        projectTitle: note.project_title,
        status: "collecting",
        cited: false,
        usedInWriting: false,
        openHref: "/my/workbench/notes",
        collections: block.type === "imagePlaceholder" ? ["image_records", "canvas_blocks"] : ["canvas_blocks"],
        relations: [
          { kind: "note", label: `Note: ${note.title}`, href: "/my/workbench/notes" },
          ...(block.linkedRecordId
            ? [{ kind: "record", label: "Linked record", href: recordHref(block.linkedRecordId) }]
            : []),
        ],
      });
    }

    items.push({
      id: `note-${note.id}`,
      title: note.title,
      subtitle: note.project_title,
      type: "note",
      source: "note",
      noteId: note.id,
      noteTitle: note.title,
      projectId: note.project_id,
      projectTitle: note.project_title,
      status: parseCitations(note).length ? "cited" : "collecting",
      cited: parseCitations(note).length > 0,
      usedInWriting: parseBoardCards(note).some((c) => c.usedInDocument),
      openHref: "/my/workbench/notes",
      collections: ["notes"],
      relations: [{ kind: "note", label: "Workbench note", href: "/my/workbench/notes" }],
    });
  }

  for (const task of input.tasks) {
    const collections = ["tasks"];
    if (isQuestionTask(task)) collections.push("open_questions");
    items.push({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: task.project_title,
      type: "task",
      source: "project",
      projectId: task.project_id,
      projectTitle: task.project_title,
      status: task.status === "done" ? "ready" : isQuestionTask(task) ? "reviewing" : "collecting",
      cited: false,
      usedInWriting: false,
      openHref: `/my/workbench/projects/${task.project_id}`,
      collections,
      relations: [
        {
          kind: "project",
          label: `Project: ${task.project_title}`,
          href: `/my/workbench/projects/${task.project_id}`,
        },
      ],
    });
  }

  const seenRecordRows = new Set<string>();

  for (const bookmark of input.bookmarks) {
    const recordId = bookmark.record_id;
    const key = `bookmark:${recordId}`;
    if (seenRecordRows.has(key)) continue;
    seenRecordRows.add(key);

    const title =
      bookmark.record_title || workspaceRecordTitle(input.recordsById, recordId);
    const inList = recordIdsInLists.has(recordId);
    const inProject = recordIdsInProjects.has(recordId);
    const cited = citedRecordIds.has(recordId);
    const used = usedRecordIds.has(recordId);
    const unsorted = !inList && !inProject;
    const needsMeta = missingMetadataForBookmark(bookmark);
    const culturalRows = (projectRecordByRecordId.get(recordId) ?? []).filter(
      (r) => r.cultural_review_needed,
    );
    const needsCultural = culturalRows.length > 0;

    const collections: string[] = ["bookmarks"];
    if (unsorted) collections.push("unsorted_records");
    if (inList) collections.push("reading_list_records");
    if (inProject) collections.push("project_records");
    if (cited) collections.push("cited_in_notes");
    else {
      collections.push("uncited_records");
      collections.push("needs_citation");
    }
    if (used) collections.push("used_in_writing");
    if (needsMeta) collections.push("missing_metadata");
    if (needsCultural) collections.push("needs_cultural_care");
    if (cited || used) collections.push("ready_to_export");

    const relations: IntelligenceRelation[] = [
      bookmarkByRecord.get(recordId)!,
      ...(listMembership.get(recordId) ?? []),
      ...(projectMembership.get(recordId) ?? []),
      ...(citationsByRecord.get(recordId) ?? []),
      ...(boardByRecord.get(recordId) ?? []),
      ...(canvasByRecord.get(recordId) ?? []),
    ].filter(Boolean);

    items.push({
      id: `record-bookmark-${bookmark.id}`,
      title,
      subtitle: bookmark.record_source ?? bookmark.record_type ?? "Saved record",
      type: "record",
      source: "bookmark",
      recordId,
      status: needsCultural
        ? "needs_cultural_care"
        : needsMeta
          ? "needs_metadata"
          : cited
            ? "cited"
            : used
              ? "used"
              : unsorted
                ? "unsorted"
                : "collecting",
      cited,
      usedInWriting: used,
      creator: null,
      date: bookmark.record_year,
      sourceLabel: bookmark.record_source,
      openHref: recordHref(recordId),
      collections,
      relations,
    });
  }

  for (const item of input.readingListItems) {
    const recordId = item.record_id;
    const key = `list:${item.id}`;
    if (seenRecordRows.has(key)) continue;
    seenRecordRows.add(key);

    const title = item.record_title || workspaceRecordTitle(input.recordsById, recordId);
    const cited = citedRecordIds.has(recordId);
    const used = usedRecordIds.has(recordId);
    const needsMeta = missingMetadataForListItem(item);
    const listTitle = readingListTitleById.get(item.reading_list_id) ?? "Reading list";
    const culturalRows = (projectRecordByRecordId.get(recordId) ?? []).filter(
      (r) => r.cultural_review_needed,
    );

    const collections = ["reading_list_records"];
    if (!cited) {
      collections.push("uncited_records");
      collections.push("needs_citation");
    }
    if (cited) collections.push("cited_in_notes");
    if (cited || used) collections.push("ready_to_export");
    if (used) collections.push("used_in_writing");
    if (needsMeta) collections.push("missing_metadata");
    if (culturalRows.length) collections.push("needs_cultural_care");

    items.push({
      id: `record-list-${item.id}`,
      title,
      subtitle: listTitle,
      type: "reading_list_item",
      source: "reading_list",
      recordId,
      readingListId: item.reading_list_id,
      readingListTitle: listTitle,
      status: culturalRows.length
        ? "needs_cultural_care"
        : needsMeta
          ? "needs_metadata"
          : cited
            ? "cited"
            : used
              ? "used"
              : "reviewing",
      cited,
      usedInWriting: used,
      creator: item.record_author,
      date: item.record_year,
      sourceLabel: item.record_source,
      openHref: recordHref(recordId),
      collections,
      relations: [
        { kind: "reading_list", label: `Reading list: ${listTitle}`, href: "/my/lists" },
        ...(bookmarkByRecord.get(recordId) ? [bookmarkByRecord.get(recordId)!] : []),
        ...(projectMembership.get(recordId) ?? []),
        ...(citationsByRecord.get(recordId) ?? []),
        ...(boardByRecord.get(recordId) ?? []),
      ],
    });
  }

  const collectionDefs: Array<Omit<IntelligenceCollection, "itemIds">> = [
    {
      id: "unsorted_records",
      title: "Unsorted saved records",
      description: "Saved bookmarks not yet in a reading list or project.",
    },
    {
      id: "needs_citation",
      title: "Needs citation",
      description: "Saved or listed records without a citation in your notes yet.",
    },
    {
      id: "used_in_writing",
      title: "Used in notes",
      description: "Marked used on the board, in project workflow, or cited in notes.",
    },
    {
      id: "reading_list_records",
      title: "From reading lists",
      description: "Grouped by your reading list organisation.",
    },
    {
      id: "project_records",
      title: "Records linked to projects",
      description: "Archive records attached to workbench projects.",
    },
    {
      id: "cited_in_notes",
      title: "Records cited in notes",
      description: "Appear in note citations or marked as cited on the board.",
    },
    {
      id: "uncited_records",
      title: "Records not yet cited",
      description: "Saved or listed records without a citation in your notes.",
    },
    {
      id: "image_records",
      title: "Image records and image cards",
      description: "Image board cards and canvas image blocks.",
    },
    {
      id: "images_missing_alt",
      title: "Image cards missing alt text",
      description: "Image board cards that need alt text for accessibility and care.",
    },
    {
      id: "board_not_sent_to_document",
      title: "Board cards not sent to document",
      description: "Board cards you have not yet moved into your document note.",
    },
    {
      id: "missing_metadata",
      title: "Missing metadata",
      description: "Records missing creator, date, source, or URL where available.",
    },
    {
      id: "needs_cultural_care",
      title: "Cultural care review",
      description: "Review cultural care metadata for these records — not an automated determination.",
    },
    {
      id: "open_questions",
      title: "Open questions",
      description: "Question board cards and question-like tasks.",
    },
    {
      id: "ready_to_export",
      title: "Ready to export",
      description: "Cited records and writing-ready notes for bibliography or teaching packs.",
    },
  ];

  const collections: IntelligenceCollection[] = collectionDefs.map((def) => ({
    ...def,
    itemIds: items.filter((item) => item.collections.includes(def.id)).map((item) => item.id),
  }));

  const unsortedSavedRecords =
    collections.find((c) => c.id === "unsorted_records")?.itemIds.length ?? 0;

  const summary: Record<IntelligenceSummaryKey, number> = {
    saved_records: input.bookmarks.length,
    reading_lists: input.readingLists.length,
    cited_records: new Set(
      items.filter((i) => i.cited && i.recordId).map((i) => i.recordId as string),
    ).size,
    uncited_records: collections.find((c) => c.id === "uncited_records")?.itemIds.length ?? 0,
    unsorted_records: unsortedSavedRecords,
    open_questions: collections.find((c) => c.id === "open_questions")?.itemIds.length ?? 0,
    images_needing_alt: imageCardsMissingAlt,
    needs_metadata: collections.find((c) => c.id === "missing_metadata")?.itemIds.length ?? 0,
    needs_cultural_care:
      collections.find((c) => c.id === "needs_cultural_care")?.itemIds.length ?? 0,
    ready_to_export:
      collections.find((c) => c.id === "ready_to_export")?.itemIds.length ??
      items.filter((i) => i.cited || i.usedInWriting).length,
  };

  const dismissedIds = new Set(input.dismissedSuggestionIds ?? []);
  const suggestions = buildIntelligenceSuggestions({
    collections,
    summary,
    projects: input.projects,
    projectRecords: input.projectRecords,
    tasks: input.tasks,
    readingLists: input.readingLists,
    readingListItems: input.readingListItems,
    boardCardsNotSent: boardCardsNotSentToDocument,
    imageCardsMissingAlt,
    dismissedIds,
  });

  const profile: UserResearchProfile = {
    totalSavedRecords: input.bookmarks.length,
    totalReadingLists: input.readingLists.length,
    totalNotes: input.notes.length,
    totalCitations,
    totalBoardCards,
    totalCanvasBlocks,
    totalTasks: input.tasks.length,
    unsortedSavedRecords,
    recordsInReadingLists: recordIdsInLists.size,
    recordsLinkedToProjects: recordIdsInProjects.size,
    recordsCitedInNotes: citedRecordIds.size,
    recordsNotYetCited: summary.uncited_records,
    imageCardsMissingAlt,
    openQuestionCards: summary.open_questions,
    boardCardsNotSentToDocument,
    frequentCitationStyle: frequentValue(citationStyles),
    frequentSourceTypes: [...new Set(citationSourceTypes)].slice(0, 6),
    activeProjects: input.projects.map((project) => ({
      id: project.id,
      title: project.title,
      recordCount: input.projectRecords.filter((row) => row.project_id === project.id).length,
      taskCount: input.tasks.filter((task) => task.project_id === project.id).length,
    })),
    recentActivity: input.recentActivity ?? [],
  };

  const recordRelations = Array.from(
    new Set(items.filter((i) => i.recordId).map((i) => i.recordId as string)),
  )
    .slice(0, 80)
    .map((recordId) => {
      const title = workspaceRecordTitle(input.recordsById, recordId);
      const relations: IntelligenceRelation[] = [
        ...(bookmarkByRecord.get(recordId) ? [bookmarkByRecord.get(recordId)!] : []),
        ...(listMembership.get(recordId) ?? []),
        ...(projectMembership.get(recordId) ?? []),
        ...(citationsByRecord.get(recordId) ?? []),
        ...(boardByRecord.get(recordId) ?? []),
        ...(canvasByRecord.get(recordId) ?? []),
      ];
      return { recordId, title, relations };
    });

  return {
    items,
    collections,
    summary,
    suggestions,
    profile,
    preferences: null,
    recordRelations,
    errors,
  };
}

export async function loadWorkbenchIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  const errors: string[] = [];

  const [workspace, projectsRes, notesRes, tasksRes, projectRecordsRes, preferences, recentActivity] =
    await Promise.all([
      getMemberWorkspaceData("/my/workbench/intelligence"),
      listWorkbenchProjects(),
      listWorkbenchNotes({ limit: 300 }),
      listAllWorkbenchTasks(300),
      listAllWorkbenchProjectRecords(400),
      getWorkbenchUserPreferences(),
      listRecentWorkbenchActivity(12),
    ]);

  if (!projectsRes.ok) errors.push(projectsRes.error ?? "Could not load projects.");
  if (!notesRes.ok) errors.push(notesRes.error ?? "Could not load notes.");
  if (!tasksRes.ok) errors.push(tasksRes.error ?? "Could not load tasks.");
  if (!projectRecordsRes.ok) errors.push(projectRecordsRes.error ?? "Could not load project records.");

  const snapshot = buildWorkbenchIntelligenceSnapshot({
    bookmarks: workspace.bookmarks,
    readingLists: workspace.readingLists,
    readingListItems: workspace.readingListItems,
    recordsById: workspace.recordsById,
    projects: projectsRes.ok ? projectsRes.projects : [],
    projectRecords: projectRecordsRes.ok ? projectRecordsRes.records : [],
    notes: notesRes.ok ? notesRes.notes : [],
    tasks: tasksRes.ok ? tasksRes.tasks : [],
    dismissedSuggestionIds: preferences?.dismissed_suggestions ?? [],
    recentActivity: recentActivity.map((event) => ({
      eventType: event.event_type,
      entityType: event.entity_type,
      entityId: event.entity_id,
      createdAt: event.created_at,
    })),
  });

  return {
    ...snapshot,
    preferences,
    errors: [...snapshot.errors, ...errors],
  };
}
