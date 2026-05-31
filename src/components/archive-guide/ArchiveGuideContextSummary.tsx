import type { ArchiveGuideStructuredContext } from "@/src/lib/archive-guide-types";

type ArchiveGuideContextSummaryProps = {
  context: ArchiveGuideStructuredContext | null;
};

function areaLabel(area: string) {
  return area
    .replace(/^workbench_/, "workbench ")
    .replace(/_/g, " ");
}

export default function ArchiveGuideContextSummary({ context }: ArchiveGuideContextSummaryProps) {
  if (!context) return null;

  const itemCount =
    context.results?.length ??
    context.boardCards?.length ??
    context.canvasObjects?.length ??
    context.readingListItems?.length ??
    0;

  return (
    <p className="archive-guide-context-summary">
      Using visible {areaLabel(context.area)} context
      {context.query ? ` for “${context.query}”` : ""}
      {itemCount ? ` · ${itemCount} visible item${itemCount === 1 ? "" : "s"}` : ""}
    </p>
  );
}
