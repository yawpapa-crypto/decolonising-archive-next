"use client";

import { useCallback, useMemo, useState } from "react";
import type { WorkbenchCitationSource, WorkbenchLinkableRecord } from "@/lib/workbench-data";
import {
  cardMatchesFilter,
  cardMatchesSearch,
  cardMatchesSmartChip,
  sortBoardCards,
} from "./workbench-board-utils";
import type {
  BoardCardType,
  BoardSourceOrigin,
  BoardWorkflowStatus,
  WorkbenchBoardCard,
  WorkbenchBoardData,
  WorkbenchBoardSettings,
} from "./workbench-board-types";
import {
  boardStatePatchToSettings,
  cardToNote,
  notePatchToCard,
  noteToCardFields,
  settingsToBoardState,
} from "./workbench-board-figma-adapters";
import type { BoardState, WorkbenchNote } from "./workbench-board-figma-types";
import {
  getImmersiveFallbackPosition,
  presentNotesForBoard,
} from "./workbench-board-presentation";
import { WorkbenchNoteBoardImmersiveView } from "./WorkbenchNoteBoardImmersiveView";
import { cardHtml, createDefaultBoardCard, createId } from "./workbench-note-board-core";

export type WorkbenchNoteBoardBridgeProps = {
  data: WorkbenchBoardData;
  linkableRecords: WorkbenchLinkableRecord[];
  archiveSources?: WorkbenchCitationSource[];
  noteId: string | null;
  canEdit: boolean;
  onChange: (data: WorkbenchBoardData) => void;
  onSendToDocument: (html: string, card?: WorkbenchBoardCard) => void;
  onSendToCanvas?: (card: WorkbenchBoardCard) => void; // reserved for document/canvas integration
  onCiteCard?: (card: WorkbenchBoardCard) => void;
  onOpenRecord?: (recordId: string) => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
};

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

