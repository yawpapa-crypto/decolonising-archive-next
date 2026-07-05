"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CollectionRecordResearchInput } from "@/lib/research/collection-record-research";
import {
  CITATION_STYLE_OPTIONS,
  type CitationPayload,
  type CitationStyleId,
} from "@/lib/research/citation-formats";

type Props = {
  input: CollectionRecordResearchInput;
  open: boolean;
  onClose: () => void;
};

export default function CitationPanel({ input, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CitationStyleId>("apa");
  const [citation, setCitation] = useState<CitationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCitation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/citations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: input.itemType,
          itemId: input.itemId,
          citationStyle: style,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not generate citation");
      setCitation(json.citation as CitationPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate citation");
      setCitation(null);
    } finally {
      setLoading(false);
    }
  }, [input.itemId, input.itemType, style]);

  useEffect(() => {
    if (!open) return;
    void fetchCitation();
  }, [open, fetchCitation]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  async function copyCitation() {
    if (!citation) return;
    await navigator.clipboard.writeText(citation.formatted);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadCitation(ext: "bib" | "ris" | "txt") {
    if (!citation) return;
    const map = {
      bib: { body: citation.bibtex ?? citation.formatted, mime: "application/x-bibtex" },
      ris: { body: citation.ris ?? citation.formatted, mime: "application/x-research-info-systems" },
      txt: { body: citation.formatted, mime: "text/plain" },
    };
    const payload = map[ext];
    const blob = new Blob([payload.body], { type: payload.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${input.itemId.toLowerCase()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return createPortal(
    <div className="research-cite-overlay" onClick={onClose} role="presentation">
      <div
        className="research-cite-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-cite-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="research-cite-header">
          <h2 id="research-cite-title">Cite this record</h2>
          <button type="button" className="research-cite-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <label className="research-cite-label" htmlFor="research-cite-style">
          Citation style
        </label>
        <select
          id="research-cite-style"
          className="research-cite-select"
          value={style}
          onChange={(e) => setStyle(e.target.value as CitationStyleId)}
        >
          {CITATION_STYLE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <p className="research-cite-note">
          Citation generated from current catalogue metadata. Uncertain creators and dates are preserved
          as stated in the catalogue.
        </p>

        {loading && <p className="research-cite-status">Generating citation…</p>}
        {error && <p className="research-cite-error">{error}</p>}

        {!loading && citation && (
          <>
            <textarea
              className="research-cite-output"
              readOnly
              value={citation.formatted}
              aria-label="Formatted citation"
            />
            <div className="research-cite-actions">
              <button type="button" className="research-action-btn" onClick={() => void copyCitation()}>
                {copied ? "Copied" : "Copy citation"}
              </button>
              <button type="button" className="research-action-btn research-action-btn--ghost" onClick={() => downloadCitation("txt")}>
                Download .txt
              </button>
              <button type="button" className="research-action-btn research-action-btn--ghost" onClick={() => downloadCitation("bib")}>
                BibTeX
              </button>
              <button type="button" className="research-action-btn research-action-btn--ghost" onClick={() => downloadCitation("ris")}>
                RIS
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
