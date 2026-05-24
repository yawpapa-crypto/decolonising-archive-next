"use client";

import { BookOpen, Globe2, Layers, Sparkles } from "lucide-react";
import type {
  IntelligenceBehaviorInsight,
  IntelligenceLiteratureReview,
  IntelligenceReadingPattern,
} from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  review: IntelligenceLiteratureReview;
  insights: IntelligenceBehaviorInsight[];
  patterns: IntelligenceReadingPattern[];
  onApplyFilter?: (hint?: IntelligenceBehaviorInsight["filterHint"]) => void;
};

function formatDate(iso: string | null) {
  if (!iso) return "No recent activity";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function IntelligenceResearchCorpus({
  review,
  insights,
  patterns,
  onApplyFilter,
}: Props) {
  return (
    <section className="ri-section-shell" aria-label="Your research corpus">
      <div className="ri-section-shell__head">
        <div>
          <p className="ri-eyebrow">Corpus intelligence</p>
          <h2 className="ri-section-shell__title">Themes, geography & reading patterns</h2>
        </div>
        <div className="ri-corpus-stats">
          <div className="ri-corpus-stat">
            <strong>{review.uniqueRecords}</strong>
            <span>Unique records</span>
          </div>
          <div className="ri-corpus-stat">
            <strong>{review.slrReadinessPercent}%</strong>
            <span>SLR ready</span>
          </div>
          <div className="ri-corpus-stat">
            <strong>{review.citedCount}</strong>
            <span>Cited</span>
          </div>
        </div>
      </div>

      <div className="ri-corpus-grid">
        <article className="ri-corpus-card">
          <h3>
            <Layers size={16} aria-hidden />
            Theme clusters
          </h3>
          {review.themeClusters.length ? (
            <ul className="ri-corpus-list">
              {review.themeClusters.map((cluster) => (
                <li key={cluster.theme}>
                  <strong>{cluster.theme}</strong>
                  <span>
                    {cluster.total} records · {cluster.cited} cited
                    {cluster.countries.length ? ` · ${cluster.countries.join(", ")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ri-muted">Save and organise records to surface theme clusters.</p>
          )}
        </article>

        <article className="ri-corpus-card">
          <h3>
            <Globe2 size={16} aria-hidden />
            Geography in your reading
          </h3>
          {review.geographySpread.length ? (
            <ul className="ri-corpus-list">
              {review.geographySpread.map((place) => (
                <li key={place.label}>
                  <strong>{place.label}</strong>
                  <span>
                    {place.count} saved · {place.cited} cited · {place.kind}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ri-muted">Geography appears as you save records with place metadata.</p>
          )}
        </article>

        <article className="ri-corpus-card">
          <h3>
            <BookOpen size={16} aria-hidden />
            Year spread
          </h3>
          {review.yearSpread.length ? (
            <ul className="ri-corpus-list ri-corpus-list--compact">
              {review.yearSpread.map((row) => (
                <li key={row.year}>
                  <strong>{row.year}</strong>
                  <span>
                    {row.count} records · {row.cited} cited
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ri-muted">Publication years will populate from record metadata.</p>
          )}
        </article>

        <article className="ri-corpus-card">
          <h3>
            <Sparkles size={16} aria-hidden />
            Behaviour insights
          </h3>
          {insights.length ? (
            <ul className="ri-insight-list">
              {insights.map((insight) => (
                <li key={insight.id}>
                  <button
                    type="button"
                    className={cn("ri-insight", insight.filterHint && "is-clickable")}
                    onClick={() => insight.filterHint && onApplyFilter?.(insight.filterHint)}
                    disabled={!insight.filterHint}
                  >
                    <span className="ri-insight__metric">{insight.metric ?? "—"}</span>
                    <span>
                      <strong>{insight.title}</strong>
                      <small>{insight.detail}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ri-muted">Insights appear as you save, cite, and organise records.</p>
          )}
        </article>
      </div>

      {patterns.length ? (
        <div className="ri-reading-patterns">
          <h3 className="ri-subsection-title">Reading patterns</h3>
          <div className="ri-pattern-chips">
            {patterns.map((pattern) => (
              <span key={pattern.id} className="ri-pattern-chip" title={pattern.detail}>
                {pattern.label} · {pattern.recordCount}
                {pattern.citedCount ? ` (${pattern.citedCount} cited)` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
