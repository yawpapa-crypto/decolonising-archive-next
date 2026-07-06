import type { ArchiveGuideMode, ArchiveGuideSuccess } from "@/src/lib/archive-guide-types";

type ArchiveGuideResponseProps = {
  response: ArchiveGuideSuccess;
};

function questionsLabel(mode: ArchiveGuideMode): string {
  switch (mode) {
    case "ask_better_questions": return "Research questions";
    case "compare_sources":      return "Comparison prompts";
    case "what_am_i_missing":    return "Possible gaps";
    case "cultural_care_check":  return "Cultural care questions";
    case "reflect_on_process":   return "Process reflection";
    default:                     return "Guiding questions";
  }
}

function searchesLabel(mode: ArchiveGuideMode): string {
  switch (mode) {
    case "build_reading_path": return "Reading path";
    case "what_am_i_missing":  return "Searches to try";
    default:                   return "Search paths";
  }
}

export default function ArchiveGuideResponse({ response }: ArchiveGuideResponseProps) {
  const qLabel = questionsLabel(response.mode);
  const sLabel = searchesLabel(response.mode);

  function runSuggestedSearch(suggestion: ArchiveGuideSuccess["suggestedSearches"][number]) {
    if (typeof window === "undefined") return;
    const searchInput = document.getElementById("mainSearch") as HTMLInputElement | null;
    const originalQuery =
      new URLSearchParams(window.location.search).get("q") ||
      searchInput?.value.trim() ||
      undefined;
    window.dispatchEvent(
      new CustomEvent("archive-guide:suggested-search-clicked", {
        detail: {
          originalQuery,
          suggestedQuery: suggestion.query,
          suggestionType: suggestion.type,
          mode: response.mode,
        },
      }),
    );
  }

  return (
    <section className="archive-guide-response" aria-label="Archive Guide response">
      <p className="archive-guide-response__move">{response.learningMove}</p>
      <p className="archive-guide-response__body">{response.response}</p>

      {response.guidingQuestions.length > 0 && (
        <div className="archive-guide-response__section">
          <h3>{qLabel}</h3>
          <ul>
            {response.guidingQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      {response.suggestedSearches.length > 0 && (
        <div className="archive-guide-response__section">
          <h3>{sLabel}</h3>
          <div className="archive-guide-response__searches">
            {response.suggestedSearches.map((suggestion) => {
              return (
                <button
                  key={`${suggestion.type}-${suggestion.query}`}
                  type="button"
                  className="archive-guide-response__search-item"
                  onClick={() => runSuggestedSearch(suggestion)}
                  aria-label={`Search this suggested query: ${suggestion.query}`}
                >
                  <span className="archive-guide-response__search-type">{suggestion.type.replace("_", " ")}</span>
                  <span className="archive-guide-response__search-query">{suggestion.query}</span>
                  <span className="archive-guide-response__search-reason">{suggestion.reason}</span>
                  <span className="archive-guide-response__search-action">Search this</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {response.nextActions.length > 0 && (
        <div className="archive-guide-response__section">
          <h3>Next step</h3>
          <div className="archive-guide-response__actions">
            {response.nextActions.map((action) => (
              <span key={`${action.action}-${action.label}`}>{action.label}</span>
            ))}
          </div>
        </div>
      )}

      {response.isFallback && (
        <p className="archive-guide-response__fallback-note">
          Using offline guide pattern — connect Gemini for personalised responses.
        </p>
      )}
    </section>
  );
}
