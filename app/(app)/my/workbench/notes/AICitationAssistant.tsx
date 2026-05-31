"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CitationCandidate } from "./WorkbenchNotesClient";
import type { ScholarlySearchResult } from "@/lib/scholarly-search";
import { useFloatingPanelPosition } from "./useFloatingPanelPosition";

const PANEL_WIDTH = 332;
const POSITION_STORAGE_KEY = "workbench-ai-citation-card-position-v2";

type Props = {
  open: boolean;
  onClose: () => void;
  candidates: CitationCandidate[];
  noteId?: string;
  noteContentHtml?: string;
  canEdit: boolean;
  formatDrawerOpen?: boolean;
  onSelectCandidate: (candidate: CitationCandidate) => void;
  onInsertScholarlyResult: (result: ScholarlySearchResult) => void;
  onRecommendedCandidateIdsChange: (ids: string[]) => void;
};

type PanelTab = "sources" | "discover";

function summarizeCandidate(candidate: CitationCandidate) {
  return [candidate.creator, candidate.sourceLabel].filter(Boolean).join(" · ");
}

function formatAiExplanation(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) {
    return trimmed;
  }
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(stripped) as { explanation?: string; result?: string };
    return String(parsed.explanation ?? parsed.result ?? trimmed).trim();
  } catch {
    const match = stripped.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (match?.[1]) {
      return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
    }
    return trimmed;
  }
}

