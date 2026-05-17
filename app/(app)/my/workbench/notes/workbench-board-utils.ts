import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import type {
  BoardCardType,
  BoardFilterType,
  BoardSmartChip,
  BoardSortMode,
  WorkbenchBoardCard,
} from "./workbench-board-types";

export type {
  BoardCardColour,
  BoardCardType,
  BoardFilterType,
  BoardSmartChip,
  BoardSortMode,
  BoardViewDensity,
  BoardWorkflowStatus,
  WorkbenchBoardCard,
  WorkbenchBoardData,
  WorkbenchBoardSettings,
} from "./workbench-board-types";

export type BoardInsights = {
  total: number;
  notes: number;
  images: number;
  quotes: number;
  sources: number;
  questions: number;
  tasks: number;
  links: number;
};

export type BoardNudge = {
  id: string;
  message: string;
};

export type BoardSmartCounts = Record<BoardSmartChip, number>;

export type BoardResearchBadge =
  | "needs-citation"
  | "missing-alt"
  | "unsorted"
  | "ready-for-writing"
  | "used-in-document"
  | "from-bookmark"
  | "from-reading-list"
  | "has-image";

function normalizeType(raw: string): BoardCardType {
  if (raw === "image" || raw === "imagePlaceholder") return "image";
  if (raw === "quote" || raw === "source" || raw === "question" || raw === "task" || raw === "link") {
    return raw;
  }
  return "note";
}

export function normalizeCardOrder(cards: WorkbenchBoardCard[]): WorkbenchBoardCard[] {
  const sorted = [...cards].sort((a, b) => {
    const ao = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    const at = a.createdAt ?? "";
    const bt = b.createdAt ?? "";
    return bt.localeCompare(at);
  });
  return sorted.map((card, index) => ({
    ...card,
    order: typeof card.order === "number" ? card.order : index,
  }));
}

export function assignCardOrders(cards: WorkbenchBoardCard[]): WorkbenchBoardCard[] {
  return cards.map((card, index) => ({ ...card, order: index }));
}

export function reorderCards(
  cards: WorkbenchBoardCard[],
  dragId: string,
  targetId: string,
): WorkbenchBoardCard[] {
  if (dragId === targetId) return cards;
  const ordered = normalizeCardOrder(cards);
  const from = ordered.findIndex((c) => c.id === dragId);
  const to = ordered.findIndex((c) => c.id === targetId);
  if (from < 0 || to < 0) return cards;
  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return assignCardOrders(next);
}

export function computeSmartTags(card: WorkbenchBoardCard): string[] {
  const type = normalizeType(card.type);
  const tags = new Set<string>([type]);
  if (type === "image" && card.imageUrl?.trim()) tags.add("image");
  if (type === "source") tags.add("source");
  if (type === "quote") tags.add("quote");
  if (type === "question") tags.add("question");
  if (type === "task") tags.add("task");
  if (card.linkedRecordId) tags.add("archive");
  if (card.cited) tags.add("cited");
  if (card.usedInDocument) tags.add("document");
  return [...tags];
}

