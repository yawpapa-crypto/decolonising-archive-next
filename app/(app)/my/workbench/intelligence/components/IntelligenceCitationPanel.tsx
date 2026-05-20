"use client";

import { AlertCircle, BookOpen, CheckCircle2, Link2, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CitationIntelligence,
  IntelligenceDistributionEntry,
} from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  citation: CitationIntelligence;
  onFilterRecords?: (filter: "cited" | "uncited" | "needs_metadata") => void;
  onAuthorSelect?: (author: string | null) => void;
  activeAuthor?: string | null;
};

const CITATION_COLORS = ["#0f3d2e", "#2f6d54", "#6b8f7c", "#9fb3a9", "#cbd7d1"];

function CitationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { label?: string; count?: number; percent?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry?.label) return null;
  return (
    <div className="ri-chart-tooltip">
      <strong>{entry.label}</strong>
      <span>
        {(entry.count ?? 0).toLocaleString()}
        {entry.percent ? ` · ${entry.percent}%` : ""}
      </span>
    </div>
  );
}

function CitationStat({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof BookOpen;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={cn("ri-citation-stat", onClick && "is-clickable")}
      onClick={onClick}
    >
      <span className="ri-citation-stat__icon">
        <Icon size={16} aria-hidden />
      </span>
      <span className="ri-citation-stat__label">{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <span className="ri-citation-stat__hint">{hint}</span>
    </Tag>
  );
}

function TopAuthorsList({
  authors,
  activeAuthor,
  onAuthorSelect,
}: {
  authors: IntelligenceDistributionEntry[];
  activeAuthor?: string | null;
  onAuthorSelect?: (author: string | null) => void;
}) {
  const visible = authors.filter((entry) => entry.count > 0).slice(0, 6);
  const max = Math.max(1, ...visible.map((entry) => entry.count));

  return (
    <section className="ri-panel ri-citation-card" aria-label="Most cited authors">
      <div className="ri-citation-card__head">
        <div>
          <p className="ri-eyebrow">Authors</p>
          <h3 className="ri-section-title">Most cited authors</h3>
        </div>
      </div>

      {visible.length ? (
        <ol className="ri-citation-author-list">
          {visible.map((entry, index) => {
            const active = activeAuthor === entry.label;
            return (
              <li key={entry.label}>
                <button
                  type="button"
                  className={cn("ri-citation-author", active && "is-active")}
                  onClick={() => onAuthorSelect?.(active ? null : entry.label)}
                  disabled={!onAuthorSelect}
                >
                  <span className="ri-citation-author__rank">{index + 1}</span>
                  <span className="ri-citation-author__name" title={entry.label}>
                    {entry.label}
                  </span>
                  <strong>{entry.count}</strong>
                  <span className="ri-citation-author__track" aria-hidden>
                    <span style={{ width: `${Math.max(10, (entry.count / max) * 100)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ri-empty-note">Add citations in notes to see author frequency.</p>
      )}
    </section>
  );
}

function CitationYearChart({ entries }: { entries: IntelligenceDistributionEntry[] }) {
  const chartData = entries
    .filter((entry) => entry.count > 0)
    .slice(0, 10)
    .map((entry) => ({
      label: entry.label,
      count: entry.count,
      percent: entry.percent,
    }));

  return (
    <section className="ri-panel ri-citation-card" aria-label="Cited records by year">
      <div className="ri-citation-card__head">
        <div>
          <p className="ri-eyebrow">Timeline</p>
          <h3 className="ri-section-title">Cited records by year</h3>
        </div>
      </div>

      {chartData.length ? (
        <div className="ri-citation-year-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 0 }}>
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="label"
                width={54}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "rgba(15,17,15,0.58)" }}
              />
              <Tooltip content={<CitationTooltip />} cursor={{ fill: "rgba(15, 61, 46, 0.04)" }} />
              <Bar dataKey="count" radius={[0, 7, 7, 0]} barSize={14} isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={CITATION_COLORS[index % CITATION_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ri-citation-empty-state">
          <CheckCircle2 size={18} aria-hidden />
          <p>No dated cited records yet. Citations with publication years will appear here.</p>
        </div>
      )}
    </section>
  );
}

export default function IntelligenceCitationPanel({
  citation,
  onFilterRecords,
  onAuthorSelect,
  activeAuthor,
}: Props) {
  return (
    <section className="ri-panel ri-citation-panel" aria-label="Citation intelligence">
      <div className="ri-panel__head">
        <div>
          <p className="ri-eyebrow">Citations</p>
          <h2 className="ri-section-shell__title">Citation intelligence</h2>
        </div>
      </div>

      <div className="ri-citation-stats">
        <CitationStat
          label="Cited sources"
          value={citation.citedSourcesCount}
          hint={`${citation.totalCitations} in-note citations`}
          icon={BookOpen}
          onClick={() => onFilterRecords?.("cited")}
        />
        <CitationStat
          label="Uncited notes"
          value={citation.uncitedNotesCount}
          hint="Notes without citations"
          icon={AlertCircle}
          onClick={() => onFilterRecords?.("uncited")}
        />
        <CitationStat
          label="Missing DOI/URL"
          value={citation.missingDoiOrUrl}
          hint="Citations needing identifiers"
          icon={Link2}
          onClick={() => onFilterRecords?.("needs_metadata")}
        />
        <CitationStat
          label="Style drift"
          value={citation.styleIssues}
          hint="Mixed citation styles detected"
          icon={Users}
        />
      </div>

      {citation.weakDiversityWarning ? (
        <div className="ri-citation-warning">
          <AlertCircle size={16} aria-hidden />
          <p>{citation.weakDiversityWarning}</p>
        </div>
      ) : null}

      <div className="ri-citation-grid">
        <TopAuthorsList
          authors={citation.topAuthors}
          onAuthorSelect={onAuthorSelect}
          activeAuthor={activeAuthor}
        />
        <CitationYearChart entries={citation.sourceAgeSpread} />
      </div>

      {citation.coveragePrompts.length ? (
        <section className="ri-citation-next" aria-label="Citation next steps">
          <p className="ri-eyebrow">Next steps</p>
          <ul>
            {citation.coveragePrompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