export default function AICitationAssistant({
  open,
  onClose,
  candidates,
  canEdit,
  formatDrawerOpen = false,
  onSelectCandidate,
  onInsertScholarlyResult,
  onRecommendedCandidateIdsChange,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [scholarlyResults, setScholarlyResults] = useState<ScholarlySearchResult[]>([]);
  const [sourceSections, setSourceSections] = useState<
    Record<
      string,
      {
        count: number | null;
        displayedCount: number;
        nextCursor: string | null;
        results: ScholarlySearchResult[];
        error: string | null;
      }
    >
  >({});
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [recommendedCandidateIds, setRecommendedCandidateIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<PanelTab>("sources");

  const getDefaultPosition = useCallback(() => {
    const drawerInset = formatDrawerOpen ? 320 : 0;
    const margin = 20;
    return {
      x: Math.max(margin, window.innerWidth - drawerInset - PANEL_WIDTH - margin),
      y: Math.max(64, window.innerHeight - 460),
    };
  }, [formatDrawerOpen]);

  const { panelRef, ready, onPanelPointerDown, resetPosition } = useFloatingPanelPosition({
    storageKey: POSITION_STORAGE_KEY,
    width: PANEL_WIDTH,
    enabled: open,
    getDefaultPosition,
  });

  const filteredCandidates = useMemo(() => {
    if (!query.trim()) return candidates;
    const normalized = query.trim().toLowerCase();
    return candidates.filter((candidate) =>
      [
        candidate.title,
        candidate.creator,
        candidate.sourceLabel,
        candidate.readingListTitle,
        candidate.institution,
        candidate.citationText,
      ]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(normalized)),
    );
  }, [candidates, query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleScholarlySearch() {
    setError("");
    setAiResponse(null);
    setScholarlyResults([]);
    setSourceSections({});
    setSearchQueries([]);
    setSearchWarnings([]);
    setRecommendedCandidateIds([]);
    onRecommendedCandidateIdsChange([]);
    setIsLoading(true);
    setActiveTab("discover");

    try {
      const searchQuery =
        aiPrompt.trim() ||
        query.trim() ||
        "decolonisation indigenous knowledge systems African epistemology";
      const res = await fetch("/api/workbench/notes/scholarly-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          limit: 25,
          localTitles: candidates.map((candidate) => candidate.title),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        explanation?: string;
        results?: ScholarlySearchResult[];
        sourceSections?: Record<
          string,
          {
            count: number | null;
            displayedCount: number;
            nextCursor: string | null;
            results: ScholarlySearchResult[];
            error: string | null;
          }
        >;
        searchQueries?: string[];
        warnings?: string[];
      };
      if (!res.ok || !json.ok) {
        setError(json.error || "Scholarly search unavailable.");
      } else {
        setAiResponse(formatAiExplanation(json.explanation ?? "Search complete."));
        setScholarlyResults(json.results ?? []);
        setSourceSections(json.sourceSections ?? {});
        setSearchQueries(json.searchQueries ?? []);
        setSearchWarnings(json.warnings ?? []);
      }
    } catch {
      setError("Unable to reach scholarly search.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={panelRef}
      id="workbench-ai-citation-assistant"
      className="ai-cite-panel"
      role="dialog"
      aria-label="Citation assistant"
      style={{
        width: PANEL_WIDTH,
        opacity: ready ? 1 : 0,
        pointerEvents: ready ? "auto" : "none",
      }}
      onPointerDown={onPanelPointerDown}
    >
      <header className="ai-cite-panel__chrome" data-drag-handle>
        <button
          type="button"
          className="ai-cite-panel__grip"
          aria-label="Drag panel"
          title="Drag to move"
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <div className="ai-cite-panel__chrome-text">
          <strong>Citations</strong>
          <span>
            {activeTab === "discover" && scholarlyResults.length > 0
              ? `${scholarlyResults.length} discovered`
              : `${filteredCandidates.length} archive`}
          </span>
        </div>
        <button
          type="button"
          className="ai-cite-panel__reset"
          data-no-drag
          onClick={resetPosition}
          aria-label="Reset position"
          title="Reset position"
        >
          ⌖
        </button>
        <button
          type="button"
          className="ai-cite-panel__close"
          data-no-drag
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="ai-cite-panel__tabs" role="tablist" data-no-drag>
        <button
          type="button"
          role="tab"
          className={`ai-cite-panel__tab${activeTab === "sources" ? " is-active" : ""}`}
          aria-selected={activeTab === "sources"}
          onClick={() => setActiveTab("sources")}
        >
          Sources
        </button>
        <button
          type="button"
          role="tab"
          className={`ai-cite-panel__tab${activeTab === "discover" ? " is-active" : ""}`}
          aria-selected={activeTab === "discover"}
          onClick={() => setActiveTab("discover")}
        >
          Discover
        </button>
      </div>

      <div className="ai-cite-panel__controls" data-no-drag>
        <label className="ai-cite-panel__search">
          <span className="ai-cite-panel__search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search archive…"
            aria-label="Search sources"
          />
        </label>

        {activeTab === "discover" ? (
          <input
            type="text"
            className="ai-cite-panel__prompt"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="e.g. indigenous knowledge decolonisation Africa"
            aria-label="Scholarly search query"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleScholarlySearch();
              }
            }}
          />
        ) : null}
      </div>

      <div className="ai-cite-panel__body" data-no-drag>
        {activeTab === "sources" ? (
          <ul className="ai-cite-panel__list">
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate) => {
                const isRecommended = recommendedCandidateIds.includes(candidate.id);
                const meta = summarizeCandidate(candidate);
                return (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      className={`ai-cite-panel__row${isRecommended ? " is-recommended" : ""}`}
                      onClick={() => onSelectCandidate(candidate)}
                    >
                      <span className="ai-cite-panel__row-title">{candidate.title}</span>
                      {meta ? <span className="ai-cite-panel__row-meta">{meta}</span> : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="ai-cite-panel__empty">No sources match your search.</li>
            )}
          </ul>
                ) : (
          <div className="ai-cite-panel__ai">
            {error ? (
              <p className="ai-cite-panel__notice ai-cite-panel__notice--error">{error}</p>
            ) : null}
            {searchWarnings.length > 0 ? (
              <p className="ai-cite-panel__notice">{searchWarnings.join(" ")}</p>
            ) : null}
            {aiResponse ? (
              <>
                <p className="ai-cite-panel__ai-text">{aiResponse}</p>
                {searchQueries.length > 0 ? (
                  <p className="ai-cite-panel__hint">Searched: {searchQueries.join(" · ")}</p>
                ) : null}
                {scholarlyResults.length > 0 ? (
                  <div className="ai-cite-panel__source-sections">
                    {(Object.keys(sourceSections).length > 0
                      ? Object.entries(sourceSections)
                      : ([
                          [
                            "All",
                            {
                              count: scholarlyResults.length,
                              displayedCount: scholarlyResults.length,
                              nextCursor: null,
                              results: scholarlyResults,
                              error: null,
                            },
                          ],
                        ] as Array<
                          [
                            string,
                            {
                              count: number | null;
                              displayedCount: number;
                              nextCursor: string | null;
                              results: ScholarlySearchResult[];
                              error: string | null;
                            },
                          ]
                        >)
                    ).map(([source, section]) => {
                      if (!section.results.length) return null;
                      const countLabel =
                        section.count != null && section.count > section.displayedCount
                          ? `Showing ${section.displayedCount} of ${section.count.toLocaleString()}`
                          : `${section.displayedCount} result${section.displayedCount === 1 ? "" : "s"}`;
                      return (
                        <section key={source} className="ai-cite-panel__source-block">
                          <h3 className="ai-cite-panel__source-heading">
                            {source} <span className="ai-cite-panel__source-count">({countLabel})</span>
                          </h3>
                          {section.error ? (
                            <p className="ai-cite-panel__notice ai-cite-panel__notice--error">{section.error}</p>
                          ) : null}
                          <ul className="ai-cite-panel__picks">
                            {section.results.map((result) => {
                              const meta = [result.creator, result.year, result.journal || result.publisher]
                                .filter(Boolean)
                                .join(" · ");
                              const sourceLabel =
                                result.source === "Gemini"
                                  ? result.verified
                                    ? "Gemini · verified"
                                    : "Gemini · check citation"
                                  : result.source;
                              return (
                                <li key={result.id}>
                                  <button
                                    type="button"
                                    className={`ai-cite-panel__pick${result.source === "Gemini" ? " is-gemini" : ""}${result.verified === false ? " is-unverified" : ""}`}
                                    disabled={!canEdit}
                                    onClick={() => onInsertScholarlyResult(result)}
                                  >
                                    <span className="ai-cite-panel__pick-head">
                                      <span className="ai-cite-panel__pick-title">{result.title}</span>
                                      <span className="ai-cite-panel__pick-source">{sourceLabel}</span>
                                    </span>
                                    {result.rationale ? (
                                      <span className="ai-cite-panel__pick-rationale">{result.rationale}</span>
                                    ) : null}
                                    <span className="ai-cite-panel__pick-citation">{result.citationLine}</span>
                                    {meta ? <span className="ai-cite-panel__pick-meta">{meta}</span> : null}
                                    {result.doi ? (
                                      <span className="ai-cite-panel__pick-meta">DOI: {result.doi}</span>
                                    ) : null}
                                    <span className="ai-cite-panel__pick-action">Insert citation</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="ai-cite-panel__empty">
                Search open scholarly indexes for citable papers and reports. Try decolonisation,
                indigenous knowledge, or Pan-African epistemology.
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="ai-cite-panel__footer" data-no-drag>
        <button
          type="button"
          className="ai-cite-panel__cta"
          onClick={() => void handleScholarlySearch()}
          disabled={!canEdit || isLoading}
        >
          <span className="ai-cite-panel__cta-label">
            {isLoading ? "Searching…" : "Search indexes + Gemini"}
          </span>
        </button>
      </footer>
    </div>,
    document.body,
  );
}