export default function WorkbenchNoteBoard({
  data,
  linkableRecords,
  archiveSources = [],
  canEdit,
  onChange,
  onSendToDocument,
  onCiteCard,
  onOpenRecord,
  onFullscreenChange,
}: WorkbenchNoteBoardBridgeProps) {
  const settings = useMemo(() => data.settings ?? {}, [data.settings]);
  const [boardUi, setBoardUi] = useState({
    zoom: 1,
    panX: 0,
    panY: 0,
    isFullscreen: false,
    controlsVisible: true,
    selectedNoteIds: [] as string[],
  });

  const updateSettings = useCallback(
    (patch: Partial<WorkbenchBoardSettings>) => {
      onChange({ ...data, settings: { ...settings, ...patch } });
    },
    [data, onChange, settings],
  );

  const persistCards = useCallback(
    (cards: WorkbenchBoardCard[]) => {
      onChange({ ...data, cards });
    },
    [data, onChange],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<WorkbenchBoardCard>) => {
      persistCards(
        data.cards.map((card) =>
          card.id === id ? { ...card, ...patch, updatedAt: new Date().toISOString() } : card,
        ),
      );
    },
    [data.cards, persistCards],
  );

  const displayCards = useMemo(() => {
    const filtered = data.cards.filter(
      (card) =>
        cardMatchesFilter(card, settings.filter ?? "all") &&
        cardMatchesSearch(card, settings.search ?? "", linkableRecords) &&
        cardMatchesSmartChip(card, settings.smartChip ?? null),
    );
    return sortBoardCards(filtered, settings.sort ?? "manual", linkableRecords);
  }, [data.cards, linkableRecords, settings.filter, settings.search, settings.smartChip, settings.sort]);

  const notes = useMemo(() => {
    const mapped = displayCards.map((card, index) => cardToNote(card, index));
    return presentNotesForBoard(displayCards, mapped);
  }, [displayCards]);

  const cardById = useMemo(() => {
    const map = new Map<string, WorkbenchBoardCard>();
    for (const card of data.cards) map.set(card.id, card);
    return map;
  }, [data.cards]);

  const boardState = useMemo(
    () => settingsToBoardState(settings, boardUi),
    [boardUi, settings],
  );

  function onUpdateBoardState(patch: Partial<BoardState>) {
    setBoardUi((prev) => ({
      zoom: patch.zoom ?? prev.zoom,
      panX: patch.panX ?? prev.panX,
      panY: patch.panY ?? prev.panY,
      isFullscreen: patch.isFullscreen ?? prev.isFullscreen,
      controlsVisible: patch.controlsVisible ?? prev.controlsVisible,
      selectedNoteIds: patch.selectedNoteIds ?? prev.selectedNoteIds,
    }));
    if (patch.isFullscreen !== undefined) {
      onFullscreenChange?.(patch.isFullscreen);
    }
    const settingsPatch = boardStatePatchToSettings(patch, settings);
    if (Object.keys(settingsPatch).length > 0) {
      onChange({ ...data, settings: { ...settings, ...settingsPatch } });
    }
  }

  const onUpdateNote = useCallback(
    (id: string, updates: Partial<WorkbenchNote>) => {
      updateCard(id, notePatchToCard(updates));
    },
    [updateCard],
  );

  const onDeleteNote = useCallback(
    (id: string) => {
      if (!canEdit) return;
      persistCards(data.cards.filter((card) => card.id !== id));
    },
    [canEdit, data.cards, persistCards],
  );

  const onAddNote = useCallback(
    (note: Omit<WorkbenchNote, "id" | "createdAt" | "updatedAt">) => {
      if (!canEdit) return;
      const now = new Date().toISOString();
      const fields = noteToCardFields(note);
      const next: WorkbenchBoardCard = {
        ...createDefaultBoardCard(fields.type as BoardCardType, {
          colourIndex: data.cards.length,
          order: data.cards.length,
        }),
        ...fields,
        id: createId("board"),
        createdAt: now,
        updatedAt: now,
      };
      persistCards([...data.cards, next]);
    },
    [canEdit, data.cards, persistCards],
  );

  const archiveGroups = useMemo(() => {
    const bookmarks = archiveSources.filter((s) => s.sourceType === "bookmark");
    const readingLists = archiveSources.filter((s) => s.sourceType === "reading_list");
    const linked = archiveSources.filter((s) => s.sourceType === "linked");
    const recent = [...archiveSources].slice(0, 10);
    return [
      { id: "bookmarks", label: "Saved records", items: bookmarks },
      { id: "reading-lists", label: "Reading lists", items: readingLists },
      { id: "linked", label: "Project records", items: linked },
      { id: "recent", label: "Recent sources", items: recent },
    ].filter((group) => group.items.length > 0);
  }, [archiveSources]);

  const addFromArchive = useCallback(
    (source: WorkbenchCitationSource) => {
      if (!canEdit) return;
      const record = linkableRecords.find((item) => item.record_id === source.recordId);
      const origin: BoardSourceOrigin =
        source.sourceType === "bookmark"
          ? "bookmark"
          : source.sourceType === "reading_list"
            ? "reading_list"
            : "linked";
      const meta = [source.creator, source.date, source.sourceLabel ?? source.readingListTitle]
        .filter(Boolean)
        .join(" · ");
      const base = createDefaultBoardCard("source", {
        record:
          record ??
          ({
            record_id: source.recordId,
            title: source.title,
            source_type: source.recordType ?? source.sourceLabel ?? null,
            project_id: null,
          } satisfies WorkbenchLinkableRecord),
        colourIndex: data.cards.length,
        order: data.cards.length,
        sourceOrigin: origin,
        metaLine: source.readingListTitle ?? source.sourceLabel ?? null,
      });
      const pos = getImmersiveFallbackPosition(data.cards.length);
      const card: WorkbenchBoardCard = {
        ...base,
        ...pos,
        title: source.title,
        body: meta || base.body,
        linkedRecordId: source.recordId,
        workflowStatus: normalizeWorkflow(base),
      };
      persistCards([...data.cards, card]);
    },
    [canEdit, data.cards, linkableRecords, persistCards],
  );

  return (
    <WorkbenchNoteBoardImmersiveView
      notes={notes}
      onUpdateNote={onUpdateNote}
      onDeleteNote={onDeleteNote}
      onAddNote={onAddNote}
      boardState={boardState}
      onUpdateBoardState={onUpdateBoardState}
      canEdit={canEdit}
      searchQuery={settings.search ?? ""}
      onSearchChange={(query) => updateSettings({ search: query })}
      archiveGroups={archiveGroups}
      onAddFromArchive={addFromArchive}
      onOpenRecord={(noteId) => {
        const card = cardById.get(noteId);
        if (card?.linkedRecordId) onOpenRecord?.(card.linkedRecordId);
      }}
      onCiteNote={(noteId) => {
        const card = cardById.get(noteId);
        if (card) onCiteCard?.(card);
      }}
      onSendNoteToDocument={(noteId) => {
        const card = cardById.get(noteId);
        if (card) {
          onSendToDocument(cardHtml(card), card);
          updateCard(card.id, { usedInDocument: true });
        }
      }}
    />
  );
}