export function cardMatchesSearch(
  card: WorkbenchBoardCard,
  query: string,
  linkableRecords: WorkbenchLinkableRecord[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const record = card.linkedRecordId
    ? linkableRecords.find((r) => r.record_id === card.linkedRecordId)
    : null;
  const haystack = [
    card.title,
    card.body,
    card.tag,
    card.imageAlt,
    card.linkUrl,
    record?.title,
    record?.source_type,
    ...(computeSmartTags(card)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function cardMatchesFilter(card: WorkbenchBoardCard, filter: BoardFilterType): boolean {
  if (filter === "all") return true;
  return normalizeType(card.type) === filter;
}

export function cardMatchesSmartChip(card: WorkbenchBoardCard, chip: BoardSmartChip | null): boolean {
  if (!chip) return true;
  const type = normalizeType(card.type);
  switch (chip) {
    case "needs-citation":
      return type === "source" && !card.cited;
    case "has-image":
      return type === "image" && Boolean(card.imageUrl?.trim());
    case "unsorted":
      return (card.workflowStatus ?? card.column ?? "collecting") === "collecting";
    case "questions":
      return type === "question";
    case "ready-for-writing":
      return card.workflowStatus === "ready" || card.column === "ready";
    case "missing-alt":
      return type === "image" && Boolean(card.imageUrl?.trim()) && !card.imageAlt?.trim();
    default:
      return true;
  }
}

export function sortBoardCards(
  cards: WorkbenchBoardCard[],
  sort: BoardSortMode,
  linkableRecords: WorkbenchLinkableRecord[],
): WorkbenchBoardCard[] {
  const list = [...cards];
  if (sort === "manual") {
    return normalizeCardOrder(list);
  }

  const byTime = (a: string | undefined, b: string | undefined) => (a ?? "").localeCompare(b ?? "");

  switch (sort) {
    case "newest":
      return list.sort((a, b) => byTime(b.createdAt, a.createdAt));
    case "oldest":
      return list.sort((a, b) => byTime(a.createdAt, b.createdAt));
    case "recently-edited":
      return list.sort((a, b) => byTime(b.updatedAt, a.updatedAt));
    case "type":
      return list.sort(
        (a, b) =>
          normalizeType(a.type).localeCompare(normalizeType(b.type)) ||
          (a.title || "").localeCompare(b.title || ""),
      );
    case "colour":
      return list.sort(
        (a, b) =>
          (a.colour ?? "white").localeCompare(b.colour ?? "white") ||
          (a.title || "").localeCompare(b.title || ""),
      );
    case "source":
      return list.sort((a, b) => {
        const at = a.linkedRecordId
          ? linkableRecords.find((r) => r.record_id === a.linkedRecordId)?.title ?? ""
          : a.title;
        const bt = b.linkedRecordId
          ? linkableRecords.find((r) => r.record_id === b.linkedRecordId)?.title ?? ""
          : b.title;
        return at.localeCompare(bt);
      });
    default:
      return normalizeCardOrder(list);
  }
}

export function computeBoardInsights(cards: WorkbenchBoardCard[]): BoardInsights {
  return cards.reduce<BoardInsights>(
    (acc, card) => {
      acc.total += 1;
      const type = normalizeType(card.type);
      if (type === "note") acc.notes += 1;
      if (type === "image") acc.images += 1;
      if (type === "quote") acc.quotes += 1;
      if (type === "source") acc.sources += 1;
      if (type === "question") acc.questions += 1;
      if (type === "task") acc.tasks += 1;
      if (type === "link") acc.links += 1;
      return acc;
    },
    {
      total: 0,
      notes: 0,
      images: 0,
      quotes: 0,
      sources: 0,
      questions: 0,
      tasks: 0,
      links: 0,
    },
  );
}

export function computeBoardNudges(cards: WorkbenchBoardCard[]): BoardNudge[] {
  const nudges: BoardNudge[] = [];
  const questions = cards.filter((c) => normalizeType(c.type) === "question");
  const unusedSources = cards.filter(
    (c) => normalizeType(c.type) === "source" && !c.usedInDocument,
  );
  const missingAlt = cards.filter(
    (c) =>
      normalizeType(c.type) === "image" &&
      Boolean(c.imageUrl?.trim()) &&
      !c.imageAlt?.trim(),
  );

  if (questions.length) {
    nudges.push({
      id: "open-questions",
      message: `You have ${questions.length} open question${questions.length === 1 ? "" : "s"}.`,
    });
  }
  if (unusedSources.length) {
    nudges.push({
      id: "unused-sources",
      message: `${unusedSources.length} source${unusedSources.length === 1 ? "" : "s"} not yet used in document.`,
    });
  }
  if (missingAlt.length) {
    nudges.push({
      id: "missing-alt",
      message: `${missingAlt.length} image${missingAlt.length === 1 ? "" : "s"} need alt text.`,
    });
  }
  return nudges;
}

export function boardCardsToMarkdownSummary(cards: WorkbenchBoardCard[]): string {
  if (!cards.length) return "";
  const lines = ["## Research board", ""];
  for (const card of normalizeCardOrder(cards)) {
    const type = normalizeType(card.type);
    lines.push(`### ${card.title || "Untitled"} (${type})`);
    if (card.body?.trim()) lines.push(card.body.trim());
    if (card.imageUrl?.trim()) lines.push(`Image: ${card.imageUrl.trim()}`);
    if (card.linkUrl?.trim()) lines.push(`Link: ${card.linkUrl.trim()}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function isBoardTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function computeBoardSmartCounts(cards: WorkbenchBoardCard[]): BoardSmartCounts {
  const counts: BoardSmartCounts = {
    "needs-citation": 0,
    "has-image": 0,
    unsorted: 0,
    questions: 0,
    "ready-for-writing": 0,
    "missing-alt": 0,
  };
  for (const card of cards) {
    for (const chip of Object.keys(counts) as BoardSmartChip[]) {
      if (cardMatchesSmartChip(card, chip)) counts[chip] += 1;
    }
  }
  return counts;
}

export function computeBoardResearchBadges(card: WorkbenchBoardCard): BoardResearchBadge[] {
  const type = normalizeType(card.type);
  const badges: BoardResearchBadge[] = [];
  const workflow = card.workflowStatus ?? card.column ?? "collecting";

  if (type === "source" && !card.cited) badges.push("needs-citation");
  if (type === "image" && card.imageUrl?.trim() && !card.imageAlt?.trim()) {
    badges.push("missing-alt");
  }
  if (workflow === "collecting") badges.push("unsorted");
  if (workflow === "ready" || card.column === "ready") badges.push("ready-for-writing");
  if (card.usedInDocument) badges.push("used-in-document");
  if (card.sourceOrigin === "bookmark") badges.push("from-bookmark");
  if (card.sourceOrigin === "reading_list") badges.push("from-reading-list");
  if (type === "image" && card.imageUrl?.trim()) badges.push("has-image");

  return badges;
}
