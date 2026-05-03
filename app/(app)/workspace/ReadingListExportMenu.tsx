"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Download, FileText } from "lucide-react";

type ExportFormat = "txt" | "docx";

type ReadingListExportMenuProps = {
  listId: string;
  listTitle: string;
  recordCount: number;
};

function filename(title: string, format: ExportFormat) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "reading-list";
  return `${base}-citations.${format}`;
}

export default function ReadingListExportMenu({
  listId,
  listTitle,
  recordCount,
}: ReadingListExportMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function exportUrl(format: ExportFormat) {
    return `/api/reading-lists/${listId}/export?format=${format}&style=apa7`;
  }

  function handleExport(format: ExportFormat) {
    startTransition(async () => {
      try {
        const response = await fetch(exportUrl(format));
        if (!response.ok) throw new Error("Export failed.");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename(listTitle, format);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setFeedback(`${format.toUpperCase()} ready.`);
      } catch (error) {
        console.error(error);
        setFeedback("Could not export.");
      }
    });
  }

  function handleCopyCitations() {
    startTransition(async () => {
      try {
        const response = await fetch(exportUrl("txt"));
        if (!response.ok) throw new Error("Copy failed.");
        const text = await response.text();
        const citations = text.split("\nRecords\n")[0].trim();
        await navigator.clipboard.writeText(citations);
        setFeedback("Citations copied.");
      } catch (error) {
        console.error(error);
        setFeedback("Could not copy citations.");
      }
    });
  }

  const disabled = isPending;
  const emptyLabel = recordCount === 0 ? "Empty list export" : "Export";

  return (
    <div className="workspace-export-menu" aria-label={`${emptyLabel} controls`}>
      <button
        type="button"
        onClick={handleCopyCitations}
        className="workspace-export-btn"
        disabled={disabled}
        aria-label={`Copy citations for ${listTitle}`}
      >
        <Copy size={14} />
        Copy
      </button>
      <button
        type="button"
        onClick={() => handleExport("txt")}
        className="workspace-export-btn"
        disabled={disabled}
        aria-label={`Download ${listTitle} as TXT`}
      >
        <FileText size={14} />
        TXT
      </button>
      <button
        type="button"
        onClick={() => handleExport("docx")}
        className="workspace-export-btn"
        disabled={disabled}
        aria-label={`Download ${listTitle} as DOCX`}
      >
        <Download size={14} />
        DOCX
      </button>
      {feedback ? <span className="workspace-export-feedback">{feedback}</span> : null}
    </div>
  );
}
