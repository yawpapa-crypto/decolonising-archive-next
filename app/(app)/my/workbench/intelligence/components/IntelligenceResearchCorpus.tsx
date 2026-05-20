"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpen, Globe2, Layers, Sparkles } from "lucide-react";
import type {
  IntelligenceBehaviorInsight,
  IntelligenceFacetFilters,
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

type LensId = "themes" | "places" | "years" | "actions";

type CorpusLensItem = {
  id: string;
  label: string;
  count: number;
  cited: number;
  meta: string;
  detail: string;
  category: LensId;
  filterHint?: Partial<IntelligenceFacetFilters>;
};

const LENSES: Array<{ id: LensId; label: string; icon: typeof Layers }> = [
  { id: "themes", label: "Themes", icon: Layers },
  { id: "places", label: "Geography", icon: Globe2 },
  { id: "years", label: "Years", icon: BookOpen },
  { id: "actions", label: "Actions", icon: Sparkles },
];

const LENS_COLORS: Record<LensId, string> = {
  themes: "#0f3d2e",
  places: "#166534",
  years: "#2563eb",
  actions: "#b45309",
};

function chartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CorpusLensItem }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  return (
    <div className="ri-chart-tooltip">
      <strong>{entry.label}</strong>
      <span>
        {entry.count.toLocaleString()} records
        {entry.cited ? ` · ${entry.cited} cited` : ""}
      </span>
    </div>
  );
}

function buildLensItems(
  review: IntelligenceLiteratureReview,
  insights: IntelligenceBehaviorInsight[],
): Record<LensId, CorpusLensItem[]> {
  return {
    themes: review.themeClusters.map((cluster) => ({
      id: `theme:${cluster.theme}`,
      label: cluster.theme,
      count: cluster.total,
      cited: cluster.cited,
      meta: cluster.countries.length ? cluster.countries.join(", ") : "Theme cluster",
      detail: `${cluster.total} records share this theme; ${cluster.cited} are already cited.`,
      category: "themes",
      filterHint: { theme: cluster.theme },
    })),
    places: review.geographySpread.map((place) => ({
      id: `place:${place.label}`,
      label: place.label,
      count: place.count,
      cited: place.cited,
      meta: place.kind,
      detail: `${place.count} saved records map to ${place.label}; ${place.cited} are cited in notes.`,
      category: "places",
      filterHint: place.kind === "country" ? { country: place.label } : { region: place.label },
    })),
    years: review.yearSpread.map((year) => ({
      id: `year:${year.year}`,
      label: year.year,
      count: year.count,
      cited: year.cited,
      meta: `${year.cited} cited`,
      detail: `${year.count} records from ${year.year}; ${year.cited} are cited.`,
      category: "years",
      filterHint: { year: year.year },
    })),
    actions: insights.map((insight) => ({
      id: `action:${insight.id}`,
      label: insight.title,
      count: Number.parseFloat(String(insight.metric ?? "0")) || 1,
      cited: 0,
      meta: insight.category,
      detail: insight.detail,
      category: "actions",
      filterHint: insight.filterHint,
    })),
  };
}

