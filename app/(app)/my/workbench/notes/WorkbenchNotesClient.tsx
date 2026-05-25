"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  CircleHelp,
  Eye,
  FileText,
  Pencil,
  PlusSquare,
  type LucideIcon,
} from "lucide-react";
import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { extractHeadingsFromHtml, type NoteHeading } from "@/lib/workbench-note-headings";
import {
  parseCitedReferencesFromHtml,
  type ParsedCitedReference,
} from "@/lib/workbench-note-reference-html";
import type {
  WorkbenchCitationSource,
  WorkbenchCitationSourceType,
  WorkbenchLinkableRecord,
  WorkbenchNoteRow,
  WorkbenchNoteWithProject,
  WorkbenchProjectRow,
} from "@/lib/workbench-data";
import {
  copyNoteToClipboard,
  exportDocumentPagesAsJpeg,
  exportNoteAsDocx,
  type WorkbenchNoteExportFormat,
} from "@/lib/workbench-note-export";
import {
  createWorkbenchNote,
  deleteWorkbenchNote,
  toggleWorkbenchNotePinned,
  updateWorkbenchNote,
} from "@/lib/workbench-note-actions";
import {
  trackWorkbenchActivity,
  updateWorkbenchUserPreference,
} from "@/lib/workbench-activity-actions";
import {
  type WorkbenchNoteStatus,
  WORKBENCH_NOTE_STATUSES,
  noteStatusLabel,
  normalizeNoteStatus,
} from "@/lib/workbench-note-status";
import {
  getWorkbenchNoteTemplate,
  type WorkbenchNoteTemplateId,
  WORKBENCH_NOTE_TEMPLATES,
} from "@/lib/workbench-note-templates";
import {
  deriveNoteTitleFromPlainText,
  formatNoteUpdated,
  isNoteContentEmpty,
  normalizeNoteTitle,
  readingMinutesFromWordCount,
  shouldAutoGenerateNoteTitle,
} from "@/lib/workbench-note-utils";
import WorkbenchEditorToolbar from "../WorkbenchEditorToolbar";
import AICitationFloatingTrigger from "./AICitationFloatingTrigger";
import type { WorkbenchEditorPayload } from "../WorkbenchRichTextEditor";
import WorkbenchNotesLinkedRecords, {
  type LinkedRecordView,
} from "./WorkbenchNotesLinkedRecords";
import WorkbenchNotesCommandPalette, {
  type CommandItem,
} from "./WorkbenchNotesCommandPalette";
import WorkbenchNotesQuickSwitcher from "./WorkbenchNotesQuickSwitcher";
import WorkbenchNotesDocumentOutline from "./WorkbenchNotesDocumentOutline";
import WorkbenchDocumentPageView from "./WorkbenchDocumentPageView";
import dynamic from "next/dynamic";
import {
  boardCardsToMarkdownSummary,
  normalizeCardOrder,
} from "./workbench-board-utils";
import type { WorkbenchBoardSettings } from "./workbench-board-types";
import type { BoardCardColour, BoardCardType, WorkbenchBoardCard, WorkbenchBoardData } from "./workbench-board-types";
import { createDefaultBoardCard, normalizeCardType } from "./workbench-note-board-core";
import type { CanvasBlockType, WorkbenchCanvasData } from "./WorkbenchNoteCanvas";
import { WorkbenchCanvasManager } from "./WorkbenchCanvasManager";
import { createCanvasObject, nextZIndex } from "./workbench-canvas-data";
import {
  activeCanvasData,
  getActiveCanvasRecord,
  normalizeWorkbenchCanvasState,
  serializeWorkbenchCanvasState,
  updateActiveCanvasObjects,
  updateActiveCanvasSettings,
  updateActiveCanvasViewport,
  type CanvasSettings,
  type CanvasViewport,
  type WorkbenchCanvasState,
} from "./workbench-canvas-state";
import { CANVAS_AUTOSAVE_DELAY_MS } from "./workbench-canvas-viewport-motion";
import { EMPTY_CANVAS_DATA } from "./workbench-canvas-types";
import { useWorkbenchNotesShortcuts } from "./useWorkbenchNotesShortcuts";
import { ResearchInspector } from "./surfaces/ResearchInspector";
import { DocumentMetadataBar } from "./surfaces/DocumentMetadataBar";
import WorkbenchDocumentTopBar, { type DocumentSidebarTab } from "./WorkbenchDocumentTopBar";
import WorkbenchDocumentTypographyControls from "./WorkbenchDocumentTypographyControls";
import WorkbenchIconTip from "./WorkbenchIconTip";
import WorkbenchDocumentDrawer from "./WorkbenchDocumentDrawer";
import {
  clampDocumentZoom,
  getCitationPopoverLayout,
  getDocumentViewportProfile,
  type CitationPopoverLayout,
} from "./document-mobile";
import WorkbenchDocumentFormatPanel from "./WorkbenchDocumentFormatPanel";
import WorkbenchDocumentDetailsSections from "./WorkbenchDocumentDetailsSections";
import {
  deriveProjectPermissions,
  type WorkbenchProjectAccessRole,
} from "@/lib/workbench-collaboration";
import { WorkbenchShareProjectModal } from "./WorkbenchShareProjectModal";
import { WorkbenchProjectSettingsModal } from "./WorkbenchProjectSettingsModal";
import { WorkbenchSharedProjectWelcome } from "./WorkbenchSharedProjectWelcome";
import { WorkbenchCollaborationBar } from "./WorkbenchCollaborationBar";
import { useWorkbenchProjectCollaboration } from "./useWorkbenchProjectCollaboration";
import {
  type NoteMode,
  WORKBENCH_LAST_NOTE_MODE_KEY,
  isWorkbenchNoteMode,
  resolveWorkbenchNoteMode,
} from "./workbench-note-types";
import {
  DEFAULT_WORKBENCH_DOCUMENT_FONT_ID,
  getWorkbenchDocumentFontOption,
  isWorkbenchDocumentFontId,
  type WorkbenchDocumentFontId,
} from "./workbench-font-options";

const WorkbenchRichTextEditor = dynamic(() => import("../WorkbenchRichTextEditor"), {
  loading: () => <div className="workbench-rich-editor workbench-rich-editor--loading" aria-busy="true" />,
});

const WorkbenchNoteBoard = dynamic(() => import("./WorkbenchNoteBoard"), {
  loading: () => (
    <div className="workbench-mode-loading" aria-busy="true">
      Loading board…
    </div>
  ),
});

const WorkbenchCanvasImmersiveView = dynamic(
  () =>
    import("./WorkbenchCanvasImmersiveView").then((mod) => ({
      default: mod.WorkbenchCanvasImmersiveView,
    })),
  {
    loading: () => (
      <div className="workbench-mode-loading" aria-busy="true">
        Loading canvas…
      </div>
    ),
  },
);

const AICitationAssistant = dynamic(() => import("./AICitationAssistant"), {
  ssr: false,
});

type SaveState = "unsaved" | "saving" | "saved" | "error";
type WorkbenchCitationStyle =
  | "apa7"
  | "chicago_notes"
  | "chicago_author_date"
  | "harvard"
  | "mla"
  | "custom";
type WorkbenchCitationInsertMode = "parenthetical" | "narrative" | "endnote" | "full_block";

type WorkbenchNoteCitation = {
  id: string;
  marker: number;
  recordId?: string;
  sourceType?: WorkbenchCitationSourceType | "custom";
  readingListId?: string | null;
  readingListTitle?: string | null;
  bookmarkId?: string | null;
  title: string;
  creator?: string | null;
  date?: string | null;
  institution?: string | null;
  sourceUrl?: string | null;
  citationText: string;
  style: WorkbenchCitationStyle;
  insertMode: WorkbenchCitationInsertMode;
  inTextCitation: string;
  endnoteText: string;
  bibliographyText?: string | null;
  customText?: string | null;
  /* EndNote-style editable in-text citation fields */
  referenceId?: string;
  displayText?: string;
  prefix?: string;
  suffix?: string;
  pages?: string;
};

export type CitationCandidate = {
  id: string;
  recordId?: string;
  sourceType?: WorkbenchCitationSourceType | "custom";
  sourceTypes?: Array<WorkbenchCitationSourceType | "custom">;
  sourceLabels?: string[];
  sourceLabel?: string;
  readingListId?: string | null;
  readingListTitle?: string | null;
  bookmarkId?: string | null;
  title: string;
  creator?: string | null;
  date?: string | null;
  institution?: string | null;
  sourceUrl?: string | null;
  recordType?: string | null;
  citationText?: string | null;
};

type SavedSnapshot = {
  title: string;
  projectId: string | null;
  status: WorkbenchNoteStatus;
  contentHtml: string;
  contentJson: Record<string, unknown> | null;
  plainText: string;
  wordCount: number;
  characterCount: number;
};

type NoteMenuAction = {
  id: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  hint?: string;
};

type NoteMenuSection = {
  label?: string;
  items: NoteMenuAction[];
};

type NoteMenu = {
  id: string;
  label: string;
  sections: NoteMenuSection[];
};

const NOTE_MODES: { id: NoteMode; label: string }[] = [
  { id: "document", label: "Document" },
  { id: "canvas", label: "Canvas" },
  { id: "board", label: "Board" },
];

const EMPTY_BOARD_DATA: WorkbenchBoardData = { cards: [], settings: {} };
const EMPTY_CITATIONS: WorkbenchNoteCitation[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getDocumentSettings(json: Record<string, unknown> | null) {
  const rawSettings = isRecord(json?.documentSettings) ? json.documentSettings : {};
  const fontFamilyId = isWorkbenchDocumentFontId(rawSettings.fontFamilyId)
    ? rawSettings.fontFamilyId
    : DEFAULT_WORKBENCH_DOCUMENT_FONT_ID;

  return {
    ...(isRecord(rawSettings) ? rawSettings : {}),
    fontFamilyId,
  };
}

function createWorkbenchNoteId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeBoardCardType(raw: string): BoardCardType {
  if (raw === "image" || raw === "imagePlaceholder") return "image";
  if (
    raw === "quote" ||
    raw === "source" ||
    raw === "question" ||
    raw === "task" ||
    raw === "link"
  ) {
    return raw;
  }
  return "note";
}

function normalizeBoardCardColour(raw: unknown): BoardCardColour | undefined {
  if (raw === "lemon" || raw === "pink" || raw === "blue" || raw === "green" || raw === "lavender" || raw === "cream" || raw === "white") {
    return raw;
  }
  return undefined;
}

function getBoardData(json: Record<string, unknown> | null): WorkbenchBoardData {
  if (!isRecord(json?.workbenchBoard)) return EMPTY_BOARD_DATA;
  const rawCards = Array.isArray(json.workbenchBoard.cards) ? json.workbenchBoard.cards : [];
  const cards = rawCards.filter(isRecord).map((card, index): WorkbenchBoardCard => {
      const rawType = stringValue(card.type, "note");
      const rawStatus = stringValue(card.status, "draft");
      const rawColumn = stringValue(card.column, "collecting");
      const type = normalizeBoardCardType(rawType);
      const workflowRaw = card.workflowStatus ?? card.column;
      const workflowStatus =
        workflowRaw === "reviewing" || workflowRaw === "ready" || workflowRaw === "used"
          ? workflowRaw
          : "collecting";
      return {
        id: stringValue(card.id, `board-${index}`),
        type,
        title: stringValue(card.title, "Untitled card"),
        body: stringValue(card.body, ""),
        order: typeof card.order === "number" ? card.order : index,
        x: typeof card.x === "number" && Number.isFinite(card.x) ? card.x : undefined,
        y: typeof card.y === "number" && Number.isFinite(card.y) ? card.y : undefined,
        width: typeof card.width === "number" && Number.isFinite(card.width) ? card.width : undefined,
        height: typeof card.height === "number" && Number.isFinite(card.height) ? card.height : undefined,
        imageUrl: typeof card.imageUrl === "string" ? card.imageUrl : type === "image" ? "" : undefined,
        imagePath: typeof card.imagePath === "string" ? card.imagePath : undefined,
        imageAlt: typeof card.imageAlt === "string" ? card.imageAlt : undefined,
        linkUrl: typeof card.linkUrl === "string" ? card.linkUrl : type === "link" ? "" : undefined,
        colour: normalizeBoardCardColour(card.colour),
        tag: typeof card.tag === "string" ? card.tag : undefined,
        linkedRecordId: typeof card.linkedRecordId === "string" ? card.linkedRecordId : null,
        taskDone: typeof card.taskDone === "boolean" ? card.taskDone : undefined,
        workflowStatus,
        cited: typeof card.cited === "boolean" ? card.cited : undefined,
        usedInDocument: typeof card.usedInDocument === "boolean" ? card.usedInDocument : undefined,
        createdAt: typeof card.createdAt === "string" ? card.createdAt : undefined,
        updatedAt: typeof card.updatedAt === "string" ? card.updatedAt : undefined,
        status:
          rawStatus === "review" || rawStatus === "important" || rawStatus === "ready"
            ? rawStatus
            : "draft",
        column:
          rawColumn === "reviewing" || rawColumn === "ready" ? rawColumn : "collecting",
      };
  });
  const settings = isRecord(json.workbenchBoard.settings)
    ? (json.workbenchBoard.settings as WorkbenchBoardSettings)
    : {};
  return { cards: normalizeCardOrder(cards), settings };
}

function getCitations(json: Record<string, unknown> | null): WorkbenchNoteCitation[] {
  if (!Array.isArray(json?.workbenchCitations)) return EMPTY_CITATIONS;
  return json.workbenchCitations.filter(isRecord).map((citation, index) => {
    const rawStyle = stringValue(citation.style, "apa7");
    const style: WorkbenchCitationStyle =
      rawStyle === "apa7" ||
      rawStyle === "chicago_notes" ||
      rawStyle === "chicago_author_date" ||
      rawStyle === "harvard" ||
      rawStyle === "mla" ||
      rawStyle === "custom"
        ? rawStyle
        : rawStyle === "apa"
          ? "apa7"
          : rawStyle === "chicago"
            ? "chicago_notes"
            : "custom";
    const rawInsertMode = stringValue(citation.insertMode, "endnote");
    const insertMode: WorkbenchCitationInsertMode =
      rawInsertMode === "parenthetical" ||
      rawInsertMode === "narrative" ||
      rawInsertMode === "endnote" ||
      rawInsertMode === "full_block"
        ? rawInsertMode
        : "endnote";
    const fallbackCitation = stringValue(
      citation.citationText,
      stringValue(citation.title, "Untitled source"),
    );
    return {
      id: stringValue(citation.id, `citation-${index + 1}`),
      recordId: typeof citation.recordId === "string" ? citation.recordId : undefined,
      marker: numberValue(citation.marker, index + 1),
      sourceType:
        citation.sourceType === "linked" ||
        citation.sourceType === "bookmark" ||
        citation.sourceType === "reading_list" ||
        citation.sourceType === "custom"
          ? citation.sourceType
          : undefined,
      readingListId: typeof citation.readingListId === "string" ? citation.readingListId : null,
      readingListTitle:
        typeof citation.readingListTitle === "string" ? citation.readingListTitle : null,
      bookmarkId: typeof citation.bookmarkId === "string" ? citation.bookmarkId : null,
      title: stringValue(citation.title, "Untitled source"),
      creator: typeof citation.creator === "string" ? citation.creator : null,
      date: typeof citation.date === "string" ? citation.date : null,
      institution: typeof citation.institution === "string" ? citation.institution : null,
      sourceUrl: typeof citation.sourceUrl === "string" ? citation.sourceUrl : null,
      citationText: fallbackCitation,
      style,
      insertMode,
      inTextCitation: stringValue(citation.inTextCitation, `[${index + 1}]`),
      endnoteText: stringValue(citation.endnoteText, fallbackCitation),
      bibliographyText:
        typeof citation.bibliographyText === "string" ? citation.bibliographyText : null,
      customText: typeof citation.customText === "string" ? citation.customText : null,
      referenceId:
        typeof citation.referenceId === "string" && citation.referenceId
          ? citation.referenceId
          : undefined,
      displayText:
        typeof citation.displayText === "string" ? citation.displayText : undefined,
      prefix: typeof citation.prefix === "string" ? citation.prefix : undefined,
      suffix: typeof citation.suffix === "string" ? citation.suffix : undefined,
      pages: typeof citation.pages === "string" ? citation.pages : undefined,
    };
  });
}

function mergeWorkbenchModeData(
  nextJson: Record<string, unknown> | null,
  previousJson: Record<string, unknown> | null,
) {
  const base = isRecord(nextJson) ? nextJson : { type: "doc" };
  return {
    ...base,
    documentSettings: getDocumentSettings(previousJson),
    workbenchCanvas: serializeWorkbenchCanvasState(
      normalizeWorkbenchCanvasState(previousJson),
    ),
    workbenchBoard: getBoardData(previousJson),
    workbenchCitations: getCitations(previousJson),
  };
}

function countWordsFromText(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function stripWorkbenchEndnotes(html: string) {
  if (!html) return "";
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll('[data-workbench-endnotes="true"]').forEach((node) => node.remove());
    Array.from(doc.body.querySelectorAll("h1, h2, h3"))
      .filter((heading) => heading.textContent?.trim().toLowerCase() === "endnotes")
      .forEach((heading) => {
        let next = heading.nextElementSibling;
        heading.remove();
        while (next) {
          const current = next;
          next = current.nextElementSibling;
          current.remove();
          if (current.tagName.toLowerCase() === "ol" || current.tagName.toLowerCase() === "ul") {
            break;
          }
        }
      });
    return doc.body.innerHTML.trim() || "<p></p>";
  }
  return html.replace(
    /<section\b[^>]*data-workbench-endnotes=["']true["'][^>]*>[\s\S]*?<\/section>/gi,
    "",
  ).replace(/<h[1-3][^>]*>\s*Endnotes\s*<\/h[1-3]>\s*<(?:ol|ul)[^>]*>[\s\S]*?<\/(?:ol|ul)>/gi, "");
}

function buildEndnotesHtml(citations: WorkbenchNoteCitation[]) {
  if (!citations.length) return "";
  const items = citations
    .slice()
    .sort((a, b) => a.marker - b.marker)
    .map((citation) => {
      const context =
        citation.sourceType === "bookmark"
          ? " Source: Saved bookmark."
          : citation.sourceType === "reading_list"
            ? ` Source: Reading list: ${citation.readingListTitle ?? "Untitled list"}.`
            : citation.sourceType === "linked"
              ? " Source: Linked archive record."
              : "";
      return `<li id="note-citation-${citation.marker}" data-workbench-citation-id="${escapeHtml(citation.id)}">${escapeHtml(citation.endnoteText || citation.citationText)}${escapeHtml(context)}</li>`;
    })
    .join("");
  return `<section data-workbench-endnotes="true"><h2>Endnotes</h2><ol>${items}</ol></section>`;
}

function refreshEndnotesHtml(html: string, citations: WorkbenchNoteCitation[]) {
  const withoutEndnotes = stripWorkbenchEndnotes(html || "<p></p>").trim() || "<p></p>";
  const endnotes = buildEndnotesHtml(citations);
  return endnotes ? `${withoutEndnotes}${endnotes}` : withoutEndnotes;
}

/* ───────── EndNote-style editable in-text citation helpers ───────── */

function slugifyCitationKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

/**
 * Derive a stable reference ID for a citation. The same source cited multiple
 * times always returns the same reference ID so the reference list does not
 * duplicate entries.
 */
function computeReferenceId(input: {
  recordId?: string | null;
  bookmarkId?: string | null;
  readingListId?: string | null;
  title?: string | null;
  creator?: string | null;
  date?: string | null;
}): string {
  if (input.recordId) return `record-${slugifyCitationKey(input.recordId)}`;
  if (input.bookmarkId) return `bookmark-${slugifyCitationKey(input.bookmarkId)}`;
  if (input.readingListId) return `reading-${slugifyCitationKey(input.readingListId)}`;
  const key = [input.creator, input.date, input.title].filter(Boolean).join(" ");
  return `custom-${slugifyCitationKey(key || "untitled")}`;
}

function citationReferenceId(citation: WorkbenchNoteCitation): string {
  return (
    citation.referenceId ||
    computeReferenceId({
      recordId: citation.recordId,
      bookmarkId: citation.bookmarkId,
      readingListId: citation.readingListId,
      title: citation.title,
      creator: citation.creator,
      date: citation.date,
    })
  );
}

function citationDisplayValue(citation: WorkbenchNoteCitation): string {
  return (citation.displayText && citation.displayText.trim()) || citation.inTextCitation || citation.citationText || citation.title;
}

/**
 * Compose the visible in-text label: prefix + display + (pages) + suffix.
 * Used for both the anchor inner text and any markdown/plain-text export.
 */
function composeCitationDisplay(citation: WorkbenchNoteCitation): string {
  if (shouldUseApaInTextDisplay(citation)) {
    return formatApaInTextCitation({
      authors: citation.creator,
      year: getCitationYear(citationCandidateFromCitation(citation)),
      title: citation.title,
      pages: citation.pages,
      prefix: citation.prefix,
      suffix: citation.suffix,
      narrative: citation.insertMode === "narrative",
    });
  }
  const display = citationDisplayValue(citation);
  const prefix = citation.prefix?.trim() ? `${citation.prefix.trim()} ` : "";
  const pages = citation.pages?.trim() ? `, ${citation.pages.trim()}` : "";
  const suffix = citation.suffix?.trim() ? ` ${citation.suffix.trim()}` : "";
  const core = `${display}${pages}`.trim();
  return `${prefix}${core}${suffix}`.trim();
}

/**
 * Build the EndNote-style in-text anchor HTML for a citation. Used by both
 * the initial insert flow and the click-to-edit save flow.
 */
function buildCitationLinkHtml(citation: WorkbenchNoteCitation): string {
  const refId = citationReferenceId(citation);
  const display = composeCitationDisplay(citation);
  const doi = extractDoiFromUrl(citation.sourceUrl);
  return [
    `<a class="workbench-citation-link"`,
    `href="#ref-workbench-citation-${escapeHtml(refId)}"`,
    `data-citation-id="${escapeHtml(citation.id)}"`,
    `data-reference-id="${escapeHtml(refId)}"`,
    citation.recordId ? `data-record-id="${escapeHtml(citation.recordId)}"` : "",
    `data-title="${escapeHtml(citation.title)}"`,
    formatAuthorsPipe(citation.creator)
      ? `data-authors="${escapeHtml(formatAuthorsPipe(citation.creator))}"`
      : "",
    `data-year="${escapeHtml(citationYearFromCitation(citation))}"`,
    `data-source="${escapeHtml(citationSourceLabel(citation))}"`,
    citation.sourceUrl ? `data-url="${escapeHtml(citation.sourceUrl)}"` : "",
    doi ? `data-doi="${escapeHtml(doi)}"` : "",
    `data-citation-display="${escapeHtml(citationDisplayValue(citation))}"`,
    `data-citation-prefix="${escapeHtml(citation.prefix ?? "")}"`,
    `data-citation-suffix="${escapeHtml(citation.suffix ?? "")}"`,
    `data-citation-pages="${escapeHtml(citation.pages ?? "")}"`,
    `aria-label="Edit citation and jump to reference: ${escapeHtml(citation.title)}"`,
    `>${escapeHtml(display)}</a> `,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Strip legacy endnotes and every known generated References section variant
 * so refreshReferenceListHtml can append one canonical list.
 */
function stripReferenceList(html: string): string {
  if (!html) return "";
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc
      .querySelectorAll(
        '.workbench-reference-list,[data-workbench-references="true"],[data-workbench-endnotes="true"]',
      )
      .forEach((node) => node.remove());
    doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading) => {
      const label = heading.textContent?.trim().toLowerCase();
      if (label !== "references" && label !== "endnotes") return;
      let node: ChildNode | null = heading;
      while (node) {
        const next: ChildNode | null = node.nextSibling;
        node.parentNode?.removeChild(node);
        node = next;
      }
    });
    return doc.body.innerHTML.trim() || "<p></p>";
  }
  return html
    .replace(
      /<section\b[^>]*class=["'][^"']*\bworkbench-reference-list\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
      "",
    )
    .replace(
      /<section\b[^>]*data-workbench-references=["']true["'][^>]*>[\s\S]*?<\/section>/gi,
      "",
    )
    .replace(
      /<section\b[^>]*data-workbench-endnotes=["']true["'][^>]*>[\s\S]*?<\/section>/gi,
      "",
    )
    .replace(/<h[1-6]\b[^>]*>\s*(?:References|Endnotes)\s*<\/h[1-6]>[\s\S]*$/i, "");
}

function refreshReferenceListHtml(html: string, _citations: WorkbenchNoteCitation[]): string {
  return stripReferenceList(html || "<p></p>").trim() || "<p></p>";
}

function captureWorkbenchEditorScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const windowX = window.scrollX;
  const windowY = window.scrollY;
  const scrollSelectors = [
    ".workbench-document-pages-scroll",
    ".workbench-reading-surface-host",
    ".workbench-note-editor-shell",
    ".workbench-rich-editor-wrap",
    ".ProseMirror",
  ];
  const elementPositions = scrollSelectors
    .flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)))
    .map((element) => ({
      element,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    }));

  return () => {
    requestAnimationFrame(() => {
      window.scrollTo(windowX, windowY);
      elementPositions.forEach(({ element, scrollLeft, scrollTop }) => {
        element.scrollLeft = scrollLeft;
        element.scrollTop = scrollTop;
      });
    });
  };
}

