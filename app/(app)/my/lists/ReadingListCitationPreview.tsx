"use client";

import { useState } from "react";

type ReadingListCitationPreviewProps = {
  listId: string;
  listTitle: string;
};

type CitationResponse = {
  citations?: string[];
  error?: string;
};

export default function ReadingListCitationPreview({
  listId,
  listTitle,
}: ReadingListCitationPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [citations, setCitations] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const togglePreview = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    if (citations) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/reading-lists/${listId}/export?format=json`,
      );

      const data = (await response.json()) as CitationResponse;

      if (!response.ok) {
        throw new Error(data.error || "Could not load citation preview.");
      }

      setCitations(data.citations ?? []);
    } catch (error) {
      console.error("Citation preview failed:", error);
      setErrorMessage("Could not load citation preview.");
    } finally {
      setIsLoading(false);
    }
  };

  const previewCitations = citations?.slice(0, 3) ?? [];
  const hiddenCount = citations && citations.length > 3 ? citations.length - 3 : 0;

  return (
    <div className="reading-list-citation-preview">
      <button
        type="button"
        className="reading-list-preview-toggle"
        onClick={togglePreview}
        aria-expanded={isOpen}
        aria-controls={`citation-preview-${listId}`}
      >
        <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
        <span>{isOpen ? "Hide citation preview" : "Preview citations"}</span>
      </button>

      {isOpen ? (
        <div
          id={`citation-preview-${listId}`}
          className="reading-list-preview-panel"
          aria-label={`Citation preview for ${listTitle}`}
        >
          {isLoading ? (
            <p className="workspace-empty">Loading citation preview…</p>
          ) : errorMessage ? (
            <p className="workspace-empty">{errorMessage}</p>
          ) : previewCitations.length ? (
            <>
              <ol>
                {previewCitations.map((citation, index) => (
                  <li key={`${listId}-citation-${index}`}>{citation}</li>
                ))}
              </ol>

              {hiddenCount > 0 ? (
                <p className="reading-list-preview-note">
                  + {hiddenCount} more citation{hiddenCount === 1 ? "" : "s"} in the full export.
                </p>
              ) : null}

              <p className="reading-list-preview-note">
                Citations are generated from available archive metadata. Please check details against the original source before formal publication.
              </p>
            </>
          ) : (
            <p className="workspace-empty">
              This reading list has no records to preview yet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