export default function IntelligenceResearchCorpus({
  review,
  insights,
  patterns,
  onApplyFilter,
}: Props) {
  const [activeLens, setActiveLens] = useState<LensId>("places");
  const lensItems = useMemo(() => buildLensItems(review, insights), [review, insights]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeItems = lensItems[activeLens];
  const selected = activeItems.find((item) => item.id === selectedId) ?? activeItems[0] ?? null;
  const maxCount = Math.max(1, ...activeItems.map((item) => item.count));

  function selectLens(next: LensId) {
    setActiveLens(next);
    setSelectedId(null);
  }

  return (
    <section className="ri-section-shell ri-corpus-lens" aria-label="Your research corpus">
      <div className="ri-section-shell__head ri-corpus-lens__head">
        <div>
          <p className="ri-eyebrow">Corpus intelligence</p>
          <h2 className="ri-section-shell__title">Explore your research shape</h2>
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

      <div className="ri-corpus-lens__tabs" role="tablist" aria-label="Corpus lenses">
        {LENSES.map((lens) => {
          const Icon = lens.icon;
          return (
            <button
              key={lens.id}
              type="button"
              role="tab"
              aria-selected={activeLens === lens.id}
              className={cn(activeLens === lens.id && "is-active")}
              onClick={() => selectLens(lens.id)}
            >
              <Icon size={15} aria-hidden />
              {lens.label}
              <span>{lensItems[lens.id].length}</span>
            </button>
          );
        })}
      </div>

      <div className="ri-corpus-lens__workspace">
        <div className="ri-corpus-lens__chart" aria-label={`${activeLens} chart`}>
          {activeItems.length ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={activeItems}
                layout="vertical"
                margin={{ top: 8, right: 20, bottom: 8, left: 0 }}
              >
                <XAxis type="number" hide domain={[0, maxCount]} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={112}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "rgba(15,17,15,0.62)" }}
                  tickFormatter={(value) => String(value).length > 18 ? `${String(value).slice(0, 18)}…` : String(value)}
                />
                <Tooltip
                  content={(props) =>
                    chartTooltip({
                      active: props.active,
                      payload: props.payload as ReadonlyArray<{ payload?: CorpusLensItem }> | undefined,
                    })
                  }
                  cursor={{ fill: "rgba(15, 61, 46, 0.04)" }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 9, 9, 0]}
                  barSize={18}
                  isAnimationActive={false}
                  onClick={(data) => {
                    const payload = (data as unknown as { payload?: CorpusLensItem }).payload;
                    if (payload?.id) setSelectedId(payload.id);
                  }}
                >
                  {activeItems.map((item) => (
                    <Cell
                      key={item.id}
                      fill={LENS_COLORS[item.category]}
                      opacity={selected?.id && selected.id !== item.id ? 0.38 : 0.95}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="ri-corpus-lens__empty">
              <Sparkles size={20} aria-hidden />
              <p>
                {activeLens === "themes"
                  ? "Save and organise records to surface theme clusters."
                  : activeLens === "places"
                    ? "Geography appears as records gain place metadata."
                    : activeLens === "years"
                      ? "Publication years will populate from record metadata."
                      : "Insights appear as you save, cite, and organise records."}
              </p>
            </div>
          )}
        </div>

        <aside className="ri-corpus-lens__detail" aria-live="polite">
          {selected ? (
            <>
              <p className="ri-eyebrow">{activeLens}</p>
              <h3>{selected.label}</h3>
              <p>{selected.detail}</p>
              <dl>
                <div>
                  <dt>Records</dt>
                  <dd>{selected.count.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Cited</dt>
                  <dd>{selected.cited.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Signal</dt>
                  <dd>{selected.meta}</dd>
                </div>
              </dl>
              {selected.filterHint ? (
                <button
                  type="button"
                  className="ri-btn ri-btn--primary"
                  onClick={() => onApplyFilter?.(selected.filterHint)}
                >
                  Open matching records
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="ri-eyebrow">No signal yet</p>
              <h3>Build the corpus</h3>
              <p>Save records, cite sources, and group items into lists to make this lens more useful.</p>
            </>
          )}
        </aside>
      </div>

      {patterns.length ? (
        <div className="ri-corpus-lens__patterns">
          {patterns.map((pattern) => (
            <button
              key={pattern.id}
              type="button"
              className="ri-pattern-chip"
              title={pattern.detail}
              onClick={() => {
                if (pattern.category === "location") onApplyFilter?.({ country: pattern.label });
                if (pattern.category === "theme") onApplyFilter?.({ theme: pattern.label });
                if (pattern.category === "creator") onApplyFilter?.({ creator: pattern.label });
              }}
            >
              {pattern.label} · {pattern.recordCount}
              {pattern.citedCount ? ` (${pattern.citedCount} cited)` : ""}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
