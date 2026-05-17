import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import type {
  BoardCardColour,
  BoardCardType,
  BoardSourceOrigin,
  WorkbenchBoardCard,
} from "./workbench-board-types";

const BOARD_COLOURS: BoardCardColour[] = ["lemon", "pink", "blue", "green", "lavender", "cream", "white"];
const BOARD_CARD_WIDTH = 320;

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fallbackBoardPosition(index: number) {
  return {
    x: 80 + (index % 5) * 360,
    y: 220 + Math.floor(index / 5) * 280,
  };
}

export function normalizeCardType(raw: string): BoardCardType {
  if (raw === "image" || raw === "imagePlaceholder") return "image";
  if (raw === "quote" || raw === "source" || raw === "question" || raw === "task" || raw === "link") {
    return raw;
  }
  return "note";
}

export function createDefaultBoardCard(
  type: BoardCardType,
  options?: {
    record?: WorkbenchLinkableRecord;
    colourIndex?: number;
    order?: number;
    sourceOrigin?: BoardSourceOrigin | null;
    metaLine?: string | null;
  },
): WorkbenchBoardCard {
  const normalized = normalizeCardType(type);
  const record = options?.record;
  const colour = BOARD_COLOURS[(options?.colourIndex ?? 0) % BOARD_COLOURS.length];
  const now = new Date().toISOString();

  const defaults: Record<BoardCardType, { title: string; body: string }> = {
    note: { title: "Research note", body: "Capture a thought, finding, or reflection." },
    image: { title: "Image card", body: "Add a caption for this image." },
    quote: { title: "Quote", body: "Paste a quote or excerpt here." },
    source: { title: record?.title ?? "Source card", body: "Why this source matters for your research." },
    question: { title: "Open question", body: "What do you still need to find out?" },
    task: { title: "Research task", body: "Follow up on this item." },
    link: { title: "Useful link", body: "Notes about this link." },
    imagePlaceholder: { title: "Image card", body: "Add a caption for this image." },
  };

  const base = defaults[normalized] ?? defaults.note;

  return {
    id: createId("board"),
    type: normalized,
    title: base.title,
    body: base.body,
    order: options?.order,
    ...fallbackBoardPosition(options?.order ?? 0),
    width: BOARD_CARD_WIDTH,
    height: undefined,
    colour,
    imageUrl: normalized === "image" ? "" : undefined,
    imageAlt: normalized === "image" ? "" : undefined,
    linkUrl: normalized === "link" ? "" : undefined,
    linkedRecordId: normalized === "source" ? (record?.record_id ?? null) : null,
    sourceOrigin: options?.sourceOrigin ?? null,
    tag: options?.metaLine ?? undefined,
    taskDone: normalized === "task" ? false : undefined,
    workflowStatus: "collecting",
    status: "draft",
    column: "collecting",
    createdAt: now,
    updatedAt: now,
  };
}

export function cardHtml(card: WorkbenchBoardCard) {
  const title = escapeHtml(card.title || "Untitled");
  const body = escapeHtml(card.body || "");
  const alt = escapeHtml(card.imageAlt || card.title || "Board image");

  switch (normalizeCardType(card.type)) {
    case "quote":
      return `<blockquote><p>${body || title}</p></blockquote><p></p>`;
    case "image": {
      if (card.imageUrl?.trim()) {
        return `<figure><img src="${escapeHtml(card.imageUrl.trim())}" alt="${alt}" class="workbench-note-image" /><figcaption>${title}</figcaption></figure><p>${body}</p><p></p>`;
      }
      return `<p><strong>Image:</strong> ${title}</p><p>${body}</p><p></p>`;
    }
    case "source":
      return `<p><strong>Source:</strong> ${title}</p><p>${body}</p><p></p>`;
    case "question":
      return `<p><strong>Question:</strong> ${title}</p><p>${body}</p><p></p>`;
    case "task":
      return `<p><strong>${card.taskDone ? "☑" : "☐"}</strong> ${title}</p><p>${body}</p><p></p>`;
    case "link": {
      const url = card.linkUrl?.trim();
      if (url) {
        return `<p><a href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank">${title}</a></p><p>${body}</p><p></p>`;
      }
      return `<p><strong>Link:</strong> ${title}</p><p>${body}</p><p></p>`;
    }
    default:
      return `<h3>${title}</h3><p>${body}</p><p></p>`;
  }
}
