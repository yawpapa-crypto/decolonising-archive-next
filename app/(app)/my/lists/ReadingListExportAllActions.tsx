"use client";

import { useState } from "react";
import { useLocalToast } from "./useLocalToast";

type ReadingListExportAllActionsProps = {
  listCount: number;
  recordCount: number;
};

export default function ReadingListExportAllActions({
  listCount,
  recordCount,
}: ReadingListExportAllActionsProps) {
  const { showToast, Toast } = useLocalToast();
  const [copyBusy, setCopyBusy] = useState(false);

  const copyAllCitations = async () => {
    if (copyBusy) return;
    setCopyBusy(true);
    try {
      const response = await fetch("/api/reading-lists/export-all?format=txt");

      if (!response.ok) {
        throw new Error("Could not export all citations");
      }

      const text = await response.text();
      await navigator.clipboard.writeText(text);
      showToast("All reading list citations copied.");
    } catch (error) {
      console.error("Copy all citations failed:", error);
      showToast("Could not copy all citations.");
    } finally {
      setCopyBusy(false);
    }
  };

  const listLabel = listCount === 1 ? "reading list" : "reading lists";
  const recordLabel = recordCount === 1 ? "record" : "records";

  return (
    <>
      <Toast />
      <div className="reading-list-export-all">
      <div>
        <p className="workspace-eyebrow">Full library export</p>
        <h2>
          Export {listCount} {listLabel}, {recordCount} {recordLabel}
        </h2>
        <p>
          Download every reading list in this workspace as one citation file for
          research, teaching, or backup.
        </p>
      </div>

      <div className="reading-list-export-actions reading-list-export-actions-all">
        <button
          type="button"
          onClick={copyAllCitations}
          disabled={copyBusy}
          aria-busy={copyBusy}
          aria-label="Copy citations from all reading lists"
        >
          <span aria-hidden="true" className="export-action-icon">⧉</span>
          <span>{copyBusy ? "Copying…" : "Copy all"}</span>
        </button>

        <a
          href="/api/reading-lists/export-all?format=txt"
          data-no-loader="true"
          aria-label="Download all reading lists as plain text"
        >
          <span aria-hidden="true" className="export-action-icon">□</span>
          <span>TXT</span>
        </a>

        <a
          href="/api/reading-lists/export-all?format=docx"
          data-no-loader="true"
          aria-label="Download all reading lists as Word document"
        >
          <span aria-hidden="true" className="export-action-icon">⇩</span>
          <span>DOCX</span>
        </a>
      </div>
      </div>
    </>
  );
}
