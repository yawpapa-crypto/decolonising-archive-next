"use client";

import ArchiveGuideCharacter from "./ArchiveGuideCharacter";
import ArchiveGuideContextSummary from "./ArchiveGuideContextSummary";
import ArchiveGuideResponse from "./ArchiveGuideResponse";
import { useArchiveGuideState } from "./useArchiveGuideState";

type PromptId = "expand" | "questions" | "compare" | "missing" | "path" | "care" | "reflect";

const promptButtons: { id: PromptId; label: string }[] = [
  { id: "expand", label: "Expand this search" },
  { id: "questions", label: "Ask better questions" },
  { id: "compare", label: "Compare these results" },
  { id: "missing", label: "What am I missing?" },
  { id: "path", label: "Build a reading path" },
  { id: "care", label: "Cultural care check" },
  { id: "reflect", label: "Help me reflect" },
];

const promptModes = {
  expand: "expand_search",
  questions: "ask_better_questions",
  compare: "compare_sources",
  missing: "what_am_i_missing",
  path: "build_reading_path",
  care: "cultural_care_check",
  reflect: "reflect_on_process",
} as const;

const modeLabels: Record<string, string> = {
  expand_search: "Expanding your search",
  ask_better_questions: "Asking better questions",
  compare_sources: "Comparing sources",
  what_am_i_missing: "Finding what's missing",
  build_reading_path: "Building a reading path",
  cultural_care_check: "Cultural care check",
  reflect_on_process: "Reflecting on process",
};

export default function ArchiveGuidePanel() {
  const guide = useArchiveGuideState();

  // Only show on library / workbench-board surfaces
  if (guide.snapshot.surface === "none") return null;

  // Permanently hidden → restore chip
  if (guide.isHidden) {
    return (
      <button
        type="button"
        aria-label="Open Archive Guide beta"
        className="archive-guide-restore"
        onClick={guide.showGuide}
      >
        <ArchiveGuideCharacter compact muted={guide.isMuted} state="idle" />
        <span>Archive Guide beta</span>
      </button>
    );
  }

  // Bubble (minimised)
  if (guide.panelView === "bubble") {
    return (
      <div className="archive-guide-shell archive-guide-shell--bubble">
        <button
          type="button"
          className="archive-guide-bubble"
          aria-label="Open Archive Guide beta"
          onClick={guide.openPanel}
        >
          <ArchiveGuideCharacter compact state={guide.state} muted={guide.isMuted} />
          <span className="archive-guide-bubble__label">{guide.message}</span>
        </button>
      </div>
    );
  }

  // Full open panel
  return (
    <aside
      className="archive-guide-shell archive-guide-shell--open"
      aria-label="Archive Guide beta"
    >
      {/* Header */}
      <div className="archive-guide-panel__header">
        <div className="archive-guide-panel__header-left">
          <ArchiveGuideCharacter compact state={guide.state} muted={guide.isMuted} />
          <div className="archive-guide-panel__header-text">
            <p className="archive-guide-panel__eyebrow">
              Archive Guide <span>beta</span>
            </p>
            <p className="archive-guide-panel__status" aria-live="polite">
              {guide.isAskingGuide
                ? "Thinking with your search…"
                : guide.activeMode
                ? modeLabels[guide.activeMode] ?? "Guided inquiry companion"
                : "Guided inquiry companion"}
            </p>
          </div>
        </div>
        <div className="archive-guide-panel__header-controls">
          <button
            type="button"
            aria-label={guide.isMuted ? "Wake Archive Guide animation" : "Mute Archive Guide animation"}
            className="archive-guide-icon-btn"
            onClick={guide.toggleMuted}
            title={guide.isMuted ? "Wake" : "Mute"}
          >
            {guide.isMuted ? "◎" : "●"}
          </button>
          <button
            type="button"
            aria-label="Minimise Archive Guide"
            className="archive-guide-icon-btn"
            onClick={guide.closePanel}
            title="Minimise"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Hide Archive Guide"
            className="archive-guide-icon-btn"
            onClick={guide.hideGuide}
            title="Hide"
          >
            ×
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="archive-guide-panel__body">
        {/* Context chip */}
        <ArchiveGuideContextSummary context={guide.currentContext} />

        {/* Loading skeleton */}
        {guide.isAskingGuide && (
          <div className="archive-guide-loading" aria-live="polite" aria-label="Thinking…" role="status">
            <span />
            <span />
            <span />
          </div>
        )}

        {/* Error */}
        {guide.guideError && !guide.isAskingGuide && (
          <p className="archive-guide-error" role="alert">
            {guide.guideError}
          </p>
        )}

        {/* Response */}
        {guide.guideResponse && !guide.isAskingGuide && (
          <ArchiveGuideResponse response={guide.guideResponse} />
        )}

        {/* Intro — only when no response, not loading, no error */}
        {!guide.guideResponse && !guide.isAskingGuide && !guide.guideError && (
          <p className="archive-guide-intro">{guide.message}</p>
        )}

        {/* Prompt grid */}
        <div className="archive-guide-prompt-grid" aria-label="Guide prompts">
          {promptButtons.map((btn) => {
            const mode = promptModes[btn.id];
            const isActive = guide.activeMode === mode;
            const isLoading = guide.isAskingGuide && isActive;
            return (
              <button
                key={btn.id}
                type="button"
                className={[
                  "archive-guide-prompt-button",
                  isActive ? "is-active" : "",
                  guide.isAskingGuide ? "is-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={guide.isAskingGuide}
                onClick={() => guide.runPrompt(btn.id)}
                aria-pressed={isActive}
              >
                {isLoading ? "Thinking…" : btn.label}
              </button>
            );
          })}
        </div>

        {/* Privacy note */}
        <p className="archive-guide-privacy-note">
          Only visible search context is sent. Private content is never included.
        </p>
      </div>
    </aside>
  );
}