/**
 * After a citation update, rewrite every in-text anchor for the citation's
 * id with fresh display text and data attributes. Returns the new HTML.
 */
function rewriteCitationAnchors(html: string, citation: WorkbenchNoteCitation): string {
  if (!html || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const safeId = citation.id.replace(/"/g, "");
  const safeRefId = citationReferenceId(citation).replace(/"/g, "");
  const nodes = doc.querySelectorAll(
    `a.workbench-citation-link[data-citation-id="${safeId}"],a.workbench-citation-link[href="#ref-workbench-citation-${safeRefId}"]`,
  );
  if (!nodes.length) return html;
  const fresh = new DOMParser()
    .parseFromString(`<div>${buildCitationLinkHtml(citation)}</div>`, "text/html")
    .body.firstElementChild?.firstElementChild as HTMLAnchorElement | null;
  if (!fresh) return html;
  nodes.forEach((node) => {
    const replacement = fresh.cloneNode(true) as HTMLAnchorElement;
    node.replaceWith(replacement);
  });
  return doc.body.innerHTML;
}

function rewriteAllCitationAnchors(html: string, citations: WorkbenchNoteCitation[]): string {
  return citations.reduce((nextHtml, citation) => rewriteCitationAnchors(nextHtml, citation), html);
}

/**
 * Remove all in-text anchors for a citation id from the HTML. Returns the new HTML.
 */
function removeCitationAnchors(html: string, citationId: string): string {
  if (!html || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const safe = citationId.replace(/"/g, "");
  doc
    .querySelectorAll(
      `a.workbench-citation-link[data-citation-id="${safe}"],[data-workbench-citation="${safe}"]`,
    )
    .forEach((node) => node.remove());
  return doc.body.innerHTML;
}

function citationsToMarkdown(citations: WorkbenchNoteCitation[]) {
  if (!citations.length) return "";
  const items = citations
    .slice()
    .sort((a, b) => a.marker - b.marker)
    .map((citation) => `[${citation.marker}] ${citation.endnoteText || citation.citationText}${citationSourceSuffix(citation)}`)
    .join("\n");
  return `\n\n## Endnotes\n\n${items}\n`;
}

function citationsToPlainText(citations: WorkbenchNoteCitation[]) {
  if (!citations.length) return "";
  const items = citations
    .slice()
    .sort((a, b) => a.marker - b.marker)
    .map((citation) => `[${citation.marker}] ${citation.endnoteText || citation.citationText}${citationSourceSuffix(citation)}`)
    .join("\n");
  return `\n\nEndnotes\n\n${items}`;
}

function citationSourceSuffix(citation: WorkbenchNoteCitation) {
  if (citation.sourceType === "bookmark") return " Source: Saved bookmark.";
  if (citation.sourceType === "reading_list") {
    return ` Source: Reading list: ${citation.readingListTitle ?? "Untitled list"}.`;
  }
  if (citation.sourceType === "linked") return " Source: Linked archive record.";
  return "";
}

function getCitationAuthor(source: CitationCandidate | null) {
  return source?.creator?.trim() || source?.institution?.trim() || "Unknown author";
}

function getCitationYear(source: CitationCandidate | null) {
  const date = source?.date?.trim();
  if (!date) return "n.d.";
  return date.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[0] ?? date;
}

function getCitationTitle(source: CitationCandidate | null) {
  return source?.title?.trim() || "Untitled source";
}

function formatAuthorsPipe(authors?: string | null) {
  if (!authors?.trim()) return "";
  return normaliseCitationAuthors(authors).join("|");
}

function citationSourceLabel(citation: WorkbenchNoteCitation) {
  if (citation.sourceType === "bookmark") return "Saved bookmark";
  if (citation.sourceType === "reading_list") {
    return citation.readingListTitle ? `Reading list: ${citation.readingListTitle}` : "Reading list";
  }
  if (citation.sourceType === "linked") return "Archive record";
  if (citation.institution?.trim()) return citation.institution.trim();
  return "Custom";
}

function extractDoiFromUrl(url?: string | null) {
  if (!url?.trim()) return "";
  const match = url.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match?.[0] ?? "";
}

function citationYearFromCitation(citation: WorkbenchNoteCitation) {
  return getCitationYear({
    id: citation.id,
    title: citation.title,
    creator: citation.creator,
    date: citation.date,
    institution: citation.institution,
  });
}

function normaliseCitationAuthors(authors: string[] | string | null | undefined) {
  if (Array.isArray(authors)) {
    return authors.map((author) => author.trim()).filter(Boolean);
  }
  const value = authors?.trim();
  if (!value) return [];

  const splitIfPersonalNames = (parts: string[]) => {
    const cleaned = parts.map((part) => part.trim()).filter(Boolean);
    return cleaned.length > 1 && cleaned.every(looksLikePersonalAuthorName) ? cleaned : null;
  };

  const apaNameMatches = value.match(/[^,;&]+,\s*(?:[A-Z]\.\s*)+/g);
  if (apaNameMatches && apaNameMatches.length > 1) {
    return apaNameMatches.map((author) => author.trim()).filter(Boolean);
  }
  const semicolonParts = splitIfPersonalNames(value.split(";"));
  if (semicolonParts) return semicolonParts;

  const ampersandParts = splitIfPersonalNames(value.split(/\s+&\s+/));
  if (ampersandParts) return ampersandParts;

  const andParts = splitIfPersonalNames(value.split(/\s+\band\b\s+/i));
  if (andParts) return andParts;

  const commaParts = splitIfPersonalNames(value.split(","));
  if (commaParts) return commaParts;

  return value
    .split(/\s*;\s*/i)
    .map((author) => author.trim())
    .filter(Boolean);
}

function looksLikePersonalAuthorName(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  const lower = cleaned.toLowerCase();
  const organisationWords = /\b(institute|institution|university|archive|library|museum|department|council|government|society|organisation|organization|centre|center|press|service|agency|foundation|college|school|ministry|office|corporation|company|association|committee|board|national|international|aboriginal|torres strait)\b/i;
  if (organisationWords.test(lower)) return false;
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length > 3) return false;
  return words.every((word) => /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'.-]*\.?$/.test(word));
}

function citationFamilyName(author: string) {
  const cleaned = author.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (/^unknown author$/i.test(cleaned)) return "";
  if (/^[^,]+,\s*(?:[A-Z]\.\s*)+$/i.test(cleaned)) {
    return cleaned.split(",")[0]?.trim() || cleaned;
  }
  if (!looksLikePersonalAuthorName(cleaned)) return cleaned;
  if (cleaned.includes(",")) return cleaned.split(",")[0]?.trim() || cleaned;
  const parts = cleaned.split(" ").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : cleaned;
}

function shortenCitationTitle(title?: string | null) {
  const words = (title || "Untitled source")
    .replace(/[“”"]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return `"${words.slice(0, 4).join(" ") || "Untitled source"}"`;
}

function formatApaAuthorDate(authors: string[] | string | null | undefined, title?: string | null) {
  const names = normaliseCitationAuthors(authors)
    .map(citationFamilyName)
    .filter(Boolean);
  if (names.length === 0) return shortenCitationTitle(title);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

function formatApaPages(pages?: string | null) {
  const value = pages?.trim();
  if (!value) return "";
  const normalised = value.replace(/^(pp?\.?\s*)/i, "").trim();
  const label = /[-–,]/.test(normalised) ? "pp." : "p.";
  return `${label} ${normalised}`;
}

function formatApaYear(year?: string | null) {
  const value = year?.trim();
  return value || "n.d.";
}

function formatApaReferenceAuthorName(author: string) {
  const cleaned = author.replace(/\s+/g, " ").trim();
  if (!cleaned || /^unknown author$/i.test(cleaned)) return "";
  if (/^[^,]+,\s/.test(cleaned)) return cleaned;
  if (!looksLikePersonalAuthorName(cleaned)) return cleaned;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((part) => `${part.replace(/\.$/, "").charAt(0)}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

function formatApaReferenceAuthors(authors: string[] | string | null | undefined) {
  const names = normaliseCitationAuthors(authors)
    .map(formatApaReferenceAuthorName)
    .filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

function formatApaDoiUrl(doi?: string | null, url?: string | null) {
  const doiValue = doi?.trim();
  if (doiValue) {
    if (/^https?:\/\//i.test(doiValue)) return doiValue;
    const bare = doiValue.replace(/^https?:\/\/doi.org\//i, "").replace(/^doi:/i, "").trim();
    return bare ? `https://doi.org/${bare}` : "";
  }
  return url?.trim() || "";
}

function formatApaReferenceEntry({
  authors,
  year,
  title,
  source,
  institution,
  url,
  doi,
}: {
  authors?: string[] | string | null;
  year?: string | null;
  title?: string | null;
  source?: string | null;
  institution?: string | null;
  url?: string | null;
  doi?: string | null;
}) {
  const cleanTitle = (title?.trim() || "Untitled source").replace(/\.$/, "").trim();
  const citationYear = formatApaYear(year);
  const authorPart = formatApaReferenceAuthors(authors);
  const sourceLabel = source?.trim();
  const institutionLabel = institution?.trim();
  const container =
    sourceLabel && institutionLabel && sourceLabel !== institutionLabel
      ? `${sourceLabel}. ${institutionLabel}`
      : sourceLabel || institutionLabel || "";
  const accessLink = formatApaDoiUrl(doi || extractDoiFromUrl(url), url);

  if (!authorPart) {
    const parts = [`${cleanTitle}.`, `(${citationYear}).`];
    if (container) parts.push(`${container}.`);
    if (accessLink) parts.push(accessLink);
    return parts.join(" ");
  }

  const parts = [`${authorPart}`, `(${citationYear}).`, `${cleanTitle}.`];
  if (container) parts.push(`${container}.`);
  if (accessLink) parts.push(accessLink);
  return parts.join(" ");
}

function looksLikeApaInTextCitation(text?: string | null) {
  const value = text?.trim();
  if (!value) return false;
  return /^\([^)]*(?:\d{4}|n\.d\.)[^)]*\)$/i.test(value);
}

function looksLikeRawAuthorListInParentheses(text?: string | null) {
  const value = text?.trim();
  if (!value || !/^\(.+\)$/.test(value)) return false;
  const inner = value.slice(1, -1);
  if (/\bet al\./i.test(inner)) return false;
  return (inner.match(/,/g) ?? []).length >= 2;
}

function isPlaceholderTitle(title?: string | null) {
  const value = title?.trim();
  return !value || /^untitled source$/i.test(value);
}

function isPlaceholderReferenceEntry(text: string) {
  return /^Untitled source\.\s*\(n\.d\.\)\.?(?:\s|$)/i.test(text.trim());
}

function parseApaParenthetical(text?: string | null) {
  const value = text?.trim();
  if (!value) return null;
  const wrapped = value.match(/^\((.+)\)$/);
  const inner = (wrapped ? wrapped[1] : value).trim();
  const yearMatch = inner.match(/,\s*((?:\d{4}|n\.d\.))(?:,\s*.+)?$/i);
  if (!yearMatch || yearMatch.index == null) return null;
  const year = yearMatch[1];
  const authorPart = inner.slice(0, yearMatch.index).replace(/,\s*$/, "").trim();
  if (!authorPart) return null;
  const authors = authorPart.includes("&")
    ? authorPart
        .split(/\s*&\s*/)
        .map((author) => author.trim())
        .filter(Boolean)
        .join("|")
    : authorPart;
  return { authors, year };
}

function citationCandidateFromCitation(citation: WorkbenchNoteCitation): CitationCandidate {
  return {
    id: citation.id,
    recordId: citation.recordId,
    title: citation.title,
    creator: citation.creator,
    date: citation.date,
    institution: citation.institution,
    sourceUrl: citation.sourceUrl,
  };
}

function shouldUseApaInTextDisplay(citation: WorkbenchNoteCitation) {
  if (citation.insertMode === "endnote" || citation.insertMode === "full_block") return false;
  if (citation.style === "apa7" || citation.style === "harvard" || citation.style === "chicago_author_date") {
    return true;
  }
  const label = citation.displayText || citation.inTextCitation || citation.citationText;
  return looksLikeRawAuthorListInParentheses(label);
}

function formatApaInTextCitation({
  authors,
  year,
  title,
  pages,
  prefix,
  suffix,
  narrative = false,
}: {
  authors?: string[] | string | null;
  year?: string | null;
  title?: string | null;
  pages?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  narrative?: boolean;
}) {
  const author = formatApaAuthorDate(authors, title);
  const citationYear = formatApaYear(year);
  const pageText = formatApaPages(pages);
  const prefixText = prefix?.trim();
  const suffixText = suffix?.trim();
  const details = [citationYear, pageText, suffixText].filter(Boolean).join(", ");

  if (narrative) {
    const lead = [prefixText, author].filter(Boolean).join(" ");
    return `${lead} (${details})`.trim();
  }

  return `(${[prefixText, author, details].filter(Boolean).join(", ")})`;
}

// Lightweight citation formatters, not CSL-level scholarly citation validation.
function formatInTextCitation(
  source: CitationCandidate | null,
  style: WorkbenchCitationStyle,
  insertMode: WorkbenchCitationInsertMode,
  marker: number,
  customText: string,
) {
  const author = getCitationAuthor(source);
  const year = getCitationYear(source);
  const custom = customText.trim();

  if (style === "custom") return custom || `[${marker}]`;
  if (insertMode === "endnote" || style === "chicago_notes") return `[${marker}]`;
  if (insertMode === "full_block") return formatEndnoteCitation(source, style, customText);
  if (style === "apa7" || style === "harvard" || style === "chicago_author_date") {
    return formatApaInTextCitation({
      authors: source?.creator,
      year,
      title: source?.title,
      narrative: insertMode === "narrative",
    });
  }

  if (insertMode === "narrative") {
    if (style === "mla") return author;
    return `${author} (${year})`;
  }

  if (style === "mla") return `(${author})`;
  return `(${author}, ${year})`;
}

function formatEndnoteCitation(
  source: CitationCandidate | null,
  style: WorkbenchCitationStyle,
  customText: string,
) {
  if (style === "custom" && customText.trim()) return customText.trim();
  if (source?.citationText && style !== "custom") {
    const text = source.citationText.trim();
    if (!looksLikeApaInTextCitation(text)) return text;
  }

  const author = getCitationAuthor(source);
  const year = getCitationYear(source);
  const title = getCitationTitle(source);
  const institution = source?.institution?.trim();
  const url = source?.sourceUrl?.trim();

  if (style === "apa7") {
    return formatApaReferenceEntry({
      authors: source?.creator,
      year,
      title,
      source: source?.sourceLabel,
      institution,
      url,
      doi: extractDoiFromUrl(url),
    });
  }

  if (style === "mla") {
    return [author ? `${author}.` : "", `"${title}."`, institution, year, url]
      .filter(Boolean)
      .join(" ");
  }

  if (style === "harvard") {
    return [author, year ? `(${year})` : "", title, institution, url]
      .filter(Boolean)
      .join(", ");
  }

  return [author, title, institution, year, url].filter(Boolean).join(", ");
}

function formatBibliographyCitation(
  source: CitationCandidate | null,
  style: WorkbenchCitationStyle,
  customText: string,
) {
  return formatEndnoteCitation(source, style, customText);
}


const NOTE_MENU_ICONS: Record<string, LucideIcon> = {
  file: FileText,
  edit: Pencil,
  view: Eye,
  insert: PlusSquare,
  help: CircleHelp,
};

const NOTE_MENU_TIPS: Record<string, { tip: string; info: string }> = {
  file: { tip: "File", info: "New, save, export" },
  edit: { tip: "Edit", info: "Undo & clipboard" },
  view: { tip: "View", info: "Outline & zoom" },
  insert: { tip: "Insert", info: "Blocks & media" },
  help: { tip: "Help", info: "Shortcuts & guides" },
};

const DOCUMENT_TASKBAR_MENU_IDS = new Set(["file", "edit", "view"]);
const DOCUMENT_TASKBAR_INSERT_ITEM_IDS = new Set([
  "insert-citation",
  "insert-page-break",
  "insert-image",
  "insert-table",
]);

function WorkbenchNoteMenuBar({
  menus,
  className,
  iconOnly = false,
}: {
  menus: NoteMenu[];
  className?: string;
  iconOnly?: boolean;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    function onPointerDown(event: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const isTaskbar = Boolean(className?.includes("workbench-note-menu-bar--topbar"));

  return (
    <nav
      className={[
        "workbench-note-menu-bar",
        iconOnly ? "workbench-note-menu-bar--icons" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Note editor menu"
      ref={ref}
    >
      {menus.map((menu) => {
        const isOpen = openMenu === menu.id;
        const MenuIcon = NOTE_MENU_ICONS[menu.id];
        const menuTip = NOTE_MENU_TIPS[menu.id] ?? { tip: menu.label, info: "Open menu" };
        const menuButton = (
          <button
            type="button"
            className={[
              "workbench-note-menu-button",
              isTaskbar && iconOnly ? "workbench-document-taskbar-button" : null,
              isTaskbar && iconOnly ? `workbench-note-menu-button--${menu.id}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={iconOnly ? menuTip.tip : undefined}
            title={iconOnly ? menuTip.tip : undefined}
            data-tooltip={isTaskbar && iconOnly ? menuTip.tip : undefined}
            onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
          >
            {iconOnly && MenuIcon ? (
              <MenuIcon size={18} strokeWidth={1.75} aria-hidden />
            ) : (
              menu.label
            )}
          </button>
        );
        return (
          <div key={menu.id} className="workbench-note-menu-item">
            {menuButton}
            {isOpen ? (
              <div className="workbench-note-menu-dropdown" role="menu">
                {menu.sections.map((section, sectionIndex) => (
                  <div
                    key={`${menu.id}-${section.label ?? sectionIndex}`}
                    className="workbench-note-menu-section"
                  >
                    {section.label ? (
                      <span className="workbench-note-menu-label">{section.label}</span>
                    ) : null}
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className={item.destructive ? "is-destructive" : undefined}
                        disabled={item.disabled}
                        onClick={() => {
                          item.onClick?.();
                          setOpenMenu(null);
                        }}
                      >
                        <span>{item.label}</span>
                        {item.hint ? <kbd>{item.hint}</kbd> : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function WorkbenchCitationEditPopover({
  citation,
  rect,
  canEdit,
  onSave,
  onCancel,
  onJump,
  onOpenSource,
  onRemove,
}: {
  citation: WorkbenchNoteCitation;
  rect: { top: number; left: number; bottom: number; right: number; width: number; height: number };
  canEdit: boolean;
  onSave: (patch: { displayText: string; prefix: string; suffix: string; pages: string }) => void;
  onCancel: () => void;
  onJump: () => void;
  onOpenSource: () => void;
  onRemove: () => void;
}) {
  const [display, setDisplay] = useState(citation.displayText ?? citation.inTextCitation ?? citation.citationText ?? "");
  const [prefix, setPrefix] = useState(citation.prefix ?? "");
  const [suffix, setSuffix] = useState(citation.suffix ?? "");
  const [pages, setPages] = useState(citation.pages ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [popoverLayout, setPopoverLayout] = useState<CitationPopoverLayout>(() =>
    typeof window !== "undefined"
      ? getCitationPopoverLayout(rect, window.innerWidth, window.innerHeight)
      : getCitationPopoverLayout(rect, 1280, 800),
  );

  useEffect(() => {
    setDisplay(citation.displayText ?? citation.inTextCitation ?? citation.citationText ?? "");
    setPrefix(citation.prefix ?? "");
    setSuffix(citation.suffix ?? "");
    setPages(citation.pages ?? "");
  }, [citation.id]);

  useLayoutEffect(() => {
    function measure() {
      const measuredHeight = rootRef.current?.offsetHeight ?? 320;
      setPopoverLayout(
        getCitationPopoverLayout(rect, window.innerWidth, window.innerHeight, measuredHeight),
      );
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [rect, display, prefix, suffix, pages, citation.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        onSave({ displayText: display.trim(), prefix: prefix.trim(), suffix: suffix.trim(), pages: pages.trim() });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [display, prefix, suffix, pages, onCancel, onSave]);

  useEffect(() => {
    function onClickAway(event: Event) {
      const node = rootRef.current;
      if (!node) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (node.contains(target)) return;
      /* Don't close when clicking another citation anchor — the editor click handler reopens it */
      if (target.closest("a.workbench-citation-link,[data-workbench-citation]")) return;
      onCancel();
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [onCancel]);

  const isSheet = popoverLayout.mode === "sheet";
  const popoverStyle: CSSProperties =
    popoverLayout.mode === "sheet"
      ? {
          position: "fixed",
          left: 0,
          right: 0,
          bottom: `${popoverLayout.bottom}px`,
          width: "100%",
          maxHeight: `${popoverLayout.maxHeight}px`,
          zIndex: 1300,
        }
      : {
          position: "fixed",
          top: `${popoverLayout.top}px`,
          left: `${popoverLayout.left}px`,
          width: `${popoverLayout.width}px`,
          maxHeight: `${popoverLayout.maxHeight}px`,
          zIndex: 1300,
        };

  return (
    <>
      {isSheet ? (
        <button
          type="button"
          className="workbench-citation-edit-popover-backdrop"
          aria-label="Close citation editor"
          onClick={onCancel}
        />
      ) : null}
      <div
        ref={rootRef}
        className={`workbench-citation-edit-popover${isSheet ? " workbench-citation-edit-popover--sheet" : ""}`}
        role="dialog"
        aria-label="Edit citation"
        style={popoverStyle}
      >
      <header className="workbench-citation-edit-popover__head">
        <div className="workbench-citation-edit-popover__title-wrap">
          <p className="workbench-citation-edit-popover__kicker">Citation</p>
          <strong className="workbench-citation-edit-popover__title">{citation.title}</strong>
        </div>
        <button
          type="button"
          className="workbench-citation-edit-popover__close"
          onClick={onCancel}
          aria-label="Close citation editor"
        >
          Close
        </button>
      </header>

      <div className="workbench-citation-edit-popover__body">
        <label className="workbench-citation-edit-popover__field">
          <span>Display</span>
          <input
            type="text"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            readOnly={!canEdit}
            placeholder={citation.inTextCitation || "Author, Year"}
          />
        </label>
        <div className="workbench-citation-edit-popover__row">
          <label className="workbench-citation-edit-popover__field">
            <span>Prefix</span>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              readOnly={!canEdit}
              placeholder="see"
            />
          </label>
          <label className="workbench-citation-edit-popover__field">
            <span>Suffix</span>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              readOnly={!canEdit}
              placeholder="emphasis added"
            />
          </label>
        </div>
        <label className="workbench-citation-edit-popover__field">
          <span>Page / locator</span>
          <input
            type="text"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            readOnly={!canEdit}
            placeholder="pp. 23–45"
          />
        </label>
      </div>

      <footer className="workbench-citation-edit-popover__foot">
        <div className="workbench-citation-edit-popover__foot-left">
          <button
            type="button"
            className="workbench-citation-edit-popover__btn"
            onClick={onJump}
          >
            Jump to reference
          </button>
          {citation.sourceUrl ? (
            <button
              type="button"
              className="workbench-citation-edit-popover__btn"
              onClick={onOpenSource}
            >
              Open source
            </button>
          ) : null}
        </div>
        <div className="workbench-citation-edit-popover__foot-right">
          {canEdit ? (
            <button
              type="button"
              className="workbench-citation-edit-popover__btn workbench-citation-edit-popover__btn--danger"
              onClick={onRemove}
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            className="workbench-citation-edit-popover__btn workbench-citation-edit-popover__btn--primary"
            disabled={!canEdit}
            onClick={() =>
              onSave({
                displayText: display.trim(),
                prefix: prefix.trim(),
                suffix: suffix.trim(),
                pages: pages.trim(),
              })
            }
          >
            Save
          </button>
        </div>
      </footer>
    </div>
    </>
  );
}

function WorkbenchCitationPicker({
  open,
  candidates,
  citations,
  initialCandidateId,
  recommendedCandidateIds,
  onClose,
  onInsert,
}: {
  open: boolean;
  candidates: CitationCandidate[];
  citations: WorkbenchNoteCitation[];
  initialCandidateId?: string | null;
  recommendedCandidateIds?: string[];
  onClose: () => void;
  onInsert: (input: {
    candidate: CitationCandidate | null;
    style: WorkbenchCitationStyle;
    insertMode: WorkbenchCitationInsertMode;
    customText: string;
  }) => void;
}) {
  const [selectedId, setSelectedId] = useState("custom");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "linked" | "bookmark" | "reading_list" | "custom"
  >("all");
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState<WorkbenchCitationStyle>("apa7");
  const [insertMode, setInsertMode] = useState<WorkbenchCitationInsertMode>("parenthetical");
  const [customTitle, setCustomTitle] = useState("");
  const [customText, setCustomText] = useState("");
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const preferred =
      initialCandidateId && candidates.some((c) => c.id === initialCandidateId)
        ? initialCandidateId
        : candidates[0]?.id ?? "custom";
    setSelectedId(preferred);
    setActiveFilter("all");
    setQuery("");
    setStyle("apa7");
    setInsertMode("parenthetical");
    setCustomTitle("");
    setCustomText("");
  }, [open, candidates]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const filteredCandidates = candidates.filter((candidate) => {
    const types = candidate.sourceTypes ?? (candidate.sourceType ? [candidate.sourceType] : []);
    const matchesFilter =
      activeFilter === "all" ||
      activeFilter === "custom" ||
      types.includes(activeFilter as WorkbenchCitationSourceType);
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      [
        candidate.title,
        candidate.creator,
        candidate.date,
        candidate.institution,
        candidate.readingListTitle,
        candidate.recordType,
        ...(candidate.sourceLabels ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    return matchesFilter && matchesQuery;
  });
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId) ?? null;
  const customCandidate: CitationCandidate | null =
    selectedId === "custom" && customTitle.trim()
      ? {
          id: "custom",
          sourceType: "custom",
          sourceTypes: ["custom"],
          title: customTitle.trim(),
        }
      : null;
  const candidate = selectedCandidate ?? customCandidate;
  const nextMarker = citations.length + 1;
  const inTextPreview = formatInTextCitation(candidate, style, insertMode, nextMarker, customText);
  const endnotePreview = formatEndnoteCitation(candidate, style, customText);
  const canInsert = Boolean(candidate || customText.trim());

  return createPortal(
    <div
      className="workbench-citation-picker workbench-citation-modal citation-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Insert citation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="workbench-citation-picker-panel workbench-citation-panel citation-picker-dialog"
        ref={panelRef}
      >
        <header className="workbench-citation-header">
          <div>
            <p className="workbench-citation-picker-kicker">Insert citation</p>
            <h2>Cite from your archive</h2>
          </div>
          <button type="button" className="workbench-citation-close" onClick={onClose} aria-label="Close citation picker">
            Close
          </button>
        </header>

        <div className="workbench-citation-body citation-picker-body">
          <div className="workbench-citation-style-select">
            <span>Citation style</span>
            <div className="workbench-citation-style-grid" role="group" aria-label="Citation style">
              {[
                ["apa7", "APA 7"],
                ["chicago_notes", "Chicago Notes"],
                ["chicago_author_date", "Chicago Author-Date"],
                ["harvard", "Harvard"],
                ["mla", "MLA"],
                ["custom", "Custom"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`workbench-citation-style-option${style === id ? " is-active" : ""}`}
                  aria-pressed={style === id}
                  onClick={() => setStyle(id as WorkbenchCitationStyle)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="workbench-citation-style-select">
            <span>Insert as</span>
            <div className="workbench-citation-insert-mode-grid" role="group" aria-label="Citation insertion format">
              {[
                ["parenthetical", "Parenthetical"],
                ["narrative", "Narrative"],
                ["endnote", "Endnote marker"],
                ["full_block", "Full block"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`workbench-citation-style-option${insertMode === id ? " is-active" : ""}`}
                  aria-pressed={insertMode === id}
                  onClick={() => setInsertMode(id as WorkbenchCitationInsertMode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="workbench-citation-picker-tabs" role="tablist" aria-label="Citation source filters">
            {[
              ["all", "All"],
              ["linked", "Linked"],
              ["bookmark", "Bookmarks"],
              ["reading_list", "Reading Lists"],
              ["custom", "Custom"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={activeFilter === id ? "is-active" : undefined}
                aria-selected={activeFilter === id}
                onClick={() => {
                  setActiveFilter(id as typeof activeFilter);
                  if (id === "custom") setSelectedId("custom");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeFilter !== "custom" ? (
            <label className="workbench-citation-search">
              <span>Search citation sources</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, creator, date, source, or reading list..."
              />
            </label>
          ) : null}

          {activeFilter !== "custom" && candidates.length ? (
            <div className="workbench-citation-record-list citation-picker-record-list workbench-citation-results" role="listbox" aria-label="Citation sources">
              {filteredCandidates.length ? (
                filteredCandidates.map((candidateOption) => {
                  const isRecommended = recommendedCandidateIds?.includes(candidateOption.id);
                  return (
                    <button
                      key={candidateOption.id}
                      type="button"
                      className={`workbench-citation-record-option${
                        selectedId === candidateOption.id ? " is-selected" : ""
                      }${isRecommended ? " is-recommended" : ""}`}
                      aria-selected={selectedId === candidateOption.id}
                      onClick={() => setSelectedId(candidateOption.id)}
                    >
                      <div className="workbench-citation-record-top-row">
                        <strong className="workbench-citation-record-title">
                          {candidateOption.title}
                        </strong>
                        {isRecommended ? (
                          <span className="workbench-citation-recommendation-badge">AI suggested</span>
                        ) : null}
                      </div>
                      <span className="workbench-citation-record-meta">
                        {[candidateOption.creator, candidateOption.date, candidateOption.institution]
                          .filter(Boolean)
                          .join(" · ") || "Archive record"}
                      </span>
                      <span className="workbench-citation-source-badges">
                        {(candidateOption.sourceLabels ?? [candidateOption.sourceLabel ?? "Archive record"]).map((label) => (
                          <span key={label} className="workbench-citation-source-badge">
                            {label}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="workbench-citation-empty">No citation sources match this search.</p>
              )}
              <button
                type="button"
                className={`workbench-citation-record-option${selectedId === "custom" ? " is-selected" : ""}`}
                aria-selected={selectedId === "custom"}
                onClick={() => setSelectedId("custom")}
              >
                <strong className="workbench-citation-record-title">Custom citation</strong>
                <span className="workbench-citation-record-meta">Write a citation manually</span>
              </button>
            </div>
          ) : activeFilter !== "custom" ? (
            <p className="workbench-citation-empty">
              No linked records yet. Add a custom citation or link archive records from Details.
            </p>
          ) : null}

          {activeFilter === "custom" ? (
            <p className="workbench-citation-empty">
              Add a manual source title and citation text, or switch tabs to choose saved material.
            </p>
          ) : null}

          {selectedId === "custom" || activeFilter === "custom" || style === "custom" || !candidates.length ? (
            <div className="workbench-citation-custom-fields">
              <label>
                <span>Source title</span>
                <input
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder="Untitled source"
                />
              </label>
              <label>
                <span>Custom citation text</span>
                <textarea
                  className="workbench-citation-custom-textarea"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder="Creator, Title, Institution, Date, URL."
                  rows={3}
                />
              </label>
            </div>
          ) : null}

          <div className="workbench-citation-preview-grid citation-picker-preview-grid">
            <div className="workbench-citation-preview workbench-citation-preview-card">
              <span className="workbench-citation-preview-label">In-text preview</span>
              <p>{inTextPreview || "Choose a record or enter a citation."}</p>
            </div>
            <div className="workbench-citation-preview workbench-citation-preview-card">
              <span className="workbench-citation-preview-label">Endnote preview</span>
              <p>{endnotePreview || "Choose a record or enter a citation."}</p>
            </div>
          </div>
        </div>

        <footer className="workbench-citation-actions workbench-citation-footer citation-picker-footer">
          <button type="button" className="workbench-citation-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="workbench-citation-insert is-primary"
            disabled={!canInsert}
            onClick={() => onInsert({ candidate, style, insertMode, customText })}
          >
            Insert citation
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function citationsForEndnotes(html: string, citations: WorkbenchNoteCitation[]) {
  const hasEndnotes =
    html.includes('data-workbench-endnotes="true"') ||
    /<h[1-3][^>]*>\s*Endnotes\s*<\/h[1-3]>/i.test(html);
  return hasEndnotes ? citations : citations.filter((citation) => citation.insertMode === "endnote");
}

type GeneratedReferenceEntry = {
  referenceId: string;
  citationId?: string;
  recordId?: string;
  text: string;
  sourceUrl?: string | null;
};

function referenceApaFieldsFromCitation(
  citation: WorkbenchNoteCitation,
  parsed?: ParsedCitedReference | null,
) {
  const parsedInText = parseApaParenthetical(
    citation.inTextCitation || citation.displayText || citation.citationText || parsed?.displayText,
  );
  const linkAuthors = parsed?.authors
    ?.split("|")
    .map((author) => author.trim())
    .filter(Boolean);
  const sourceLabel = citationSourceLabel(citation);
  return {
    authors: citation.creator || (linkAuthors?.length ? linkAuthors : parsedInText?.authors),
    year: citation.date || parsed?.year || parsedInText?.year || citationYearFromCitation(citation),
    title: !isPlaceholderTitle(citation.title) ? citation.title : parsed?.title,
    source: sourceLabel !== "Custom" ? sourceLabel : parsed?.source,
    institution: citation.institution,
    url: citation.sourceUrl || parsed?.url,
    doi: parsed?.doi || extractDoiFromUrl(citation.sourceUrl),
  };
}

function referenceTextFromCitation(
  citation: WorkbenchNoteCitation,
  parsed?: ParsedCitedReference | null,
) {
  const stored = [citation.bibliographyText, citation.endnoteText, citation.citationText]
    .map((value) => value?.trim())
    .find((value) => value && !looksLikeApaInTextCitation(value));
  if (stored) return `${stored}${citationSourceSuffix(citation)}`.trim();

  return `${formatApaReferenceEntry(referenceApaFieldsFromCitation(citation, parsed))}${citationSourceSuffix(citation)}`.trim();
}

function resolveCitationForParsed(
  parsed: ParsedCitedReference,
  citationsById: Map<string, WorkbenchNoteCitation>,
  citationsByReferenceId: Map<string, WorkbenchNoteCitation>,
) {
  if (parsed.citationId) {
    const byId = citationsById.get(parsed.citationId);
    if (byId) return byId;
  }
  return citationsByReferenceId.get(parsed.referenceId);
}

function isCitationCitedInHtml(citation: WorkbenchNoteCitation, html: string) {
  if (!html) return false;
  const referenceId = citationReferenceId(citation);
  if (
    html.includes(citation.id) ||
    html.includes(referenceId) ||
    html.includes(`#ref-workbench-citation-${referenceId}`)
  ) {
    return true;
  }
  const label = citation.inTextCitation?.trim();
  return Boolean(label && html.includes(label));
}

function sourceToCitationCandidate(source: WorkbenchCitationSource): CitationCandidate {
  return {
    id: source.id,
    recordId: source.recordId,
    sourceType: source.sourceType,
    sourceLabel: source.sourceLabel,
    readingListId: source.readingListId,
    readingListTitle: source.readingListTitle,
    bookmarkId: source.bookmarkId,
    title: source.title,
    creator: source.creator,
    date: source.date,
    institution: source.institution,
    sourceUrl: source.sourceUrl,
    recordType: source.recordType,
    citationText: source.citationText,
  };
}

function referenceTextFromSource(source: WorkbenchCitationSource) {
  return formatBibliographyCitation(sourceToCitationCandidate(source), "apa7", "");
}

function referenceTextFromLinkedRecord(record: LinkedRecordView) {
  return [record.title, record.source_type ? `Source: ${record.source_type}.` : ""]
    .filter(Boolean)
    .join(" ");
}

function referenceTextFromLinkMetadata(parsed: ParsedCitedReference) {
  const authors = parsed.authors
    ?.split("|")
    .map((author) => author.trim())
    .filter(Boolean);
  const parsedInText = parseApaParenthetical(parsed.displayText);
  return formatApaReferenceEntry({
    authors: authors?.length ? authors : parsedInText?.authors,
    year: parsed.year || parsedInText?.year,
    title: parsed.title,
    source: parsed.source,
    url: parsed.url,
    doi: parsed.doi,
  });
}

function WorkbenchGeneratedReferences({
  editorHtml,
  citations,
  linkedRecordsForSelected,
  citationSources,
  revision,
}: {
  editorHtml: string;
  citations: WorkbenchNoteCitation[];
  linkedRecordsForSelected: LinkedRecordView[];
  citationSources: WorkbenchCitationSource[];
  revision: number;
}) {
  const references = useMemo(() => {
    void revision;
    const citationsById = new Map(citations.map((citation) => [citation.id, citation]));
    const citationsByReferenceId = new Map(
      citations.map((citation) => [citationReferenceId(citation), citation]),
    );
    const sourcesByRecordId = new Map(citationSources.map((source) => [source.recordId, source]));
    const linkedByRecordId = new Map(linkedRecordsForSelected.map((record) => [record.record_id, record]));
    const seen = new Set<string>();
    const entries: GeneratedReferenceEntry[] = [];

    const appendReference = (
      referenceId: string,
      citation: WorkbenchNoteCitation | undefined,
      parsed: ParsedCitedReference | null,
      source?: WorkbenchCitationSource,
      linked?: LinkedRecordView,
    ) => {
      if (!referenceId || seen.has(referenceId)) return;
      const text =
        (citation ? referenceTextFromCitation(citation, parsed) : "") ||
        (parsed ? referenceTextFromLinkMetadata(parsed) : "") ||
        (source ? referenceTextFromSource(source) : "") ||
        (linked ? referenceTextFromLinkedRecord(linked) : "") ||
        "";
      if (!text.trim() || isPlaceholderReferenceEntry(text)) return;

      seen.add(referenceId);
      entries.push({
        referenceId,
        citationId: citation?.id ?? parsed?.citationId,
        recordId: citation?.recordId ?? parsed?.recordId,
        text,
        sourceUrl:
          citation?.sourceUrl ??
          parsed?.url ??
          source?.sourceUrl ??
          (parsed?.doi ? `https://doi.org/${parsed.doi}` : null),
      });
    };

    for (const parsed of parseCitedReferencesFromHtml(editorHtml)) {
      const citation = resolveCitationForParsed(parsed, citationsById, citationsByReferenceId);
      const referenceId = citation ? citationReferenceId(citation) : parsed.referenceId;
      const source = parsed.recordId ? sourcesByRecordId.get(parsed.recordId) : undefined;
      const linked = parsed.recordId ? linkedByRecordId.get(parsed.recordId) : undefined;
      appendReference(referenceId, citation, parsed, source, linked);
    }

    for (const citation of citations) {
      const referenceId = citationReferenceId(citation);
      if (seen.has(referenceId) || !isCitationCitedInHtml(citation, editorHtml)) continue;
      const source = citation.recordId ? sourcesByRecordId.get(citation.recordId) : undefined;
      const linked = citation.recordId ? linkedByRecordId.get(citation.recordId) : undefined;
      appendReference(referenceId, citation, null, source, linked);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[WorkbenchGeneratedReferences]", {
        citationLinksFound: parseCitedReferencesFromHtml(editorHtml).length,
        generatedReferences: entries.length,
      });
    }

    return entries;
  }, [citationSources, citations, editorHtml, linkedRecordsForSelected, revision]);

  if (!references.length) return null;

  return (
    <section className="workbench-generated-references" aria-label="References">
      <h2>References</h2>
      <ol>
        {references.map((reference) => (
          <li
            key={reference.referenceId}
            id={`ref-workbench-citation-${reference.referenceId}`}
            className="workbench-generated-reference-entry"
            data-citation-id={reference.citationId}
            data-record-id={reference.recordId}
          >
            <span>{reference.text}</span>
            {reference.sourceUrl ? (
              <>
                {" "}
                <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Open source
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function normalizeNote(note: WorkbenchNoteWithProject): WorkbenchNoteWithProject {
  return {
    ...note,
    pinned: Boolean(note.pinned),
    status: normalizeNoteStatus(note.status),
  };
}

function snapshotFromNote(note: WorkbenchNoteRow): SavedSnapshot {
  return {
    title: note.title,
    projectId: note.project_id,
    status: normalizeNoteStatus(note.status),
    contentHtml: note.content_html || "<p></p>",
    contentJson: note.content_json,
    plainText: note.plain_text ?? "",
    wordCount: note.word_count ?? 0,
    characterCount: note.character_count ?? 0,
  };
}

function noteCanEdit(
  note: WorkbenchNoteRow,
  userId: string | null,
  ownerProjectIds: Set<string>,
  editorProjectIds: Set<string>,
) {
  if (!userId) return false;
  if (note.user_id === userId) return true;
  if (!note.project_id) return false;
  if (ownerProjectIds.has(note.project_id)) return true;
  if (editorProjectIds.has(note.project_id)) return true;
  return false;
}



function safeFileName(value: string) {
  return (value || "research-note")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "research-note";
}

function htmlToText(html: string) {
  if (typeof window === "undefined") return "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function htmlToMarkdown(html: string) {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(html || "", "text/html");

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const children = Array.from(el.childNodes).map(walk).join("");

    switch (el.tagName.toLowerCase()) {
      case "h1": return `# ${children.trim()}\n\n`;
      case "h2": return `## ${children.trim()}\n\n`;
      case "h3": return `### ${children.trim()}\n\n`;
      case "p": return `${children.trim()}\n\n`;
      case "strong":
      case "b": return `**${children}**`;
      case "em":
      case "i": return `*${children}*`;
      case "u": return children;
      case "s": return `~~${children}~~`;
      case "blockquote": return children.split("\n").map((line) => line ? `> ${line}` : "").join("\n") + "\n\n";
      case "li": return `- ${children.trim()}\n`;
      case "ul":
      case "ol": return `${children}\n`;
      case "br": return "\n";
      case "a": {
        const href = el.getAttribute("href");
        return href ? `[${children}](${href})` : children;
      }
      case "img": {
        const src = el.getAttribute("src") || "";
        const alt = el.getAttribute("alt") || "image";
        return src ? `![${alt}](${src})\n\n` : "";
      }
      default: return children;
    }
  }

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

function downloadNoteFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildWordCompatibleHtml(title: string, bodyHtml: string) {
  const escapedTitle = title.replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[char] || char));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.55;
      color: #111;
      margin: 40px;
    }
    h1, h2, h3 { line-height: 1.2; }
    blockquote {
      border-left: 3px solid #111;
      margin-left: 0;
      padding-left: 14px;
      color: #444;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    td, th {
      border: 1px solid #ccc;
      padding: 6px;
    }
    img {
      max-width: 100%;
    }
  </style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  ${bodyHtml || "<p></p>"}
</body>
</html>`;
}

function snapshotsEqual(a: SavedSnapshot, b: SavedSnapshot) {
  return (
    a.title === b.title &&
    a.projectId === b.projectId &&
    a.status === b.status &&
    a.contentHtml === b.contentHtml &&
    JSON.stringify(a.contentJson) === JSON.stringify(b.contentJson)
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NOTES_SIDEBAR_STORAGE_KEY = "workbench-notes-sidebar-width";
const NOTES_SIDEBAR_DEFAULT = 240;
const NOTES_SIDEBAR_MIN = 200;
const NOTES_SIDEBAR_MAX = 420;
const NOTES_SIDEBAR_FOCUS_MIN = 180;
const NOTES_SIDEBAR_FOCUS_MAX = 460;

function clampSidebarWidth(width: number, focus: boolean) {
  const min = focus ? NOTES_SIDEBAR_FOCUS_MIN : NOTES_SIDEBAR_MIN;
  const max = focus ? NOTES_SIDEBAR_FOCUS_MAX : NOTES_SIDEBAR_MAX;
  return Math.min(max, Math.max(min, Math.round(width)));
}

function sortNotes(notes: WorkbenchNoteWithProject[]) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export default function WorkbenchNotesClient(props: {
  notes: WorkbenchNoteWithProject[];
  projects: WorkbenchProjectRow[];
  linkableRecords: WorkbenchLinkableRecord[];
  citationSources: WorkbenchCitationSource[];
  noteRecordIdsByNote: Record<string, string[]>;
  currentUserId: string | null;
  currentUserDisplayName?: string | null;
  ownerProjectIds: string[];
  editorProjectIds: string[];
  viewerProjectIds?: string[];
  initialPreferredNoteMode?: string | null;
  initialError?: string;
}) {
  const ownerSet = useMemo(() => new Set(props.ownerProjectIds), [props.ownerProjectIds]);
  const editorSet = useMemo(() => new Set(props.editorProjectIds), [props.editorProjectIds]);
  const viewerSet = useMemo(
    () => new Set(props.viewerProjectIds ?? []),
    [props.viewerProjectIds],
  );
  const linkableById = useMemo(
    () => new Map(props.linkableRecords.map((r) => [r.record_id, r])),
    [props.linkableRecords],
  );

  const initialNotes = useMemo(
    () => sortNotes(props.notes.map(normalizeNote)),
    [props.notes],
  );
  const initialNote = initialNotes[0] ?? null;
  const initialSnapshot = initialNote ? snapshotFromNote(initialNote) : null;

  const serverPreferredNoteMode = isWorkbenchNoteMode(props.initialPreferredNoteMode)
    ? props.initialPreferredNoteMode
    : null;

  const [notes, setNotes] = useState(initialNotes);
  const [noteRecordIdsByNote, setNoteRecordIdsByNote] = useState(props.noteRecordIdsByNote);
  const [selectedId, setSelectedId] = useState(initialNote?.id ?? "");
  const [title, setTitle] = useState(initialSnapshot?.title ?? "");
  const [projectId, setProjectId] = useState<string | null>(initialSnapshot?.projectId ?? null);
  const [noteStatus, setNoteStatus] = useState<WorkbenchNoteStatus>(
    initialSnapshot?.status ?? "draft",
  );
  const [contentHtml, setContentHtml] = useState(initialSnapshot?.contentHtml ?? "<p></p>");
  const [contentJson, setContentJson] = useState<Record<string, unknown> | null>(
    initialSnapshot?.contentJson ?? null,
  );
  const [plainText, setPlainText] = useState(initialSnapshot?.plainText ?? "");
  const [wordCount, setWordCount] = useState(initialSnapshot?.wordCount ?? 0);
  const [characterCount, setCharacterCount] = useState(initialSnapshot?.characterCount ?? 0);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(initialSnapshot);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState(props.initialError ?? "");
  const [imageError, setImageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newNoteMenuOpen, setNewNoteMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [insertHtml, setInsertHtml] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [citationPickerOpen, setCitationPickerOpen] = useState(false);
  const [citationPreselectId, setCitationPreselectId] = useState<string | null>(null);
  const [citationRevision, setCitationRevision] = useState(0);
  const [editingCitation, setEditingCitation] = useState<{
    citationId: string;
    rect: { top: number; left: number; bottom: number; right: number; width: number; height: number };
  } | null>(null);
  const [citationAnchorRect, setCitationAnchorRect] = useState<DOMRect | null>(null);
  const [aiAssistantOpen, setAIAssistantOpen] = useState(false);
  const [aiRecommendedCandidateIds, setAiRecommendedCandidateIds] = useState<string[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [noteMode, setNoteMode] = useState<NoteMode>(
    () => serverPreferredNoteMode ?? "document",
  );
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [notesMenuPosition, setNotesMenuPosition] = useState({ x: 0, y: 0 });
  const notesMenuDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [notesMenuPositionReady, setNotesMenuPositionReady] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorPosition, setInspectorPosition] = useState({ x: 0, y: 0 });
  const inspectorDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [inspectorPositionReady, setInspectorPositionReady] = useState(false);
  const [documentDrawerTab, setDocumentDrawerTab] = useState<DocumentSidebarTab>("format");
  const [documentDrawerOpen, setDocumentDrawerOpen] = useState(true);
  const [documentDrawerPinned, setDocumentDrawerPinned] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [saveConflict, setSaveConflict] = useState("");
  const [canvasInteracting, setCanvasInteracting] = useState(false);
  const documentImageInputRef = useRef<HTMLInputElement>(null);
  const noteModePrefRef = useRef<NoteMode | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const resolved = resolveWorkbenchNoteMode({
      serverPreferred: serverPreferredNoteMode,
      localStorageValue: window.localStorage.getItem(WORKBENCH_LAST_NOTE_MODE_KEY),
    });
    setNoteMode((current) => (current === resolved ? current : resolved));
    window.localStorage.setItem(WORKBENCH_LAST_NOTE_MODE_KEY, resolved);
    noteModePrefRef.current = resolved;
  }, [serverPreferredNoteMode]);

  const handleNoteModeChange = useCallback((mode: string) => {
    if (!isWorkbenchNoteMode(mode)) return;
    setNoteMode(mode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPin = window.localStorage.getItem("workbench-document-drawer-pinned");
    if (storedPin === "true") setDocumentDrawerPinned(true);
    if (storedPin === "false") setDocumentDrawerPinned(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "workbench-document-drawer-pinned",
      documentDrawerPinned ? "true" : "false",
    );
  }, [documentDrawerPinned]);

  useEffect(() => {
    if (noteMode !== "document" || !selectedId) return;
    setDocumentDrawerOpen(true);
    setDocumentDrawerTab("format");
  }, [noteMode, selectedId]);

  useEffect(() => {
    const placeNotesMenuInGutter = () => {
      const sidebar =
        document.querySelector(".workbench-sidebar") ||
        document.querySelector(".workbench-nav") ||
        document.querySelector("aside");

      const page = document.querySelector(".workbench-notes-page-premium");

      const sidebarRect = sidebar?.getBoundingClientRect();
      const pageRect = page?.getBoundingClientRect();

      const fallbackLeft = pageRect ? Math.max(16, pageRect.left + 12) : 160;

      setNotesMenuPosition({
        x: sidebarRect ? sidebarRect.right + 18 : fallbackLeft,
        y: 330,
      });

      setNotesMenuPositionReady(true);
    };

    placeNotesMenuInGutter();
    window.addEventListener("resize", placeNotesMenuInGutter);

    return () => {
      window.removeEventListener("resize", placeNotesMenuInGutter);
    };
  }, []);

  useEffect(() => {
    const placeInspector = () => {
      setInspectorPosition({
        x: Math.max(24, window.innerWidth - 460),
        y: 132,
      });
      setInspectorPositionReady(true);
    };

    placeInspector();
    window.addEventListener("resize", placeInspector);

    return () => {
      window.removeEventListener("resize", placeInspector);
    };
  }, []);

  function handleInspectorPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (typeof window !== "undefined" && window.innerWidth <= 640) return;

    const target = event.target as HTMLElement | null;

    if (
      target?.closest("button, input, textarea, select, a, [contenteditable='true'], .ProseMirror")
    ) {
      return;
    }

    event.preventDefault();

    inspectorDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: inspectorPosition.x,
      originY: inspectorPosition.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = inspectorDragRef.current;
      if (!drag) return;

      const panelWidth = 380;
      const panelHeight = 520;

      const nextX = Math.max(
        16,
        Math.min(window.innerWidth - panelWidth - 16, drag.originX + moveEvent.clientX - drag.startX),
      );

      const nextY = Math.max(
        72,
        Math.min(window.innerHeight - 96, drag.originY + moveEvent.clientY - drag.startY),
      );

      setInspectorPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      inspectorDragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleNotesMenuPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    notesMenuDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: notesMenuPosition.x,
      originY: notesMenuPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleNotesMenuPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = notesMenuDragRef.current;
    if (!drag) return;

    const nextX = Math.max(8, Math.min(window.innerWidth - 48, drag.originX + event.clientX - drag.startX));
    const nextY = Math.max(56, Math.min(window.innerHeight - 48, drag.originY + event.clientY - drag.startY));

    setNotesMenuPosition({ x: nextX, y: nextY });
  }

  function handleNotesMenuPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    notesMenuDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WORKBENCH_LAST_NOTE_MODE_KEY, noteMode);
    if (noteModePrefRef.current === null) {
      noteModePrefRef.current = noteMode;
      return;
    }
    if (noteModePrefRef.current === noteMode) return;
    noteModePrefRef.current = noteMode;
    void updateWorkbenchUserPreference({ preferred_note_mode: noteMode });
  }, [noteMode]);

  const [sidebarWidth, setSidebarWidth] = useState(NOTES_SIDEBAR_DEFAULT);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [documentZoom, setDocumentZoom] = useState(100);
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastLoadedUpdatedAtRef = useRef<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  const titleWasEditedRef = useRef(false);
  const notesLayoutRef = useRef<HTMLDivElement>(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const selectedProjectAccessRole = useMemo((): WorkbenchProjectAccessRole => {
    if (!selectedNote?.project_id || !props.currentUserId) return "none";
    if (ownerSet.has(selectedNote.project_id)) return "owner";
    if (editorSet.has(selectedNote.project_id)) return "editor";
    if (viewerSet.has(selectedNote.project_id)) return "viewer";
    return "none";
  }, [selectedNote, props.currentUserId, ownerSet, editorSet, viewerSet]);

  const projectPermissions = useMemo(
    () => deriveProjectPermissions(selectedProjectAccessRole),
    [selectedProjectAccessRole],
  );

  const canEditSelected = useMemo(() => {
    if (!selectedNote || !props.currentUserId) return false;
    if (selectedNote.project_id) return projectPermissions.canEdit;
    return noteCanEdit(selectedNote, props.currentUserId, ownerSet, editorSet);
  }, [selectedNote, props.currentUserId, ownerSet, editorSet, projectPermissions.canEdit]);

  const selectedProjectMeta = useMemo(() => {
    if (!selectedNote?.project_id) return null;
    const project = props.projects.find((p) => p.id === selectedNote.project_id);
    return {
      id: selectedNote.project_id,
      title: selectedNote.project_title || project?.title || "Project",
      ownerId: project?.owner_id ?? null,
    };
  }, [selectedNote, props.projects]);

  const projectAccessBadge = useMemo(() => {
    if (selectedProjectAccessRole === "none" || selectedProjectAccessRole === "owner") {
      return null;
    }
    if (selectedProjectAccessRole === "viewer") {
      return { label: "View only", className: "is-viewer" };
    }
    return { label: "Editor", className: "is-editor" };
  }, [selectedProjectAccessRole]);

  const resolvedShareProjectId = selectedNote?.project_id ?? projectId ?? null;

  const openShareModal = useCallback((event?: ReactMouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setShareModalOpen(true);
  }, []);

  const shareProjectHeaderExtra = useMemo(() => {
    if (!selectedNote) return null;
    return (
      <>
        {projectAccessBadge ? (
          <span
            className={`workbench-project-access-badge ${projectAccessBadge.className}`}
            title={projectAccessBadge.label}
          >
            {projectAccessBadge.label}
          </span>
        ) : null}
        {projectPermissions.canRenameProject ? (
          <button
            type="button"
            className="workbench-notes-settings-btn"
            onClick={() => setSettingsModalOpen(true)}
            title="Project settings"
          >
            Settings
          </button>
        ) : null}
        <button
          type="button"
          className="workbench-notes-share-btn"
          onClick={openShareModal}
          aria-haspopup="dialog"
          aria-expanded={shareModalOpen}
          title={
            resolvedShareProjectId
              ? "Share project with collaborators"
              : "Assign a project before inviting collaborators"
          }
        >
          Share
        </button>
      </>
    );
  }, [
    selectedNote,
    projectAccessBadge,
    openShareModal,
    shareModalOpen,
    resolvedShareProjectId,
    projectPermissions.canRenameProject,
  ]);

  const currentSnapshot = useMemo<SavedSnapshot>(
    () => ({
      title: normalizeNoteTitle(title),
      projectId,
      status: noteStatus,
      contentHtml,
      contentJson,
      plainText,
      wordCount,
      characterCount,
    }),
    [title, projectId, noteStatus, contentHtml, contentJson, plainText, wordCount, characterCount],
  );

  const snapshotRef = useRef(currentSnapshot);

  const isDirty = useMemo(
    () => Boolean(savedSnapshot && !snapshotsEqual(currentSnapshot, savedSnapshot)),
    [currentSnapshot, savedSnapshot],
  );

  const collaborationEnabled = Boolean(selectedNote?.project_id && props.currentUserId);

  const applyRemoteNote = useCallback(
    (row: WorkbenchNoteRow) => {
      const normalized = normalizeNote({
        ...(selectedNote ?? row),
        ...row,
        project_title:
          props.projects.find((p) => p.id === row.project_id)?.title ??
          selectedNote?.project_title ??
          "Project",
      });
      const snap = snapshotFromNote(normalized);
      setTitle(snap.title);
      setProjectId(snap.projectId);
      setNoteStatus(snap.status);
      setContentHtml(snap.contentHtml);
      setContentJson(snap.contentJson);
      setPlainText(snap.plainText);
      setWordCount(snap.wordCount);
      setCharacterCount(snap.characterCount);
      setSavedSnapshot(snap);
      setSaveState("saved");
      setEditorRevision((value) => value + 1);
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === normalized.id ? normalized : n))),
      );
    },
    [props.projects, selectedNote],
  );

  const collaboration = useWorkbenchProjectCollaboration({
    enabled: collaborationEnabled,
    projectId: selectedNote?.project_id ?? null,
    noteId: selectedId || null,
    noteMode,
    currentUserId: props.currentUserId,
    displayName: props.currentUserDisplayName ?? null,
    isDirty,
    isSaving: saveState === "saving",
    isCanvasInteracting: canvasInteracting,
    onRemoteNote: applyRemoteNote,
  });

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => {
      const status = noteStatusLabel(note.status).toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        (note.plain_text ?? "").toLowerCase().includes(q) ||
        note.project_title.toLowerCase().includes(q) ||
        status.includes(q)
      );
    });
  }, [notes, searchQuery]);

  const linkedRecordsForSelected = useMemo((): LinkedRecordView[] => {
    if (!selectedId) return [];
    const ids = noteRecordIdsByNote[selectedId] ?? [];
    return ids
      .map((id) => {
        const meta = linkableById.get(id);
        return {
          record_id: id,
          title: meta?.title ?? id,
          source_type: meta?.source_type ?? null,
        };
      })
      .filter(Boolean);
  }, [selectedId, noteRecordIdsByNote, linkableById]);

  const linkableForSelected = useMemo(() => {
    if (!projectId) return props.linkableRecords;
    return props.linkableRecords.filter((r) => !r.project_id || r.project_id === projectId);
  }, [props.linkableRecords, projectId]);

  const citations = useMemo(() => getCitations(contentJson), [contentJson]);
  const citationCandidates = useMemo(() => {
    const byRecordId = new Map<string, CitationCandidate>();

    function addCandidate(candidate: CitationCandidate) {
      const key = candidate.recordId ?? candidate.id;
      const existing = byRecordId.get(key);
      if (!existing) {
        byRecordId.set(key, {
          ...candidate,
          sourceTypes: candidate.sourceType ? [candidate.sourceType] : candidate.sourceTypes,
          sourceLabels: candidate.sourceLabel
            ? [candidate.sourceLabel]
            : (candidate.sourceLabels ?? []),
        });
        return;
      }

      const sourceTypes = new Set([
        ...(existing.sourceTypes ?? []),
        ...(candidate.sourceTypes ?? []),
        ...(candidate.sourceType ? [candidate.sourceType] : []),
      ]);
      const sourceLabels = new Set([
        ...(existing.sourceLabels ?? []),
        ...(candidate.sourceLabels ?? []),
        ...(candidate.sourceLabel ? [candidate.sourceLabel] : []),
      ]);
      byRecordId.set(key, {
        ...existing,
        title: existing.title || candidate.title,
        creator: existing.creator ?? candidate.creator ?? null,
        date: existing.date ?? candidate.date ?? null,
        institution: existing.institution ?? candidate.institution ?? null,
        sourceUrl: existing.sourceUrl ?? candidate.sourceUrl ?? null,
        recordType: existing.recordType ?? candidate.recordType ?? null,
        citationText: existing.citationText ?? candidate.citationText ?? null,
        bookmarkId: existing.bookmarkId ?? candidate.bookmarkId ?? null,
        readingListId: existing.readingListId ?? candidate.readingListId ?? null,
        readingListTitle: existing.readingListTitle ?? candidate.readingListTitle ?? null,
        sourceType: existing.sourceType ?? candidate.sourceType,
        sourceTypes: Array.from(sourceTypes),
        sourceLabels: Array.from(sourceLabels),
      });
    }

    for (const record of linkedRecordsForSelected) {
      addCandidate({
        id: `linked-note-${record.record_id}`,
        recordId: record.record_id,
        sourceType: "linked",
        sourceLabel: "Linked to this note",
        title: record.title,
        institution: record.source_type,
      });
    }

    for (const record of linkableForSelected) {
      addCandidate({
        id: `linked-project-${record.record_id}`,
        recordId: record.record_id,
        sourceType: "linked",
        sourceLabel: "Linked to this project",
        title: record.title,
        institution: record.source_type,
      });
    }

    for (const source of props.citationSources) {
      addCandidate({
        id: source.id,
        recordId: source.recordId,
        sourceType: source.sourceType,
        sourceLabel: source.sourceLabel,
        readingListId: source.readingListId,
        readingListTitle: source.readingListTitle,
        bookmarkId: source.bookmarkId,
        title: source.title,
        creator: source.creator,
        date: source.date,
        institution: source.institution,
        sourceUrl: source.sourceUrl,
        recordType: source.recordType,
        citationText: source.citationText,
      });
    }

    return Array.from(byRecordId.values()).sort((a, b) => a.title.localeCompare(b.title, "en"));
  }, [linkedRecordsForSelected, linkableForSelected, props.citationSources]);

  const defaultProjectId = props.projects[0]?.id ?? "";
  const readMinutes = readingMinutesFromWordCount(wordCount);
  const documentHeadings = useMemo(() => extractHeadingsFromHtml(contentHtml), [contentHtml]);
  const canvasState = useMemo(
    () => normalizeWorkbenchCanvasState(isRecord(contentJson) ? contentJson : {}),
    [contentJson],
  );
  const activeCanvas = useMemo(() => getActiveCanvasRecord(canvasState), [canvasState]);
  const canvasData = useMemo(() => activeCanvasData(canvasState), [canvasState]);
  const boardData = useMemo(() => getBoardData(contentJson), [contentJson]);
  const documentSettings = useMemo(() => getDocumentSettings(contentJson), [contentJson]);
  const selectedDocumentFont = useMemo(
    () => getWorkbenchDocumentFontOption(documentSettings.fontFamilyId),
    [documentSettings.fontFamilyId],
  );

  const overlayOpen =
    commandOpen || switcherOpen || newNoteMenuOpen || citationPickerOpen;

  function handleOpenCitation(event?: ReactMouseEvent<HTMLButtonElement>) {
    if (event?.currentTarget) {
      setCitationAnchorRect(event.currentTarget.getBoundingClientRect());
    }
    setCitationPickerOpen(true);
  }

  function handleOpenAICitation() {
    setAIAssistantOpen(true);
  }

  function handleToggleAICitation() {
    setAIAssistantOpen((open) => !open);
  }

  function handleSelectAICandidate(candidate: CitationCandidate) {
    setCitationPreselectId(candidate.id);
    setCitationPickerOpen(true);
    setAIAssistantOpen(false);
  }

  function handleInsertScholarlyResult(result: {
    id: string;
    title: string;
    creator: string;
    year: string;
    journal?: string;
    publisher?: string;
    source: string;
    url: string;
    citationLine: string;
  }) {
    const candidate: CitationCandidate = {
      id: result.id,
      title: result.title,
      creator: result.creator,
      date: result.year || null,
      institution: result.journal || result.publisher || result.source,
      sourceUrl: result.url,
      citationText: result.citationLine,
      sourceType: "custom",
      sourceLabel: result.source,
    };
    handleInsertCitation({
      candidate,
      style: "apa7",
      insertMode: "parenthetical",
      customText: "",
    });
    setAIAssistantOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (aiAssistantOpen) {
        setAIAssistantOpen(false);
        return;
      }
      if (citationPickerOpen || commandOpen || switcherOpen) return;
      setNotesDrawerOpen(false);
      setInspectorOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aiAssistantOpen, citationPickerOpen, commandOpen, switcherOpen]);

  const sidebarMin = isFocusMode ? NOTES_SIDEBAR_FOCUS_MIN : NOTES_SIDEBAR_MIN;
  const sidebarMax = isFocusMode ? NOTES_SIDEBAR_FOCUS_MAX : NOTES_SIDEBAR_MAX;

  const notesLayoutStyle = useMemo(
    () =>
      ({
        "--notes-sidebar-width": `${sidebarWidth}px`,
      }) as CSSProperties,
    [sidebarWidth],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NOTES_SIDEBAR_STORAGE_KEY);
      if (!stored) return;
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        setSidebarWidth(clampSidebarWidth(parsed, false));
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarWidth]);

  useEffect(() => {
    setSidebarWidth((width) => clampSidebarWidth(width, isFocusMode));
  }, [isFocusMode]);

  const applySidebarWidthFromPointer = useCallback(
    (clientX: number) => {
      const layout = notesLayoutRef.current;
      if (!layout) return;
      const rect = layout.getBoundingClientRect();
      setSidebarWidth(clampSidebarWidth(clientX - rect.left, isFocusMode));
    },
    [isFocusMode],
  );

  useEffect(() => {
    if (!isResizingSidebar) return;

    document.body.classList.add("workbench-is-resizing-notes-sidebar");

    function onPointerMove(event: PointerEvent) {
      applySidebarWidthFromPointer(event.clientX);
    }

    function onPointerUp() {
      setIsResizingSidebar(false);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      document.body.classList.remove("workbench-is-resizing-notes-sidebar");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizingSidebar, applySidebarWidthFromPointer]);

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsResizingSidebar(true);
    applySidebarWidthFromPointer(event.clientX);
  }

  function handleResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 16;
    let next = sidebarWidth;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        next = sidebarWidth - step;
        break;
      case "ArrowRight":
        event.preventDefault();
        next = sidebarWidth + step;
        break;
      case "Home":
        event.preventDefault();
        next = sidebarMin;
        break;
      case "End":
        event.preventDefault();
        next = sidebarMax;
        break;
      default:
        return;
    }

    setSidebarWidth(clampSidebarWidth(next, isFocusMode));
  }

  function handleResizeDoubleClick() {
    setSidebarWidth(clampSidebarWidth(NOTES_SIDEBAR_DEFAULT, isFocusMode));
  }

  useEffect(() => {
    if (!isFocusMode) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (overlayOpen) return;
      event.preventDefault();
      setIsFocusMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocusMode, overlayOpen]);

  useEffect(() => {
    document.body.classList.toggle("workbench-notes-focus-body", isFocusMode);
    document.body.classList.toggle("workbench-notes-fullscreen-body", isFocusMode);
    const shell = document.querySelector(".workbench-shell");
    shell?.classList.toggle("workbench-shell--notes-focus", isFocusMode);
    return () => {
      document.body.classList.remove("workbench-notes-focus-body");
      document.body.classList.remove("workbench-notes-fullscreen-body");
      shell?.classList.remove("workbench-shell--notes-focus");
    };
  }, [isFocusMode]);

  useEffect(() => {
    if (!selectedId && isFocusMode) {
      setIsFocusMode(false);
    }
  }, [selectedId, isFocusMode]);

  useEffect(() => {
    if (noteMode === "canvas" && isFocusMode) {
      setIsFocusMode(false);
    }
  }, [noteMode, isFocusMode]);

  function toggleFocusMode() {
    if (!selectedId) return;
    setNewNoteMenuOpen(false);
    setIsFocusMode((value) => !value);
  }

  useWorkbenchNotesShortcuts({
    enabled: Boolean(selectedId),
    focusMode: isFocusMode,
    overlayOpen,
    onSave: () => handleManualSave(),
    onToggleFocus: toggleFocusMode,
    onOpenCommand: () => setCommandOpen(true),
    onOpenSwitcher: () => setSwitcherOpen(true),
    onToggleList: () => undefined,
    onCloseOverlay: () => {
      setCommandOpen(false);
      setSwitcherOpen(false);
      setNewNoteMenuOpen(false);
    },
  });

  const commandItems = useMemo<CommandItem[]>(
    () => [
      { id: "save", label: "Save note", hint: "⌘S", run: () => handleManualSave() },
      { id: "switcher", label: "Jump to note", hint: "⌘⇧P", run: () => setSwitcherOpen(true) },
      { id: "new", label: "New blank note", run: () => handleNewNote("blank") },
      {
        id: "template-source",
        label: "New source annotation",
        run: () => handleNewNote("source_annotation"),
      },
      {
        id: "template-ethics",
        label: "New ethics / cultural care note",
        run: () => handleNewNote("ethics_cultural_care"),
      },
      { id: "copy", label: "Copy note", run: () => void handleCopyNote() },
      { id: "markdown", label: "Download markdown", run: () => handleDownloadMarkdown() },
      {
        id: "insert-citation",
        label: "Insert citation",
        run: () => {
          setNoteMode("document");
          setCitationPickerOpen(true);
        },
      },
      {
        id: "focus",
        label: isFocusMode ? "Exit fullscreen" : "Enter fullscreen",
        hint: "⌘\\",
        run: () => toggleFocusMode(),
      },
      {
        id: "details",
        label: detailsOpen ? "Hide details" : "Show details",
        run: () => setDetailsOpen((v) => !v),
      },
    ],
    [detailsOpen, isFocusMode],
  );

  function scrollToHeading(heading: NoteHeading) {
    if (!editorInstance || editorInstance.isDestroyed) return;
    const root = editorInstance.view.dom;
    const nodes = root.querySelectorAll("h2, h3");
    for (const node of nodes) {
      if (node.textContent?.trim() === heading.text) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        editorChain(editorInstance).run();
        break;
      }
    }
  }

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    snapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  useEffect(() => {
    if (saveState === "saving" || saveState === "error") return;
    if (isDirty) setSaveState("unsaved");
    else if (savedSnapshot) setSaveState("saved");
  }, [isDirty, saveState, savedSnapshot]);

  const persist = useCallback(
    async (noteId: string, snapshot: SavedSnapshot) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaveState("saving");
      setSaveError("");
      setSaveConflict("");

      let saveTitle = snapshot.title;
      if (shouldAutoGenerateNoteTitle(saveTitle, titleWasEditedRef.current, snapshot.plainText)) {
        saveTitle = deriveNoteTitleFromPlainText(snapshot.plainText);
        setTitle(saveTitle);
      }

      const result = await updateWorkbenchNote({
        noteId,
        title: saveTitle,
        contentHtml: snapshot.contentHtml,
        contentJson: snapshot.contentJson,
        plainText: snapshot.plainText,
        wordCount: snapshot.wordCount,
        characterCount: snapshot.characterCount,
        projectId: snapshot.projectId,
        status: snapshot.status,
        saveContext: {
          mode: noteMode,
          activityAction: "note_saved",
        },
        expectedUpdatedAt: lastLoadedUpdatedAtRef.current,
      });

      savingRef.current = false;

      if (!result.ok) {
        if (result.conflict) {
          setSaveConflict(
            result.error ||
              "New changes are available. Review or reload before saving.",
          );
          setSaveState("unsaved");
          setSaveError("");
          return;
        }
        setSaveState("error");
        setSaveError(result.error || "Could not save note.");
        return;
      }

      if (result.note) {
        lastLoadedUpdatedAtRef.current = result.note.updated_at;
        const nextSnapshot = snapshotFromNote(result.note);
        setSavedSnapshot(nextSnapshot);
        setNotes((prev) =>
          sortNotes(
            prev.map((n) =>
              n.id === result.note!.id
                ? {
                    ...normalizeNote({
                      ...n,
                      ...result.note!,
                      project_title:
                        props.projects.find((p) => p.id === result.note!.project_id)?.title ??
                        (result.note!.project_id ? "Project" : "Personal"),
                    }),
                  }
                : n,
            ),
          ),
        );
      }
      setSaveState("saved");
    },
    [noteMode, props.projects],
  );

  const flushSaveNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const noteId = selectedIdRef.current;
    if (!noteId || !canEditSelected) return;
    void persist(noteId, snapshotRef.current);
  }, [canEditSelected, persist]);

  const scheduleSave = useCallback(() => {
    const noteId = selectedIdRef.current;
    if (!noteId || !canEditSelected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = noteMode === "canvas" ? CANVAS_AUTOSAVE_DELAY_MS : 1000;
    debounceRef.current = setTimeout(() => {
      void persist(noteId, snapshotRef.current);
    }, delay);
  }, [canEditSelected, noteMode, persist]);

  function selectNote(note: WorkbenchNoteWithProject) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const normalized = normalizeNote(note);
    const snap = snapshotFromNote(normalized);
    setSelectedId(normalized.id);
    setTitle(snap.title);
    setProjectId(snap.projectId);
    setNoteStatus(snap.status);
    setContentHtml(snap.contentHtml);
    setContentJson(snap.contentJson);
    setPlainText(snap.plainText);
    setWordCount(snap.wordCount);
    setCharacterCount(snap.characterCount);
    setSavedSnapshot(snap);
    setSaveState("saved");
    setSaveError("");
    setSaveConflict("");
    setImageError("");
    lastLoadedUpdatedAtRef.current = normalized.updated_at;
    titleWasEditedRef.current = !isDefaultUntitled(snap.title);
    setEditorRevision((v) => v + 1);
    setNotesDrawerOpen(false);
  }

  function isDefaultUntitled(value: string) {
    return !value.trim() || value.trim().toLowerCase() === "untitled note";
  }

  function handleEditorChange(payload: WorkbenchEditorPayload) {
    const nextJson = {
      ...mergeWorkbenchModeData(payload.json, contentJson),
      workbenchCitations: getCitations(contentJson),
    };
    setContentHtml(payload.html);
    setContentJson(nextJson);
    setPlainText(payload.plainText);
    setWordCount(payload.wordCount);
    setCharacterCount(payload.characterCount);
    snapshotRef.current = {
      ...snapshotRef.current,
      contentHtml: payload.html,
      contentJson: nextJson,
      plainText: payload.plainText,
      wordCount: payload.wordCount,
      characterCount: payload.characterCount,
    };
    scheduleSave();
  }

  function updateContentJson(nextJson: Record<string, unknown>) {
    setContentJson(nextJson);
    snapshotRef.current = {
      ...snapshotRef.current,
      contentJson: nextJson,
    };
    scheduleSave();
  }

  function updateDocumentSettings(
    patch: Partial<{ fontFamilyId: WorkbenchDocumentFontId }>,
  ) {
    const base = isRecord(contentJson) ? contentJson : { type: "doc" };
    const currentSettings = getDocumentSettings(base);
    updateContentJson({
      ...base,
      documentSettings: {
        ...currentSettings,
        ...patch,
      },
      workbenchCanvas: serializeWorkbenchCanvasState(
        normalizeWorkbenchCanvasState(base),
      ),
      workbenchBoard: getBoardData(base),
      workbenchCitations: getCitations(base),
    });
  }

  function handleDocumentFontChange(fontFamilyId: WorkbenchDocumentFontId) {
    if (!isWorkbenchDocumentFontId(fontFamilyId)) return;
    updateDocumentSettings({ fontFamilyId });
    const font = getWorkbenchDocumentFontOption(fontFamilyId);
    if (editorInstance && !editorInstance.isDestroyed) {
      editorChain(editorInstance).setFontFamily(font.fontFamily).run();
    }
  }

  function handleResetDocumentTypography() {
    updateDocumentSettings({ fontFamilyId: DEFAULT_WORKBENCH_DOCUMENT_FONT_ID });
    if (!editorInstance || editorInstance.isDestroyed) return;
    editorChain(editorInstance).unsetFontFamily().unsetFontSize().run();
  }

  function persistWorkbenchCanvasState(nextState: WorkbenchCanvasState) {
    const base = isRecord(contentJson) ? contentJson : { type: "doc" };
    updateContentJson({
      ...base,
      workbenchCanvas: serializeWorkbenchCanvasState(nextState),
      workbenchBoard: getBoardData(contentJson),
      workbenchCitations: getCitations(contentJson),
    });
  }

  function mutateWorkbenchCanvas(
    updater: (state: WorkbenchCanvasState) => WorkbenchCanvasState,
  ) {
    const current = normalizeWorkbenchCanvasState(isRecord(contentJson) ? contentJson : {});
    persistWorkbenchCanvasState(updater(current));
  }

  function updateCanvasData(nextCanvasData: WorkbenchCanvasData) {
    mutateWorkbenchCanvas((state) =>
      updateActiveCanvasObjects(state, nextCanvasData.objects),
    );
  }

  function updateBoardData(nextBoardData: WorkbenchBoardData) {
    const base = isRecord(contentJson) ? contentJson : { type: "doc" };
    updateContentJson({
      ...base,
      workbenchCanvas: serializeWorkbenchCanvasState(canvasState),
      workbenchBoard: nextBoardData,
      workbenchCitations: getCitations(contentJson),
    });
  }

  function handleTitleChange(value: string) {
    titleWasEditedRef.current = true;
    setTitle(value);
    scheduleSave();
  }

  function handleProjectChange(value: string) {
    setProjectId(value || null);
    scheduleSave();
  }

  function handleStatusChange(value: string) {
    setNoteStatus(normalizeNoteStatus(value));
    scheduleSave();
  }

  function exportCurrentNote(format: WorkbenchNoteExportFormat) {
    void trackWorkbenchActivity({
      eventType: "export_created",
      entityType: "export",
      entityId: selectedNote?.id ?? null,
      projectId: projectId,
      metadata: { format },
    });
    const noteTitle = normalizeNoteTitle(title) || "Untitled note";
    const baseName = safeFileName(noteTitle);
    const exportEndnotes = citationsForEndnotes(contentHtml, citations);
    const exportHtml = exportEndnotes.length
      ? refreshEndnotesHtml(contentHtml, exportEndnotes)
      : stripWorkbenchEndnotes(contentHtml);

    if (format === "txt") {
      const content = `${noteTitle}\n\n${htmlToText(stripWorkbenchEndnotes(exportHtml))}${citationsToPlainText(exportEndnotes)}`;
      downloadNoteFile(`${baseName}.txt`, "text/plain;charset=utf-8", content);
      return;
    }

    if (format === "md") {
      const boardSummary = boardCardsToMarkdownSummary(boardData.cards);
      const content = `# ${noteTitle}\n\n${boardSummary}${htmlToMarkdown(stripWorkbenchEndnotes(exportHtml))}${citationsToMarkdown(exportEndnotes)}`;
      downloadNoteFile(`${baseName}.md`, "text/markdown;charset=utf-8", content);
      return;
    }

    if (format === "html") {
      const content = buildWordCompatibleHtml(noteTitle, exportHtml);
      downloadNoteFile(`${baseName}.html`, "text/html;charset=utf-8", content);
      return;
    }

    if (format === "jpeg") {
      void exportDocumentPagesAsJpeg(`${baseName}.jpg`).catch((error) => {
        setSaveError(
          error instanceof Error ? error.message : "Could not export JPEG. Try again in Document mode.",
        );
      });
      return;
    }

    if (format === "doc") {
      const content = buildWordCompatibleHtml(noteTitle, exportHtml);
      downloadNoteFile(`${baseName}.doc`, "application/msword;charset=utf-8", content);
      return;
    }

    if (format === "docx") {
      void exportNoteAsDocx(noteTitle, exportHtml, `${baseName}.docx`).catch((error) => {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Could not export Word document. Try again or use the PDF option.",
        );
      });
      return;
    }

    if (format === "pdf") {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) {
        setSaveError("Could not open the print window. Please allow pop-ups and try again.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(buildWordCompatibleHtml(noteTitle, exportHtml));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  function handleManualSave() {
    if (!selectedId || !canEditSelected) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void persist(selectedId, currentSnapshot);
  }

  function handleDiscard() {
    if (!savedSnapshot) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setTitle(savedSnapshot.title);
    setProjectId(savedSnapshot.projectId);
    setNoteStatus(savedSnapshot.status);
    setContentHtml(savedSnapshot.contentHtml);
    setContentJson(savedSnapshot.contentJson);
    setPlainText(savedSnapshot.plainText);
    setWordCount(savedSnapshot.wordCount);
    setCharacterCount(savedSnapshot.characterCount);
    titleWasEditedRef.current = !isDefaultUntitled(savedSnapshot.title);
    setEditorRevision((v) => v + 1);
    setSaveState("saved");
    setSaveError("");
  }

  function applyTemplate(templateId: WorkbenchNoteTemplateId) {
    const template = getWorkbenchNoteTemplate(templateId);

    if (!selectedId) {
      handleNewNote(templateId);
      setNewNoteMenuOpen(false);
      return;
    }

    const empty = isNoteContentEmpty(plainText, contentHtml);
    if (!empty && !window.confirm("Replace the current note content with this template?")) {
      return;
    }

    if (templateId !== "blank") {
      titleWasEditedRef.current = false;
      setTitle(template.title);
      setContentHtml(template.html);
      setContentJson(null);
      setEditorRevision((v) => v + 1);
      scheduleSave();
    }
    setNewNoteMenuOpen(false);
  }

  function handleNewNote(templateId: WorkbenchNoteTemplateId = "blank") {
    const template = getWorkbenchNoteTemplate(templateId);
    const nextProjectId = projectId || selectedNote?.project_id || defaultProjectId || null;
    startTransition(async () => {
      const result = await createWorkbenchNote({
        projectId: nextProjectId,
        title: template.title,
        contentHtml: template.html,
      });
      if (!result.ok || !result.note) {
        setSaveError(result.error || "Could not create note.");
        return;
      }
      const withProject: WorkbenchNoteWithProject = normalizeNote({
        ...result.note,
        project_title: result.note.project_id
          ? (props.projects.find((p) => p.id === result.note!.project_id)?.title ?? "Project")
          : "Personal",
      });
      setNotes((prev) => sortNotes([withProject, ...prev]));
      selectNote(withProject);
      setNewNoteMenuOpen(false);
    });
  }

  function handleDeleteNote() {
    if (!selectedId || !canEditSelected) return;
    if (!window.confirm("Delete this note? You can create a new one anytime.")) return;
    startTransition(async () => {
      const result = await deleteWorkbenchNote({ noteId: selectedId });
      if (!result.ok) {
        setSaveError(result.error || "Could not delete note.");
        return;
      }
      const remaining = notes.filter((n) => n.id !== selectedId);
      setNotes(remaining);
      const restLinks = { ...noteRecordIdsByNote };
      delete restLinks[selectedId];
      setNoteRecordIdsByNote(restLinks);
      if (remaining[0]) {
        selectNote(remaining[0]);
      } else {
        setSelectedId("");
        setTitle("");
        setProjectId(null);
        setNoteStatus("draft");
        setContentHtml("<p></p>");
        setContentJson(null);
        setPlainText("");
        setWordCount(0);
        setCharacterCount(0);
        setSavedSnapshot(null);
        setNoteMode("document");
        setSaveState("saved");
        titleWasEditedRef.current = false;
      }
    });
  }

  function handleTogglePin(note: WorkbenchNoteWithProject, event: ReactMouseEvent) {
    event.stopPropagation();
    if (!noteCanEdit(note, props.currentUserId, ownerSet, editorSet)) return;
    startTransition(async () => {
      const result = await toggleWorkbenchNotePinned({
        noteId: note.id,
        pinned: !note.pinned,
      });
      if (!result.ok || !result.note) {
        setSaveError(result.error || "Could not update pin.");
        return;
      }
      setNotes((prev) =>
        sortNotes(
          prev.map((n) => (n.id === note.id ? { ...n, pinned: result.note!.pinned } : n)),
        ),
      );
    });
  }

  function handleLinksChange(noteId: string, recordIds: string[]) {
    setNoteRecordIdsByNote((prev) => ({ ...prev, [noteId]: recordIds }));
  }

  function handleInsertLinkedRecordBlock(record: LinkedRecordView) {
    const source = record.source_type ? `<p>${escapeHtml(record.source_type)}</p>` : "";
    setInsertHtml(
      `<blockquote><p><strong>${escapeHtml(record.title)}</strong></p>${source}</blockquote><p></p>`,
    );
  }

  async function handleCopyNote() {
    try {
      await copyNoteToClipboard(title, plainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaveError("Could not copy note to clipboard.");
    }
  }

  function handleDownloadMarkdown() {
    exportCurrentNote("md");
  }


function editorChain(editor: Editor): ChainedCommands {
  return editor.chain().focus();
}

  function runEditorCommand(command: (editor: Editor) => void) {
    if (!editorInstance || editorInstance.isDestroyed || !canEditSelected) return;
    command(editorInstance);
    scheduleSave();
  }

  function handlePrintNote() {
    exportCurrentNote("pdf");
  }

  function handleInsertLink() {
    if (!editorInstance || !canEditSelected) return;
    const previousUrl = editorInstance.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      runEditorCommand((editor) => editorChain(editor).extendMarkRange("link").unsetLink().run());
      return;
    }
    runEditorCommand((editor) =>
      editorChain(editor).extendMarkRange("link").setLink({ href: trimmed }).run(),
    );
  }

  function handleInsertImageUrl() {
    if (!editorInstance || !canEditSelected) return;
    const url = window.prompt("Image URL", "https://");
    if (!url?.trim()) return;
    runEditorCommand((editor) => editorChain(editor).setImage({ src: url.trim() }).run());
  }

  function handleInsertDocumentPageBreak() {
    if (!editorInstance || editorInstance.isDestroyed || !canEditSelected) return;
    editorInstance.chain().focus().insertPageBreak().run();
    commitEditorHtml(editorInstance.getHTML());
  }

  function sendHtmlToDocument(html: string, card?: WorkbenchBoardCard) {
    if (!html.trim()) return;
    setInsertHtml(html);
    setNoteMode("document");
    if (card) {
      void trackWorkbenchActivity({
        eventType: "board_card_sent_to_document",
        entityType: "board_card",
        entityId: card.id,
        projectId: projectId,
      });
      updateBoardData({
        ...boardData,
        cards: boardData.cards.map((item) =>
          item.id === card.id ? { ...item, usedInDocument: true, updatedAt: new Date().toISOString() } : item,
        ),
      });
    }
  }

  function commitEditorHtml(nextHtml: string, nextCitations = citations) {
    const nextPlainText = htmlToText(nextHtml);
    const nextJson = {
      ...mergeWorkbenchModeData(
        (editorInstance?.getJSON() as Record<string, unknown> | null) ?? contentJson,
        contentJson,
      ),
      workbenchCitations: nextCitations,
    };
    setContentHtml(nextHtml);
    setContentJson(nextJson);
    setPlainText(nextPlainText);
    setWordCount(countWordsFromText(nextPlainText));
    setCharacterCount(nextPlainText.length);
    snapshotRef.current = {
      ...snapshotRef.current,
      contentHtml: nextHtml,
      contentJson: nextJson,
      plainText: nextPlainText,
      wordCount: countWordsFromText(nextPlainText),
      characterCount: nextPlainText.length,
    };
    scheduleSave();
  }

  function handleRefreshEndnotesSection() {
    if (!editorInstance || !canEditSelected) return;
    const nextHtml = refreshReferenceListHtml(editorInstance.getHTML(), citations);
    editorInstance.commands.setContent(nextHtml, { emitUpdate: false });
    commitEditorHtml(nextHtml, citations);
    setCitationRevision((value) => value + 1);
  }

  /* ─── EndNote-style click handling on in-text citation anchors ─── */

  function rectFromAnchor(anchor: HTMLElement) {
    const r = anchor.getBoundingClientRect();
    return {
      top: r.top,
      left: r.left,
      bottom: r.bottom,
      right: r.right,
      width: r.width,
      height: r.height,
    };
  }

  function openCitationEditor(citationId: string, anchor: HTMLElement) {
    setEditingCitation({ citationId, rect: rectFromAnchor(anchor) });
    /* Visual editing state on the clicked anchor */
    document
      .querySelectorAll(".workbench-citation-link.is-editing")
      .forEach((el) => el.classList.remove("is-editing"));
    anchor.classList.add("is-editing");
  }

  function jumpToReference(referenceId: string) {
    const target = document.querySelector<HTMLElement>(
      `#ref-workbench-citation-${CSS.escape(referenceId)}`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    /* Manually highlight (acts like :target without changing the URL) */
    target.classList.add("is-jump-highlight");
    window.setTimeout(() => target.classList.remove("is-jump-highlight"), 1800);
  }

  useEffect(() => {
    if (!editorInstance || editorInstance.isDestroyed) return undefined;
    const root = editorInstance.view.dom;

    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest<HTMLElement>(
        "a.workbench-citation-link,[data-workbench-citation]",
      );
      if (!anchor) return;
      let citationId =
        anchor.getAttribute("data-citation-id") ||
        anchor.getAttribute("data-workbench-citation") ||
        "";
      const refIdFromAnchor =
        anchor.getAttribute("data-reference-id") ||
        anchor.getAttribute("href")?.replace(/^#ref-workbench-citation-/, "").trim() ||
        "";
      if (!citationId && refIdFromAnchor) {
        citationId =
          citations.find((citation) => citationReferenceId(citation) === refIdFromAnchor)?.id ?? "";
      }
      if (!citationId) return;
      const mouse = event as globalThis.MouseEvent;
      const isJumpModifier = mouse.metaKey || mouse.ctrlKey;
      event.preventDefault();
      if (isJumpModifier) {
        const refId =
          refIdFromAnchor ||
          (citations.find((c) => c.id === citationId)
            ? citationReferenceId(citations.find((c) => c.id === citationId)!)
            : "");
        if (refId) jumpToReference(refId);
        return;
      }
      openCitationEditor(citationId, anchor);
    };

    root.addEventListener("click", handleClick);
    return () => {
      root.removeEventListener("click", handleClick);
    };
  }, [editorInstance, citations]);

  useEffect(() => {
    if (!editorInstance || editorInstance.isDestroyed || !canEditSelected || !citations.length) return;

    const currentHtml = editorInstance.getHTML();
    const rewrittenHtml = rewriteAllCitationAnchors(currentHtml, citations);
    if (rewrittenHtml === currentHtml) return;

    const nextHtml = refreshReferenceListHtml(rewrittenHtml, citations);
    editorInstance.commands.setContent(nextHtml, { emitUpdate: false });
    commitEditorHtml(nextHtml, citations);
    setCitationRevision((value) => value + 1);
  }, [canEditSelected, citations, editorInstance, selectedId]);

  /* Save edits made in the popover */
  function saveCitationEdits(
    citationId: string,
    patch: { displayText?: string; prefix?: string; suffix?: string; pages?: string },
  ) {
    if (!editorInstance || editorInstance.isDestroyed) return;
    const target = citations.find((c) => c.id === citationId);
    if (!target) return;
    const updated: WorkbenchNoteCitation = {
      ...target,
      displayText: patch.displayText ?? target.displayText ?? target.inTextCitation,
      prefix: patch.prefix ?? target.prefix ?? "",
      suffix: patch.suffix ?? target.suffix ?? "",
      pages: patch.pages ?? target.pages ?? "",
      referenceId: citationReferenceId(target),
    };
    const nextCitations = citations.map((c) => (c.id === citationId ? updated : c));
    /* Rewrite every in-text anchor for this citation, then refresh the reference list */
    let nextHtml = rewriteCitationAnchors(editorInstance.getHTML(), updated);
    nextHtml = refreshReferenceListHtml(nextHtml, nextCitations);
    editorInstance.commands.setContent(nextHtml, { emitUpdate: false });
    commitEditorHtml(nextHtml, nextCitations);
    setCitationRevision((value) => value + 1);
    setEditingCitation(null);
  }

  function removeCitation(citationId: string) {
    if (!editorInstance || editorInstance.isDestroyed) return;
    const nextCitations = citations.filter((c) => c.id !== citationId);
    let nextHtml = removeCitationAnchors(editorInstance.getHTML(), citationId);
    nextHtml = refreshReferenceListHtml(nextHtml, nextCitations);
    editorInstance.commands.setContent(nextHtml, { emitUpdate: false });
    commitEditorHtml(nextHtml, nextCitations);
    setCitationRevision((value) => value + 1);
    setEditingCitation(null);
  }

  function closeCitationEditor() {
    document
      .querySelectorAll(".workbench-citation-link.is-editing")
      .forEach((el) => el.classList.remove("is-editing"));
    setEditingCitation(null);
  }

  function handleInsertCitation(input: {
    candidate: CitationCandidate | null;
    style: WorkbenchCitationStyle;
    insertMode: WorkbenchCitationInsertMode;
    customText: string;
  }) {
    if (!editorInstance || !canEditSelected) return;
    const marker = citations.length + 1;
    const inTextCitation = formatInTextCitation(
      input.candidate,
      input.style,
      input.insertMode,
      marker,
      input.customText,
    );
    const endnoteText = formatEndnoteCitation(input.candidate, input.style, input.customText);
    const bibliographyText = formatBibliographyCitation(input.candidate, input.style, input.customText);
    const citationText = input.insertMode === "full_block" ? bibliographyText : inTextCitation;
    if (!citationText.trim() || !endnoteText.trim()) return;
    const selectedSourceType: WorkbenchNoteCitation["sourceType"] =
      input.candidate?.readingListId
        ? "reading_list"
        : input.candidate?.bookmarkId
          ? "bookmark"
          : input.candidate?.sourceTypes?.includes("linked")
            ? "linked"
            : input.candidate?.sourceType ?? "custom";
    /* Compute stable reference id; reuse existing reference entry for the same source */
    const referenceId = computeReferenceId({
      recordId: input.candidate?.recordId,
      bookmarkId: input.candidate?.bookmarkId,
      readingListId: input.candidate?.readingListId,
      title: input.candidate?.title,
      creator: input.candidate?.creator,
      date: input.candidate?.date,
    });
    const citation: WorkbenchNoteCitation = {
      id: createWorkbenchNoteId("citation"),
      marker,
      recordId: input.candidate?.recordId,
      sourceType: selectedSourceType,
      readingListId: input.candidate?.readingListId ?? null,
      readingListTitle: input.candidate?.readingListTitle ?? null,
      bookmarkId: input.candidate?.bookmarkId ?? null,
      title: input.candidate?.title?.trim() || "Untitled source",
      creator: input.candidate?.creator ?? null,
      date: input.candidate?.date ?? null,
      institution: input.candidate?.institution ?? null,
      sourceUrl: input.candidate?.sourceUrl ?? null,
      citationText,
      style: input.style,
      insertMode: input.insertMode,
      inTextCitation,
      endnoteText,
      bibliographyText,
      customText: input.customText.trim() || null,
      referenceId,
      displayText: inTextCitation,
      prefix: "",
      suffix: "",
      pages: "",
    };
    const nextCitations = [...citations, citation];
    /* Full block stays as a blockquote excerpt; everything else becomes an editable anchor */
    const insertedHtml =
      input.insertMode === "full_block"
        ? `<blockquote data-workbench-citation="${escapeHtml(citation.id)}" data-reference-id="${escapeHtml(referenceId)}"><p>${escapeHtml(citationText)}</p></blockquote><p></p>`
        : buildCitationLinkHtml(citation);

    const restoreScroll = captureWorkbenchEditorScroll();
    setNoteMode("document");
    editorChain(editorInstance).insertContent(insertedHtml).run();
    const cursorAfterCitation = editorInstance.state.selection.to;
    /* Always refresh the reference list so it stays in sync */
    const nextHtml = refreshReferenceListHtml(editorInstance.getHTML(), nextCitations);
    if (nextHtml !== editorInstance.getHTML()) {
      editorInstance.commands.setContent(nextHtml, { emitUpdate: false });
      editorInstance.commands.setTextSelection(Math.min(cursorAfterCitation, editorInstance.state.doc.content.size));
    }
    commitEditorHtml(nextHtml, nextCitations);
    setCitationRevision((value) => value + 1);
    restoreScroll();
    if (input.candidate?.recordId) {
      updateBoardData({
        ...boardData,
        cards: boardData.cards.map((item) =>
          item.linkedRecordId === input.candidate?.recordId
            ? { ...item, cited: true, updatedAt: new Date().toISOString() }
            : item,
        ),
      });
    }
    void trackWorkbenchActivity({
      eventType: "citation_inserted",
      entityType: "citation",
      entityId: citation.id,
      projectId: projectId,
      metadata: { style: input.style, record_id: citation.recordId },
    });
    void updateWorkbenchUserPreference({ preferred_citation_style: input.style });
    setCitationPickerOpen(false);
    setCitationPreselectId(null);
  }

  function addCanvasBlockFromMenu(type: CanvasBlockType) {
    if (!canEditSelected) return;
    const map = {
      text: "text",
      sticky: "sticky",
      quote: "quote",
      archiveRecord: "source",
      imagePlaceholder: "image",
    } as const;
    const objectType = map[type];
    const record = type === "archiveRecord" ? linkableForSelected[0] : undefined;
    const obj = createCanvasObject({
      type: objectType,
      x: 80 + (canvasData.objects.length % 4) * 28,
      y: 80 + canvasData.objects.length * 24,
      zIndex: nextZIndex(canvasData.objects),
      record,
      patch: { id: createWorkbenchNoteId("canvas") },
    });
    updateCanvasData({ version: canvasData.version, objects: [...canvasData.objects, obj] });
    void trackWorkbenchActivity({
      eventType: "canvas_block_created",
      entityType: "canvas_block",
      entityId: obj.id,
      projectId: projectId,
      metadata: { block_type: type },
    });
    setNoteMode("canvas");
  }


  function openBoardRecord(recordId: string) {
    window.open(`/records/${encodeURIComponent(recordId)}`, "_blank", "noopener,noreferrer");
  }

  function handleCiteBoardCard(card: WorkbenchBoardCard) {
    if (!card.linkedRecordId) {
      setNoteMode("document");
      setCitationPickerOpen(true);
      return;
    }
    const candidate = citationCandidates.find((item) => item.recordId === card.linkedRecordId);
    setCitationPreselectId(candidate?.id ?? null);
    setNoteMode("document");
    setCitationPickerOpen(true);
  }

  function handleCiteInspectorRecord(recordId: string) {
    const candidate = citationCandidates.find((item) => item.recordId === recordId);
    setCitationPreselectId(candidate?.id ?? null);
    setNoteMode("document");
    setCitationPickerOpen(true);
  }

  function sendBoardCardToCanvas(card: WorkbenchBoardCard) {
    if (!canEditSelected) return;
    const cardType = normalizeCardType(card.type);
    const objectType =
      cardType === "image"
        ? "image"
        : cardType === "quote"
          ? "quote"
          : cardType === "source"
            ? "source"
            : cardType === "question"
              ? "question"
              : cardType === "task"
                ? "task"
                : cardType === "link"
                  ? "link"
                  : "text";
    const obj = createCanvasObject({
      type: objectType,
      x: 80 + (canvasData.objects.length % 4) * 28,
      y: 80 + canvasData.objects.length * 24,
      zIndex: nextZIndex(canvasData.objects),
      patch: {
        id: createWorkbenchNoteId("canvas"),
        title: card.title || "Canvas block",
        body: card.body?.trim() || "",
        linkedRecordId: card.linkedRecordId ?? null,
        imageUrl: cardType === "image" ? card.imageUrl?.trim() || undefined : undefined,
        sourceOrigin: card.linkedRecordId ? "archive" : undefined,
      },
    });
    updateCanvasData({ version: canvasData.version, objects: [...canvasData.objects, obj] });
    setNoteMode("canvas");
  }

  function addBoardCardFromMenu(type: BoardCardType = "note") {
    if (!canEditSelected) return;
    const record = type === "source" ? linkableForSelected[0] : undefined;
    const next = createDefaultBoardCard(type, {
      record,
      colourIndex: boardData.cards.length,
      order: boardData.cards.length,
    });
    updateBoardData({ cards: [...boardData.cards, next] });
    void trackWorkbenchActivity({
      eventType: "board_card_created",
      entityType: "board_card",
      entityId: next.id,
      projectId: projectId,
      metadata: { card_type: type },
    });
    setNoteMode("board");
  }

  const statusLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed — retry"
          : isDirty
            ? "Unsaved"
            : canEditSelected
              ? "Saved"
              : "Read only";

  const isEditorialReading = noteMode === "document" && Boolean(selectedNote);
  const inspectorCitationPreviews = useMemo(
    () =>
      citations.map((citation) => ({
        id: citation.id,
        label: citation.inTextCitation?.trim() || citation.title,
        endnote: citation.endnoteText,
      })),
    [citations],
  );

  useLayoutEffect(() => {
    const page = document.querySelector(".workbench-notes-page-premium");
    page?.classList.toggle("workbench-editorial-reading", isEditorialReading);
    document.body.classList.toggle("workbench-notes-document-mode", isEditorialReading);
    return () => {
      page?.classList.remove("workbench-editorial-reading");
      document.body.classList.remove("workbench-notes-document-mode");
    };
  }, [isEditorialReading]);

  useEffect(() => {
    if (!isEditorialReading || typeof window === "undefined") return;

    const syncStickyOffset = () => {
      const siteNav = document.querySelector<HTMLElement>(".nav");
      const offset = siteNav ? Math.ceil(siteNav.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty("--notes-sticky-offset", `${offset}px`);
    };

    syncStickyOffset();
    window.addEventListener("resize", syncStickyOffset);
    return () => {
      window.removeEventListener("resize", syncStickyOffset);
      document.documentElement.style.removeProperty("--notes-sticky-offset");
    };
  }, [isEditorialReading]);

  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(`workbench-note-document-zoom-${selectedId}`);
    const parsed = stored ? Number(stored) : 100;
    const profile = getDocumentViewportProfile();
    setDocumentZoom(
      clampDocumentZoom(Number.isFinite(parsed) ? parsed : 100, profile),
    );
  }, [selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncZoomForViewport = () => {
      setDocumentZoom((current) => clampDocumentZoom(current, getDocumentViewportProfile()));
    };
    syncZoomForViewport();
    window.addEventListener("resize", syncZoomForViewport);
    return () => window.removeEventListener("resize", syncZoomForViewport);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = isEditorialReading && documentDrawerOpen;
    document.body.classList.toggle("workbench-format-drawer-open", active);
    document.body.classList.toggle(
      "workbench-format-drawer-pinned",
      active && documentDrawerPinned,
    );
    return () => {
      document.body.classList.remove("workbench-format-drawer-open");
      document.body.classList.remove("workbench-format-drawer-pinned");
    };
  }, [isEditorialReading, documentDrawerOpen, documentDrawerPinned]);

  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    window.localStorage.setItem(
      `workbench-note-document-zoom-${selectedId}`,
      String(documentZoom),
    );
  }, [selectedId, documentZoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => document.body.classList.toggle("workbench-notes-mobile", mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.body.classList.remove("workbench-notes-mobile");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1100px)");
    const syncInspector = () => {
      if (mq.matches) setInspectorOpen(false);
    };
    syncInspector();
    mq.addEventListener("change", syncInspector);
    return () => mq.removeEventListener("change", syncInspector);
  }, []);

  const noteMenuItems = useMemo<NoteMenu[]>(
    () => [
      {
        id: "file",
        label: "File",
        sections: [
          {
            items: [
              { id: "file-new", label: "New note", onClick: () => handleNewNote("blank"), disabled: isPending },
              {
                id: "file-save",
                label: "Save",
                hint: "⌘S",
                onClick: handleManualSave,
                disabled: !canEditSelected || isPending || saveState === "saving" || !isDirty,
              },
            ],
          },
          {
            label: "Save as / Export as",
            items: [
              { id: "file-export-pdf", label: "Export PDF", onClick: () => exportCurrentNote("pdf"), disabled: !selectedNote },
              { id: "file-export-docx", label: "Export Word (.docx)", onClick: () => exportCurrentNote("docx"), disabled: !selectedNote },
              { id: "file-export-md", label: "Export Markdown", onClick: () => exportCurrentNote("md"), disabled: !selectedNote },
              { id: "file-export-html", label: "Export HTML", onClick: () => exportCurrentNote("html"), disabled: !selectedNote },
              { id: "file-export-txt", label: "Export plain text", onClick: () => exportCurrentNote("txt"), disabled: !selectedNote },
              { id: "file-export-jpeg", label: "Export JPEG", onClick: () => exportCurrentNote("jpeg"), disabled: !selectedNote },
              { id: "file-export-doc", label: "Export Word (legacy .doc)", onClick: () => exportCurrentNote("doc"), disabled: !selectedNote },
              { id: "file-print", label: "Print", onClick: handlePrintNote, disabled: !selectedNote },
            ],
          },
          {
            items: [
              {
                id: "file-delete",
                label: "Delete note",
                onClick: handleDeleteNote,
                disabled: !selectedNote || !canEditSelected || isPending,
                destructive: true,
              },
            ],
          },
        ],
      },
      {
        id: "edit",
        label: "Edit",
        sections: [
          {
            items: [
              {
                id: "edit-undo",
                label: "Undo",
                onClick: () => runEditorCommand((editor) => editorChain(editor).undo().run()),
                disabled:
                  !editorInstance ||
                  editorInstance.isDestroyed ||
                  !editorInstance.can().undo(),
              },
              {
                id: "edit-redo",
                label: "Redo",
                onClick: () => runEditorCommand((editor) => editorChain(editor).redo().run()),
                disabled:
                  !editorInstance ||
                  editorInstance.isDestroyed ||
                  !editorInstance.can().redo(),
              },
              { id: "edit-copy", label: copied ? "Copied" : "Copy note", onClick: () => void handleCopyNote(), disabled: !selectedNote },
              {
                id: "edit-select-all",
                label: "Select all",
                onClick: () => runEditorCommand((editor) => editorChain(editor).selectAll().run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "edit-clear-formatting",
                label: "Clear formatting",
                onClick: () =>
                  runEditorCommand((editor) =>
                    editorChain(editor).unsetAllMarks().clearNodes().run(),
                  ),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "edit-discard",
                label: "Discard changes",
                onClick: handleDiscard,
                disabled: !isDirty || isPending,
              },
            ],
          },
        ],
      },
      {
        id: "view",
        label: "View",
        sections: [
          {
            items: [
              {
                id: "view-document-mode",
                label: noteMode === "document" ? "Document mode ✓" : "Document mode",
                onClick: () => handleNoteModeChange("document"),
              },
              {
                id: "view-canvas-mode",
                label: noteMode === "canvas" ? "Canvas mode ✓" : "Canvas mode",
                onClick: () => handleNoteModeChange("canvas"),
              },
              {
                id: "view-board-mode",
                label: noteMode === "board" ? "Board mode ✓" : "Board mode",
                onClick: () => handleNoteModeChange("board"),
              },
              {
                id: "view-focus",
                label: isFocusMode ? "Exit fullscreen" : "Fullscreen",
                hint: "⌘\\",
                onClick: toggleFocusMode,
                disabled: !selectedId,
              },
              {
                id: "view-details",
                label: detailsOpen ? "Hide details & links" : "Details & links",
                onClick: () => {
                  if (noteMode === "document") {
                    setDocumentDrawerOpen(true);
                    setDocumentDrawerTab("document");
                  }
                  setDetailsOpen((v) => !v);
                },
                disabled: !selectedNote,
              },
              {
                id: "view-outline",
                label: "Document outline",
                onClick: () => {
                  if (noteMode === "document") {
                    setInspectorOpen(true);
                    return;
                  }
                  setDetailsOpen(true);
                },
                disabled: !selectedNote,
              },
              {
                id: "view-linked-records",
                label: "Linked archive records",
                onClick: () => {
                  if (noteMode === "document") {
                    setDocumentDrawerOpen(true);
                    setDocumentDrawerTab("document");
                    setDetailsOpen(true);
                    return;
                  }
                  setDetailsOpen(true);
                },
                disabled: !selectedNote,
              },
              {
                id: "view-word-count",
                label: `Word count: ${wordCount}`,
                disabled: true,
              },
              {
                id: "view-shortcuts",
                label: "Keyboard shortcuts",
                onClick: () => setCommandOpen(true),
              },
            ],
          },
        ],
      },
      {
        id: "insert",
        label: "Insert",
        sections: [
          {
            items: [
              {
                id: "insert-citation",
                label: "Citation",
                onClick: () => {
                  setNoteMode("document");
                  setCitationPickerOpen(true);
                },
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-endnotes",
                label: "Endnotes section",
                onClick: handleRefreshEndnotesSection,
                disabled: !editorInstance || !canEditSelected || !citations.length,
              },
              {
                id: "insert-text-block",
                label: "Text block",
                onClick: () => addCanvasBlockFromMenu("text"),
                disabled: !canEditSelected,
              },
              {
                id: "insert-sticky-note",
                label: "Sticky note",
                onClick: () => addCanvasBlockFromMenu("sticky"),
                disabled: !canEditSelected,
              },
              {
                id: "insert-board-note",
                label: "Board note",
                onClick: () => addBoardCardFromMenu("note"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-board-image",
                label: "Board image",
                onClick: () => addBoardCardFromMenu("image"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-board-quote",
                label: "Board quote",
                onClick: () => addBoardCardFromMenu("quote"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-board-source",
                label: "Board source",
                onClick: () => addBoardCardFromMenu("source"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-board-question",
                label: "Board question",
                onClick: () => addBoardCardFromMenu("question"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-board-task",
                label: "Board task",
                onClick: () => addBoardCardFromMenu("task"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-board-link",
                label: "Board link",
                onClick: () => addBoardCardFromMenu("link"),
                disabled: !canEditSelected || noteMode !== "board",
              },
              {
                id: "insert-page-break",
                label: "Page break",
                onClick: handleInsertDocumentPageBreak,
                disabled: !canEditSelected,
              },
              {
                id: "insert-archive-record",
                label: "Archive record",
                onClick: () => setDetailsOpen(true),
                disabled: !selectedNote,
              },
              {
                id: "insert-link",
                label: "Link",
                onClick: handleInsertLink,
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-link-record",
                label: "Link archive record",
                onClick: () => setDetailsOpen(true),
                disabled: !selectedNote,
              },
              {
                id: "insert-image",
                label: "Image",
                onClick: handleInsertImageUrl,
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-table",
                label: "Table",
                onClick: () =>
                  runEditorCommand((editor) =>
                    editorChain(editor).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                  ),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-divider",
                label: "Divider",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).insertContent('<hr />').run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-quote",
                label: "Quote",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleBlockquote().run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-bullet-list",
                label: "Bullet list",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleBulletList().run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-numbered-list",
                label: "Numbered list",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleOrderedList().run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-task-list",
                label: "Task list",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleTaskList().run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-heading-1",
                label: "Heading 1",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleHeading({ level: 1 }).run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-heading-2",
                label: "Heading 2",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleHeading({ level: 2 }).run()),
                disabled: !editorInstance || !canEditSelected,
              },
              {
                id: "insert-heading-3",
                label: "Heading 3",
                onClick: () =>
                  runEditorCommand((editor) => editorChain(editor).toggleHeading({ level: 3 }).run()),
                disabled: !editorInstance || !canEditSelected,
              },
            ],
          },
        ],
      },
      {
        id: "help",
        label: "Help",
        sections: [
          {
            items: [
              {
                id: "help-shortcuts",
                label: "Keyboard shortcuts",
                onClick: () => setCommandOpen(true),
              },
              {
                id: "help-about-notes",
                label: "About notes",
                disabled: true,
                hint: "Autosaved rich research notes",
              },
              {
                id: "help-export-formats",
                label: "Export formats",
                disabled: true,
                hint: "DOC, PDF, TXT, MD, HTML, JSON",
              },
            ],
          },
        ],
      },
    ],
    [
      copied,
      isPending,
      canEditSelected,
      saveState,
      isDirty,
      selectedNote,
      editorInstance,
      isFocusMode,
      noteMode,
      selectedId,
      detailsOpen,
      wordCount,
      canvasData,
      boardData,
      citations,
      linkableForSelected,
    ],
  );

  const documentTaskbarMenus = useMemo(
    () => noteMenuItems.filter((menu) => DOCUMENT_TASKBAR_MENU_IDS.has(menu.id)),
    [noteMenuItems],
  );

  const documentTaskbarInsertMenus = useMemo(() => {
    const insertMenu = noteMenuItems.find((menu) => menu.id === "insert");
    if (!insertMenu) return [];
    return [
      {
        ...insertMenu,
        sections: insertMenu.sections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) =>
              DOCUMENT_TASKBAR_INSERT_ITEM_IDS.has(item.id),
            ),
          }))
          .filter((section) => section.items.length > 0),
      },
    ];
  }, [noteMenuItems]);

  const documentTaskbarMoreItems = useMemo(
    () => [
      {
        id: "more-citation",
        label: "Citation",
        onClick: () => setCitationPickerOpen(true),
        disabled: !editorInstance || !canEditSelected,
      },
      {
        id: "more-page-break",
        label: "Page break",
        onClick: handleInsertDocumentPageBreak,
        disabled: !canEditSelected,
      },
      {
        id: "more-image",
        label: "Image",
        onClick: handleInsertImageUrl,
        disabled: !editorInstance || !canEditSelected,
      },
      {
        id: "more-table",
        label: "Table",
        onClick: () =>
          runEditorCommand((editor) =>
            editorChain(editor).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          ),
        disabled: !editorInstance || !canEditSelected,
      },
      {
        id: "more-link",
        label: "Link",
        onClick: handleInsertLink,
        disabled: !editorInstance || !canEditSelected,
      },
    ],
    [
      editorInstance,
      canEditSelected,
      handleInsertDocumentPageBreak,
      handleInsertImageUrl,
      handleInsertLink,
      runEditorCommand,
    ],
  );

  const documentTaskbarCollaboration = useMemo(() => {
    if (!selectedNote || !isEditorialReading) return null;
    return (
      <WorkbenchCollaborationBar
        peers={collaborationEnabled ? collaboration.peers : []}
        activities={collaborationEnabled ? collaboration.activities : []}
        remoteChangesPending={
          collaborationEnabled ? collaboration.remoteChangesPending : false
        }
        onApplyRemoteChanges={() => void collaboration.applyRemoteNote()}
        onDismissRemoteChanges={collaboration.dismissRemoteChanges}
        projectId={resolvedShareProjectId}
        noteId={selectedId}
        canEdit={canEditSelected}
        canRestoreVersions={canEditSelected && collaborationEnabled}
        onVersionRestored={applyRemoteNote}
        comments={collaborationEnabled ? collaboration.comments : []}
        onCommentsChange={() => void collaboration.refreshComments()}
        currentUserId={props.currentUserId}
        peerNamesByUserId={Object.fromEntries(
          collaboration.peers.map((peer) => [peer.userId, peer.displayName]),
        )}
        onShareClick={() => openShareModal()}
        shareOpen={shareModalOpen}
        compact
        documentMoreActions={{
          showSettings: projectPermissions.canRenameProject,
          onOpenSettings: () => setSettingsModalOpen(true),
          onOpenHelp: () => setCommandOpen(true),
          inspectorOpen,
          onToggleInspector: () => setInspectorOpen((open) => !open),
          onModeChange: handleNoteModeChange,
          extraMenuItems: documentTaskbarMoreItems,
        }}
      />
    );
  }, [
    selectedNote,
    isEditorialReading,
    collaborationEnabled,
    collaboration.peers,
    collaboration.activities,
    collaboration.remoteChangesPending,
    collaboration.comments,
    collaboration.applyRemoteNote,
    collaboration.dismissRemoteChanges,
    collaboration.refreshComments,
    resolvedShareProjectId,
    selectedId,
    canEditSelected,
    applyRemoteNote,
    props.currentUserId,
    openShareModal,
    shareModalOpen,
    projectPermissions.canRenameProject,
    inspectorOpen,
    handleNoteModeChange,
    documentTaskbarMoreItems,
  ]);

  const toggleDocumentDetails = useCallback(() => {
    setDetailsOpen((open) => {
      const next = !open;
      if (next) {
        setDocumentDrawerOpen(true);
        setDocumentDrawerTab("document");
      }
      return next;
    });
  }, []);

  const documentDrawerDocumentPanel = useMemo(() => {
    if (!selectedNote) return null;
    return (
      <>
        <DocumentMetadataBar
          layout="sidebar"
          projects={props.projects}
          projectId={projectId}
          noteStatus={noteStatus}
          canEdit={canEditSelected}
          saveLabel={statusLabel}
          lastEditedLabel={formatNoteUpdated(selectedNote.updated_at)}
          detailsOpen={detailsOpen}
          onProjectChange={handleProjectChange}
          onStatusChange={handleStatusChange}
          onToggleDetails={toggleDocumentDetails}
        />
        <WorkbenchDocumentDetailsSections
          open={detailsOpen}
          headings={documentHeadings}
          onSelectHeading={scrollToHeading}
          noteId={selectedId}
          canEdit={canEditSelected}
          linkedRecords={linkedRecordsForSelected}
          linkableRecords={linkableForSelected}
          onLinksChange={(recordIds) => handleLinksChange(selectedId, recordIds)}
          onInsertBlock={handleInsertLinkedRecordBlock}
          onError={setSaveError}
        />
      </>
    );
  }, [
    selectedNote,
    props.projects,
    projectId,
    noteStatus,
    canEditSelected,
    statusLabel,
    detailsOpen,
    toggleDocumentDetails,
    documentHeadings,
    scrollToHeading,
    selectedId,
    linkedRecordsForSelected,
    linkableForSelected,
    handleProjectChange,
    handleStatusChange,
    handleLinksChange,
    handleInsertLinkedRecordBlock,
  ]);

  return (
    <div
      data-notes-document={isEditorialReading ? "true" : undefined}
      className={
        [
          "workbench-notes-view",
          "workbench-notes-figma-shell",
          isFocusMode ? "workbench-notes-focus-mode workbench-notes-fullscreen-mode" : "",
          isFocusMode && noteMode === "board" ? "workbench-notes-board-focus" : "",
          noteMode === "document" ? "is-document-mode" : "",
          noteMode === "board" ? "is-board-mode" : "",
          noteMode === "canvas" ? "is-canvas-mode is-canvas-immersive" : "",
          noteMode === "board" && (isFocusMode || isBoardFullscreen) ? "is-board-fullscreen" : "",
          isEditorialReading ? "workbench-editorial-reading" : "",
          isEditorialReading && isFocusMode ? "is-focus-mode" : "",
          isEditorialReading && documentDrawerOpen ? "has-format-drawer-open" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <AICitationFloatingTrigger
        visible={Boolean(isEditorialReading && selectedNote)}
        active={aiAssistantOpen}
        disabled={!canEditSelected}
        formatDrawerOpen={documentDrawerOpen}
        onToggle={handleToggleAICitation}
      />

      {notes.length && !isEditorialReading && noteMode !== "canvas" ? (
        <>
          <button
            type="button"
            className="workbench-floating-notes-menu"
            style={
              {
                "--notes-menu-x": `${notesMenuPosition.x}px`,
                "--notes-menu-y": `${notesMenuPosition.y}px`,
                opacity: notesMenuPositionReady ? 1 : 0,
              } as React.CSSProperties
            }
            onPointerDown={handleNotesMenuPointerDown}
            onPointerMove={handleNotesMenuPointerMove}
            onPointerUp={handleNotesMenuPointerUp}
            onClick={() => {
              if (notesMenuDragRef.current) return;
              setNotesDrawerOpen((open) => !open);
            }}
            aria-expanded={notesDrawerOpen}
            aria-controls="workbench-notes-popover"
            aria-label="Open notes menu"
            title="Drag to move. Click to open notes."
          >
            ☰
          </button>

          {notesDrawerOpen ? (
            <div
              id="workbench-notes-popover"
              className="workbench-notes-popover"
              role="dialog"
              aria-label="Notes menu"
            >
            <div className="workbench-notes-popover__header">
              <strong>Notes</strong>
              <button
                type="button"
                className="workbench-notes-popover__close"
                onClick={() => setNotesDrawerOpen(false)}
                aria-label="Close notes menu"
              >
                ×
              </button>
            </div>
            <div className="workbench-notes-popover__body workbench-notes-list">
              <input
                type="search"
                className="workbench-note-list-search"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search notes"
              />
              <p className="workbench-notes-list-count">
                {filteredNotes.length} of {notes.length} notes
              </p>
              {filteredNotes.length ? (
                <ul className="workbench-notes-list-items">
                  {filteredNotes.map((note) => {
                    const isActive = note.id === selectedId;
                    const canEdit = noteCanEdit(note, props.currentUserId, ownerSet, editorSet);
                    return (
                      <li
                        key={note.id}
                        className={`workbench-note-list-item${isActive ? " is-active" : ""}`}
                      >
                        {isActive ? (
                          <span className="workbench-note-active-strip" aria-hidden="true" />
                        ) : null}
                        <button
                          type="button"
                          className="workbench-note-list-item__main"
                          onClick={() => {
                            selectNote(note);
                            setNotesDrawerOpen(false);
                          }}
                        >
                          <span className="workbench-note-list-item__title">
                            {note.title || "Untitled note"}
                          </span>
                          <span className={`workbench-note-status-chip is-${note.status}`}>
                            {noteStatusLabel(note.status)}
                          </span>
                          <span className="workbench-note-list-item__meta">
                            {note.project_title} · {formatNoteUpdated(note.updated_at)}
                          </span>
                        </button>
                        {canEdit ? (
                          <button
                            type="button"
                            className={`workbench-note-pin-icon${note.pinned ? " is-pinned" : ""}`}
                            aria-label={note.pinned ? "Unpin note" : "Pin note"}
                            onClick={(event) => handleTogglePin(note, event)}
                          >
                            ★
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="workbench-muted workbench-notes-list-empty">No notes match this search.</p>
              )}
            </div>
            </div>
          ) : null}
        </>
      ) : null}

      {!isEditorialReading && noteMode !== "canvas" ? (
      <header className="workbench-notes-header workbench-notes-header--fixed workbench-notes-page-header">
        {selectedNote ? (
          <div className="workbench-notes-header-menu-row">
            <WorkbenchNoteMenuBar menus={noteMenuItems} />
          </div>
        ) : null}
        <div className="workbench-notes-page-header__top">
          <div className="workbench-notes-heading-block">
            <p className="workbench-notes-eyebrow">NOTES</p>
            <h1>Research notes</h1>
            <p>
              Write, organise, cite, and refine project notes alongside archive records,
              bookmarks, reading lists, tasks, and review decisions.
            </p>
          </div>
          <div className="workbench-notes-header-actions">
            <div className="workbench-note-mode-switcher workbench-note-mode-switcher--with-new" role="group" aria-label="Note actions and mode">
              <button
                type="button"
                className="workbench-button workbench-button-primary workbench-notes-new-button"
                onClick={() => handleNewNote("blank")}
                disabled={isPending}
              >
                New note
              </button>
              {selectedNote
                ? NOTE_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="tab"
                      className={`workbench-note-mode-button${noteMode === mode.id ? " is-active" : ""}`}
                      aria-selected={noteMode === mode.id}
                      onClick={() => handleNoteModeChange(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))
                : null}
            </div>
          </div>
        </div>

      {selectedNote ? (
        <div className="workbench-notes-header-meta-row" aria-label="Note metadata">
          {canEditSelected ? (
            <>
              <label className="workbench-note-meta-field">
                <span className="workbench-note-meta-label">Project</span>
                <select
                  value={projectId ?? ""}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  aria-label="Project"
                >
                  <option value="">Personal</option>
                  {props.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="workbench-note-meta-field">
                <span className="workbench-note-meta-label">Status</span>
                <select
                  value={noteStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  aria-label="Status"
                >
                  {WORKBENCH_NOTE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {noteStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <span className="workbench-note-meta-muted">
                {selectedNote.project_title ?? "Personal"}
              </span>
              <span className={`workbench-note-status-chip is-${noteStatus}`}>
                {noteStatusLabel(noteStatus)}
              </span>
            </>
          )}
          {shareProjectHeaderExtra ? (
            <div className="workbench-notes-header-share">{shareProjectHeaderExtra}</div>
          ) : null}
          <button
            type="button"
            className="workbench-note-details-toggle"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? "Hide details & links" : "Details & links"}
          </button>
          <span
            className={`workbench-editor-status workbench-editor-status--${saveState}`}
            aria-live="polite"
          >
            {statusLabel}
          </span>
        </div>
      ) : null}

      </header>
      ) : null}

      {saveError ? (
        <p className="workbench-flag" role="alert">
          {saveError}
        </p>
      ) : null}
      {imageError ? (
        <p className="workbench-flag" role="alert">
          {imageError}
        </p>
      ) : null}

      {saveConflict ? (
        <p className="workbench-flag workbench-save-conflict" role="alert">
          {saveConflict}{" "}
          <button type="button" className="workbench-button" onClick={() => void collaboration.applyRemoteNote()}>
            Reload
          </button>
        </p>
      ) : null}

      {selectedNote &&
      resolvedShareProjectId &&
      selectedProjectAccessRole !== "owner" &&
      selectedProjectAccessRole !== "none" &&
      isNoteContentEmpty(plainText) &&
      wordCount < 2 ? (
        <WorkbenchSharedProjectWelcome
          role={selectedProjectAccessRole}
          projectTitle={selectedProjectMeta?.title ?? "Project"}
          noteModes={NOTE_MODES}
          activeMode={noteMode}
          onModeChange={handleNoteModeChange}
        />
      ) : null}

      {selectedNote && !isEditorialReading ? (
        <WorkbenchCollaborationBar
          peers={collaborationEnabled ? collaboration.peers : []}
          activities={collaborationEnabled ? collaboration.activities : []}
          remoteChangesPending={collaborationEnabled ? collaboration.remoteChangesPending : false}
          onApplyRemoteChanges={() => void collaboration.applyRemoteNote()}
          onDismissRemoteChanges={collaboration.dismissRemoteChanges}
          projectId={resolvedShareProjectId}
          noteId={selectedId}
          canEdit={canEditSelected}
          canRestoreVersions={canEditSelected && collaborationEnabled}
          onVersionRestored={applyRemoteNote}
          comments={collaborationEnabled ? collaboration.comments : []}
          onCommentsChange={() => void collaboration.refreshComments()}
          currentUserId={props.currentUserId}
          peerNamesByUserId={Object.fromEntries(
            collaboration.peers.map((peer) => [peer.userId, peer.displayName]),
          )}
          onShareClick={() => openShareModal()}
          shareOpen={shareModalOpen}
        />
      ) : null}

      {notes.length ? (
        <>
          <div
            ref={notesLayoutRef}
            className={[
              "workbench-notes-layout-premium",
              "workbench-notes-layout",
              "workbench-notes-layout--editor-only",
              noteMode === "canvas" ? "is-canvas-layout" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
          <section
            className={[
              "workbench-note-editor-shell",
              noteMode === "board" ? "is-board-editor-active" : "",
              noteMode === "canvas" ? "is-canvas-editor-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Note editor"
          >
            {selectedNote ? (
              noteMode === "canvas" ? (
                <>
                  <WorkbenchCanvasImmersiveView
                    key={activeCanvas.id}
                    canvasInstanceId={activeCanvas.id}
                    initialViewport={activeCanvas.viewport}
                    initialSettings={activeCanvas.settings}
                    onViewportChange={(viewport: CanvasViewport) =>
                      mutateWorkbenchCanvas((state) =>
                        updateActiveCanvasViewport(state, viewport),
                      )
                    }
                    onSettingsChange={(patch: Partial<CanvasSettings>) =>
                      mutateWorkbenchCanvas((state) =>
                        updateActiveCanvasSettings(state, patch),
                      )
                    }
                    shell={{
                      projectTitle: title,
                      onProjectTitleChange: handleTitleChange,
                      canEditTitle: canEditSelected,
                      canvasSwitcher: (
                        <WorkbenchCanvasManager
                          state={canvasState}
                          canEdit={canEditSelected}
                          onStateChange={(next) => persistWorkbenchCanvasState(next)}
                        />
                      ),
                      modes: NOTE_MODES,
                      activeMode: noteMode,
                      onModeChange: handleNoteModeChange,
                      statusLabel,
                      saveState,
                      onSave: handleManualSave,
                      isDirty,
                      isPending,
                      saveDisabled: !canEditSelected,
                      headerExtra: shareProjectHeaderExtra,
                    }}
                    data={canvasData}
                    linkableRecords={linkableForSelected}
                    citationSources={props.citationSources}
                    canEdit={canEditSelected}
                    onChange={updateCanvasData}
                    onPersistNow={flushSaveNow}
                    collaborationNoteId={selectedId}
                    collaborationUserId={props.currentUserId}
                    collaborationLocks={collaboration.canvasLocks}
                    onCollaborationInteractionChange={setCanvasInteracting}
                    onSendToDocument={sendHtmlToDocument}
                    onOpenRecord={openBoardRecord}
                    onCiteRecord={handleCiteInspectorRecord}
                  />
                  <div className="workbench-canvas-immersive-placeholder" aria-hidden />
                </>
              ) : isEditorialReading ? (
                <div className="workbench-editorial-workspace workbench-pages-layout">
                  <div
                    className={`workbench-pages-shell${
                      documentDrawerOpen ? " has-drawer-open" : ""
                    }${documentDrawerOpen && documentDrawerPinned ? " has-drawer-pinned" : ""}`}
                  >
                    <div className="workbench-pages-main">
                      {editorInstance && !editorInstance.isDestroyed ? (
                        <WorkbenchDocumentTopBar
                          collaborationControls={documentTaskbarCollaboration}
                          menuBar={
                            <WorkbenchNoteMenuBar
                              menus={documentTaskbarMenus}
                              className="workbench-note-menu-bar--topbar"
                              iconOnly
                            />
                          }
                          insertMenu={
                            <WorkbenchNoteMenuBar
                              menus={documentTaskbarInsertMenus}
                              className="workbench-note-menu-bar--topbar"
                              iconOnly
                            />
                          }
                          typographyControls={
                            <WorkbenchDocumentTypographyControls
                              editor={editorInstance}
                              documentFontFamilyId={documentSettings.fontFamilyId}
                              onDocumentFontFamilyChange={handleDocumentFontChange}
                              disabled={!canEditSelected}
                            />
                          }
                          workspaceBadge={
                            projectAccessBadge ? (
                              <span
                                className={`workbench-project-access-badge ${projectAccessBadge.className}`}
                                aria-label={projectAccessBadge.label}
                              >
                                {projectAccessBadge.label}
                              </span>
                            ) : null
                          }
                          zoom={documentZoom}
                          onZoomChange={setDocumentZoom}
                          noteModes={NOTE_MODES}
                          activeMode={noteMode}
                          onModeChange={handleNoteModeChange}
                          formatPanelOpen={documentDrawerOpen}
                          onToggleFormatPanel={() => {
                            setDocumentDrawerOpen((open) => {
                              const next = !open;
                              if (next) setDocumentDrawerTab("format");
                              return next;
                            });
                          }}
                          quickActions={{
                            onInsertLink: handleInsertLink,
                            onInsertTable: () =>
                              runEditorCommand((editor) =>
                                editorChain(editor)
                                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                                  .run(),
                              ),
                            onInsertImage: handleInsertImageUrl,
                            onOpenSettings: projectPermissions.canRenameProject
                              ? () => setSettingsModalOpen(true)
                              : undefined,
                            insertDisabled: !editorInstance || !canEditSelected,
                            settingsDisabled: !projectPermissions.canRenameProject,
                          }}
                        />
                      ) : null}
                      <div className="workbench-document-pane">
                        <WorkbenchDocumentPageView
                          zoom={documentZoom}
                          wordCount={wordCount}
                          documentFontFamily={selectedDocumentFont.fontFamily}
                          flushToDrawer={documentDrawerOpen}
                          title={
                            <input
                              className="workbench-reading-title"
                              type="text"
                              value={title}
                              onChange={(e) => handleTitleChange(e.target.value)}
                              readOnly={!canEditSelected}
                              aria-label="Note title"
                              placeholder="Untitled Research Note"
                            />
                          }
                          editor={
                            <>
                              <div className="workbench-rich-editor-shell">
                                <WorkbenchRichTextEditor
                                  key={`${selectedId}-${editorRevision}`}
                                  noteId={selectedId}
                                  contentHtml={contentHtml}
                                  editable={canEditSelected}
                                  hideToolbar
                                  onChange={handleEditorChange}
                                  onImageError={setImageError}
                                  insertHtml={insertHtml}
                                  onInsertHtmlApplied={() => setInsertHtml(null)}
                                  onEditorReady={setEditorInstance}
                                  onOpenCitation={() => setCitationPickerOpen(true)}
                                  onOpenAICitation={handleOpenAICitation}
                                />
                              </div>
                              <WorkbenchGeneratedReferences
                                key={citationRevision}
                                editorHtml={contentHtml}
                                citations={citations}
                                linkedRecordsForSelected={linkedRecordsForSelected}
                                citationSources={props.citationSources}
                                revision={citationRevision}
                              />
                            </>
                          }
                        />
                      </div>
                    </div>
                  </div>
                  {documentDrawerOpen && editorInstance && !editorInstance.isDestroyed ? (
                    <WorkbenchDocumentDrawer
                      open
                      pinned={documentDrawerPinned}
                      tab={documentDrawerTab}
                      onTabChange={setDocumentDrawerTab}
                      onTogglePin={() => setDocumentDrawerPinned((pinned) => !pinned)}
                      onClose={() => setDocumentDrawerOpen(false)}
                      formatPanel={
                        <WorkbenchDocumentFormatPanel
                          editor={editorInstance}
                          documentFontFamilyId={documentSettings.fontFamilyId}
                          onDocumentFontFamilyChange={handleDocumentFontChange}
                          onResetTypography={handleResetDocumentTypography}
                          onOpenCitation={handleOpenCitation}
                          onInsertPageBreak={handleInsertDocumentPageBreak}
                        />
                      }
                      documentPanel={documentDrawerDocumentPanel}
                    />
                  ) : null}
                  <input
                    ref={documentImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    className="workbench-editor-image-input"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || !editorInstance || editorInstance.isDestroyed) return;
                      void (async () => {
                        const form = new FormData();
                        form.append("file", file);
                        form.append("noteId", selectedId || "temp");
                        const res = await fetch("/api/workbench/notes/upload-image", {
                          method: "POST",
                          body: form,
                        });
                        const data = (await res.json()) as {
                          url?: string;
                          error?: string;
                          details?: string;
                        };
                        if (!res.ok || !data.url) {
                          setImageError(data.error || data.details || "Could not upload image.");
                          return;
                        }
                        editorChain(editorInstance).setImage({ src: data.url }).run();
                      })();
                    }}
                  />
                  {inspectorOpen ? (
                    <div
                      className={
                        isEditorialReading
                          ? "workbench-document-inspector-dock"
                          : "workbench-floating-inspector-panel"
                      }
                      role="dialog"
                      aria-label="Research Inspector"
                      style={
                        isEditorialReading
                          ? undefined
                          : ({
                              "--inspector-x": `${inspectorPosition.x}px`,
                              "--inspector-y": `${inspectorPosition.y}px`,
                              opacity: inspectorPositionReady ? 1 : 0,
                            } as React.CSSProperties)
                      }
                    >
                      <div
                        className="workbench-floating-inspector-panel__handle"
                        onPointerDown={
                          isEditorialReading ? undefined : handleInspectorPointerDown
                        }
                      >
                        <span>Research Inspector</span>
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setInspectorOpen(false);
                          }}
                          aria-label="Close Research Inspector"
                        >
                          Close
                        </button>
                      </div>
                      <ResearchInspector
                        headings={documentHeadings}
                        onSelectHeading={scrollToHeading}
                        linkedRecords={linkedRecordsForSelected}
                        linkableRecords={linkableForSelected}
                        citations={inspectorCitationPreviews}
                        onOpenCitation={handleOpenCitation}
                        onCiteRecord={handleCiteInspectorRecord}
                        onOpenRecord={openBoardRecord}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
              <>
                <div className="workbench-note-editor-header workbench-note-editor-topbar workbench-note-title-row">
                  <div className="workbench-note-title-area">
                    <input
                      className="workbench-note-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      readOnly={!canEditSelected}
                      aria-label="Note title"
                      placeholder="Untitled note"
                    />
                  </div>
                  <div className="workbench-note-primary-actions">
                    <span
                      className={`workbench-editor-status workbench-editor-status--${saveState}`}
                      aria-live="polite"
                    >
                      {statusLabel}
                    </span>
                    {canEditSelected ? (
                      <button
                        type="button"
                        className={`workbench-button workbench-button-primary workbench-note-save-button${
                          isDirty ? " is-lemon" : " is-quiet"
                        }`}
                        onClick={handleManualSave}
                        disabled={isPending || saveState === "saving" || !isDirty}
                      >
                        Save
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="workbench-button workbench-button-secondary workbench-focus-toggle"
                      onClick={toggleFocusMode}
                      disabled={!selectedId}
                      aria-pressed={isFocusMode}
                      title="Toggle fullscreen (⌘\\)"
                    >
                      {isFocusMode ? "Exit fullscreen" : "Fullscreen"}
                    </button>
                  </div>
                </div>

                {detailsOpen && !isFocusMode ? (
                  <aside className="workbench-note-details-panel" aria-label="Note details">
                    <div className="workbench-note-details-panel__section">
                      <h3>Outline</h3>
                      <WorkbenchNotesDocumentOutline
                        headings={documentHeadings}
                        onSelect={scrollToHeading}
                      />
                    </div>
                    <div className="workbench-note-details-panel__section">
                      <h3>Archive links</h3>
                      <WorkbenchNotesLinkedRecords
                        noteId={selectedId}
                        canEdit={canEditSelected}
                        linkedRecords={linkedRecordsForSelected}
                        linkableRecords={linkableForSelected}
                        onLinksChange={(recordIds) => handleLinksChange(selectedId, recordIds)}
                        onInsertBlock={handleInsertLinkedRecordBlock}
                        onError={setSaveError}
                      />
                    </div>
                    <div className="workbench-note-details-panel__section workbench-notes-details-panel__meta">
                      <p>
                        <strong>Status</strong> {noteStatusLabel(noteStatus)}
                      </p>
                      <p>
                        <strong>Project</strong> {selectedNote.project_title}
                      </p>
                    </div>
                  </aside>
                ) : null}

                {noteMode === "document" ? (
                  <>
                    <div className="workbench-rich-editor-shell">
                      <WorkbenchRichTextEditor
                        key={`${selectedId}-${editorRevision}`}
                        noteId={selectedId}
                        contentHtml={contentHtml}
                        editable={canEditSelected}
                        compactToolbar
                        onChange={handleEditorChange}
                        onImageError={setImageError}
                        insertHtml={insertHtml}
                        onInsertHtmlApplied={() => setInsertHtml(null)}
                        onEditorReady={setEditorInstance}
                        onOpenCitation={() => {
                          setNoteMode("document");
                          setCitationPickerOpen(true);
                        }}
                        onOpenAICitation={handleOpenAICitation}
                      />
                    </div>
                    <WorkbenchGeneratedReferences
                      key={citationRevision}
                      editorHtml={contentHtml}
                      citations={citations}
                      linkedRecordsForSelected={linkedRecordsForSelected}
                      citationSources={props.citationSources}
                      revision={citationRevision}
                    />
                  </>
                ) : (
                  <WorkbenchNoteBoard
                    data={boardData}
                    linkableRecords={linkableForSelected}
                    archiveSources={props.citationSources}
                    noteId={selectedId}
                    canEdit={canEditSelected}
                    onChange={updateBoardData}
                    onSendToDocument={sendHtmlToDocument}
                    onSendToCanvas={sendBoardCardToCanvas}
                    onCiteCard={handleCiteBoardCard}
                    onOpenRecord={openBoardRecord}
                    onFullscreenChange={setIsBoardFullscreen}
                  />
                )}

                <footer className="workbench-note-footer">
                  Words {wordCount} · Characters {characterCount} · {readMinutes} min read
                  <span> · Updated {formatNoteUpdated(selectedNote.updated_at)}</span>
                </footer>
              </>
            )
          ) : (
              <p className="workbench-muted">Select a note to edit.</p>
            )}
          </section>
        </div>
        </>
      ) : (
        <div className="workbench-empty-state workbench-board-empty" role="status">
          <strong>No notes yet</strong>
          <p className="workbench-muted">Create your first research note to get started.</p>
          <button
            type="button"
            className="workbench-button workbench-button-primary"
            onClick={() => handleNewNote("blank")}
            disabled={isPending}
          >
            New note
          </button>
        </div>
      )}

      <WorkbenchNotesCommandPalette
        open={commandOpen}
        commands={commandItems}
        onClose={() => setCommandOpen(false)}
      />
      <AICitationAssistant
        open={aiAssistantOpen}
        onClose={() => setAIAssistantOpen(false)}
        candidates={citationCandidates}
        noteId={selectedId}
        noteContentHtml={contentHtml}
        canEdit={canEditSelected}
        formatDrawerOpen={documentDrawerOpen}
        onSelectCandidate={handleSelectAICandidate}
        onInsertScholarlyResult={handleInsertScholarlyResult}
        onRecommendedCandidateIdsChange={setAiRecommendedCandidateIds}
      />
      <WorkbenchCitationPicker
        open={citationPickerOpen}
        candidates={citationCandidates}
        citations={citations}
        initialCandidateId={citationPreselectId}
        recommendedCandidateIds={aiRecommendedCandidateIds}
        onClose={() => {
          setCitationPickerOpen(false);
          setCitationPreselectId(null);
          setCitationAnchorRect(null);
        }}
        onInsert={handleInsertCitation}
      />
      {editingCitation
        ? (() => {
            const target = citations.find((c) => c.id === editingCitation.citationId);
            if (!target) return null;
            return (
              <WorkbenchCitationEditPopover
                citation={target}
                rect={editingCitation.rect}
                canEdit={canEditSelected}
                onSave={(patch) => saveCitationEdits(target.id, patch)}
                onCancel={closeCitationEditor}
                onJump={() => {
                  jumpToReference(citationReferenceId(target));
                  closeCitationEditor();
                }}
                onOpenSource={() => {
                  if (target.sourceUrl) window.open(target.sourceUrl, "_blank", "noopener,noreferrer");
                }}
                onRemove={() => removeCitation(target.id)}
              />
            );
          })()
        : null}
      <WorkbenchNotesQuickSwitcher
        open={switcherOpen}
        notes={notes}
        activeId={selectedId}
        onSelect={selectNote}
        onClose={() => setSwitcherOpen(false)}
      />
      <WorkbenchShareProjectModal
        open={shareModalOpen}
        projectId={resolvedShareProjectId}
        projectTitle={
          selectedProjectMeta?.title ??
          props.projects.find((p) => p.id === resolvedShareProjectId)?.title ??
          (resolvedShareProjectId ? "Project" : "Personal workbench")
        }
        ownerId={
          selectedProjectMeta?.ownerId ??
          props.projects.find((p) => p.id === resolvedShareProjectId)?.owner_id ??
          null
        }
        currentUserId={props.currentUserId}
        accessRole={selectedProjectAccessRole}
        noteTitle={title}
        canExportNote={Boolean(selectedNote)}
        onExportNote={(format) => exportCurrentNote(format)}
        onOpenSettings={() => {
          setShareModalOpen(false);
          setSettingsModalOpen(true);
        }}
        onClose={() => setShareModalOpen(false)}
      />
      <WorkbenchProjectSettingsModal
        open={settingsModalOpen}
        project={
          resolvedShareProjectId
            ? props.projects.find((p) => p.id === resolvedShareProjectId) ?? null
            : null
        }
        accessRole={selectedProjectAccessRole}
        onOpenShare={() => {
          setSettingsModalOpen(false);
          setShareModalOpen(true);
        }}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}
