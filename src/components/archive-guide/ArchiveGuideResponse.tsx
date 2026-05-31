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
            {response.suggestedSearches.map((search, i) => {
              const reason = response.searchReasons?.[i];
              return (
                <div key={search} className="archive-guide-response__search-item">
                  <span className="archive-guide-response__search-query">{search}</span>
                  {reason && (
                    <span className="archive-guide-response__search-reason">{reason}</span>
                  )}
                </div>
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
