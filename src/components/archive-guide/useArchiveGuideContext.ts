"use client";

import type {
  ArchiveGuideArea,
  ArchiveGuideContextItem,
  ArchiveGuideStructuredContext,
} from "@/src/lib/archive-guide-types";

function textFrom(root: ParentNode | null | undefined, selectors: string, maxLength = 220) {
  const node = root?.querySelector(selectors);
  const text = node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return text ? text.slice(0, maxLength) : undefined;
}

function attributeFrom(root: Element, name: string) {
  const value = root.getAttribute(name)?.trim();
  return value || undefined;
}

function readLibraryResultCards(): ArchiveGuideContextItem[] {
  const app = document.getElementById("app");
  const resultRoot = app?.querySelector(".library-results-stack") ?? app;
  if (!resultRoot) return [];

  return Array.from(
    resultRoot.querySelectorAll<HTMLElement>(".record-card, .result-card, .archive-card, .card[data-id]"),
  )
    .slice(0, 8)
    .map((card) => {
      const title =
        textFrom(card, ".record-title, .result-title, .card-title, h2, h3", 180) ||
        attributeFrom(card, "data-title") ||
        "Untitled result";
      return {
        id: attributeFrom(card, "data-id"),
        title,
        snippet: textFrom(card, ".record-description, .result-description, .card-description, .card-summary, p", 260),
        provider:
          textFrom(card, ".record-source, .result-source, .card-source, .source-badge, [data-provider]", 90) ||
          attributeFrom(card, "data-provider"),
        creator: textFrom(card, ".record-creator, .result-creator, .card-creator", 120),
        date: textFrom(card, ".record-date, .result-date, .card-date", 60),
        type: textFrom(card, ".record-type, .result-type, .card-type", 80),
      };
    })
    .filter((item) => item.title && item.title !== "Untitled result");
}

function readBoardCards(): ArchiveGuideContextItem[] {
  const board = document.querySelector(".workbench-note-board-immersive");
  if (!board) return [];
  return Array.from(
    board.querySelectorAll<HTMLElement>(".workbench-board-card-immersive, .workbench-note-board-card"),
  )
    .slice(0, 10)
    .map((card, index) => ({
      id: attributeFrom(card, "data-card-id") ?? attributeFrom(card, "data-id") ?? `board-card-${index + 1}`,
      title: textFrom(card, ".workbench-board-card-title, h3, h4, strong", 160) || `Board card ${index + 1}`,
      provider: textFrom(card, ".workbench-board-card-source, .source-badge", 90),
      type: attributeFrom(card, "data-card-type") ?? textFrom(card, ".workbench-board-card-type", 80),
    }));
}

function readRecordContext(): ArchiveGuideStructuredContext | null {
  const recordMain = document.querySelector("[data-record-detail], .record-detail, .record-page");
  if (!recordMain) return null;
  return {
    area: "record",
    title: textFrom(recordMain, "h1, .record-title", 180),
    results: [
      {
        title: textFrom(recordMain, "h1, .record-title", 180) ?? "Current record",
        snippet: textFrom(recordMain, ".record-description, .record-summary, .description, p", 300),
        provider: textFrom(recordMain, ".record-source, .source-badge, .provider", 90),
        creator: textFrom(recordMain, ".record-creator, .creator", 120),
        date: textFrom(recordMain, ".record-date, .date", 60),
      },
    ],
    privacyNote: "Record context is public/visible page metadata and snippets only.",
  };
}

function currentAreaFromPath(): ArchiveGuideArea | null {
  const path = window.location.pathname;
  if (path.startsWith("/library")) return "library";
  if (path.startsWith("/records/")) return "record";
  if (path.includes("/reading-lists")) return "reading_list";
  if (path.includes("/community")) return "community";
  if (path.includes("/my/workbench/notes")) {
    if (document.querySelector(".workbench-note-board-immersive")) return "workbench_board";
    if (document.querySelector(".workbench-research-canvas")) return "workbench_canvas";
    return "workbench_document";
  }
  return null;
}

export function buildArchiveGuideContext(): ArchiveGuideStructuredContext | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const area = currentAreaFromPath();
  if (!area) return null;

  if (area === "record") {
    return readRecordContext() ?? {
      area,
      title: document.title,
      privacyNote: "Record context is visible page metadata only.",
    };
  }

  if (area === "library") {
    const input = document.getElementById("mainSearch") as HTMLInputElement | null;
    const results = readLibraryResultCards();
    return {
      area,
      title: "Library search",
      query: input?.value.trim() || undefined,
      resultCount: results.length,
      results,
      privacyNote: "Library context includes search terms and visible result snippets only.",
    };
  }

  if (area === "workbench_board") {
    return {
      area,
      title: "Workbench board",
      query: (document.querySelector(".workbench-note-board-floating-search input") as HTMLInputElement | null)?.value.trim() || undefined,
      boardLayout: textFrom(document, ".workbench-note-board-side-rail .board-layout-option.is-active", 80),
      boardCards: readBoardCards(),
      privacyNote: "Workbench board context sends card titles, labels and types only; private card bodies are not included by default.",
    };
  }

  if (area === "workbench_canvas") {
    return {
      area,
      title: "Workbench canvas",
      canvasObjects: Array.from(document.querySelectorAll<HTMLElement>(".workbench-canvas-object"))
        .slice(0, 10)
        .map((object, index) => ({
          id: attributeFrom(object, "data-object-id") ?? `canvas-object-${index + 1}`,
          title: textFrom(object, ".workbench-canvas-object-title, h3, strong", 140) ?? `Canvas object ${index + 1}`,
          type: attributeFrom(object, "data-object-type"),
        })),
      privacyNote: "Workbench canvas context sends object labels and types only; full private object text is not included by default.",
    };
  }

  return {
    area,
    title: textFrom(document, "h1", 160) ?? document.title,
    privacyNote: "Context is limited to visible public or metadata-level page information.",
  };
}

export function useArchiveGuideContext() {
  return { buildContext: buildArchiveGuideContext };
}
