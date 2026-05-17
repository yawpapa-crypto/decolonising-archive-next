import type {
  IntelligenceCollection,
  IntelligenceFilter,
  IntelligenceItem,
} from "@/lib/workbench-intelligence-types";

export function filterIntelligenceItems(
  items: IntelligenceItem[],
  options: { filter: IntelligenceFilter; search: string; collectionId?: string | null },
): IntelligenceItem[] {
  const q = options.search.trim().toLowerCase();
  return items.filter((item) => {
    if (options.collectionId && !item.collections.includes(options.collectionId)) {
      return false;
    }

    if (options.filter !== "all") {
      switch (options.filter) {
        case "unsorted":
          if (!item.collections.includes("unsorted_records")) return false;
          break;
        case "bookmarks":
          if (item.source !== "bookmark") return false;
          break;
        case "reading_lists":
          if (item.source !== "reading_list" && !item.collections.includes("reading_list_records")) {
            return false;
          }
          break;
        case "projects":
          if (!item.projectId && !item.collections.includes("project_records")) return false;
          break;
        case "cited":
          if (!item.cited) return false;
          break;
        case "uncited":
          if (item.cited || !item.recordId) return false;
          break;
        case "needs_metadata":
          if (!item.collections.includes("missing_metadata")) return false;
          break;
        case "questions":
          if (!item.collections.includes("open_questions")) return false;
          break;
        case "images":
          if (!item.collections.includes("image_records")) return false;
          break;
        case "tasks":
          if (item.type !== "task") return false;
          break;
        case "needs_action":
          if (
            !item.collections.some((collection) =>
              [
                "unsorted_records",
                "uncited_records",
                "needs_citation",
                "missing_metadata",
                "images_missing_alt",
                "board_not_sent_to_document",
                "open_questions",
                "needs_cultural_care",
              ].includes(collection),
            )
          ) {
            return false;
          }
          break;
        default:
          break;
      }
    }

    if (!q) return true;
    const haystack = [
      item.title,
      item.subtitle,
      item.creator,
      item.date,
      item.sourceLabel,
      item.projectTitle,
      item.readingListTitle,
      item.noteTitle,
      item.type,
      item.source,
      item.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function intelligenceItemsToCsv(items: IntelligenceItem[]) {
  const header = [
    "Title",
    "Type",
    "Source",
    "Status",
    "Cited",
    "Used in writing",
    "Project",
    "Reading list",
    "Note",
    "Record ID",
  ];
  const rows = items.map((item) =>
    [
      item.title,
      item.type,
      item.source,
      item.status,
      item.cited ? "yes" : "no",
      item.usedInWriting ? "yes" : "no",
      item.projectTitle ?? "",
      item.readingListTitle ?? "",
      item.noteTitle ?? "",
      item.recordId ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function intelligenceItemsToMarkdown(
  items: IntelligenceItem[],
  collections: IntelligenceCollection[],
) {
  const lines = ["# Research Intelligence summary", ""];
  for (const collection of collections) {
    if (!collection.itemIds.length) continue;
    lines.push(`## ${collection.title}`, "", collection.description, "");
    for (const id of collection.itemIds.slice(0, 25)) {
      const item = items.find((entry) => entry.id === id);
      if (!item) continue;
      lines.push(`- **${item.title}** (${item.type}, ${item.status})`);
    }
    if (collection.itemIds.length > 25) {
      lines.push(`- …and ${collection.itemIds.length - 25} more`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
