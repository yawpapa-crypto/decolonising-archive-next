"use client";

import { useLocalToast } from "./useLocalToast";

type ReadingListExportActionsProps = {
  listId: string;
  listTitle: string;
};

export default function ReadingListExportActions({
  listId,
  listTitle,
}: ReadingListExportActionsProps) {
  const { showToast, Toast } = useLocalToast();

  const copyCitations = async () => {
    try {
      const response = await fetch(`/api/reading-lists/${listId}/export?format=txt`);

      if (!response.ok) {
        throw new Error("Could not export citations");
      }

      const text = await response.text();
      await navigator.clipboard.writeText(text);
      showToast("Citations copied.");
    } catch (error) {
      console.error("Copy citations failed:", error);
      showToast("Could not copy citations.");
    }
  };

  return (
    <>
      <Toast />
      <div className="reading-list-export-actions" aria-label={`Export options for ${listTitle}`}>
      <button
        type="button"
        onClick={copyCitations}
        aria-label={`Copy citations for ${listTitle}`}
      >
        <span aria-hidden="true" className="export-action-icon">⧉</span>
        <span>Copy</span>
      </button>

      <a
        href={`/api/reading-lists/${listId}/export?format=txt`}
        aria-label={`Download ${listTitle} as plain text`}
      >
        <span aria-hidden="true" className="export-action-icon">□</span>
        <span>TXT</span>
      </a>

      <a
        href={`/api/reading-lists/${listId}/export?format=docx`}
        aria-label={`Download ${listTitle} as Word document`}
      >
        <span aria-hidden="true" className="export-action-icon">⇩</span>
        <span>DOCX</span>
      </a>
      </div>
    </>
  );
}
