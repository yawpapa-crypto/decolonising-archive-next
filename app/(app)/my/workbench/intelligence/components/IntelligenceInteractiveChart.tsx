"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IntelligenceDistributionEntry } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

const CHART_PALETTE = [
  "#0f3d2e",
  "#2563eb",
  "#0d9488",
  "#64748b",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#0369a1",
  "#475569",
  "#15803d",
];

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; count?: number; percent?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as { name?: string; count?: number; percent?: number };
  if (!entry?.name) return null;
  return (
    <div className="ri-chart-tooltip">
      <strong>{entry.name}</strong>
      <span>
        {entry.count?.toLocaleString() ?? 0}
        {entry.percent != null ? ` · ${entry.percent}%` : ""}
      </span>
    </div>
  );
}

type Props = {
  title: string;
  entries: IntelligenceDistributionEntry[];
  variant?: "bar" | "pie";
  activeKey?: string | null;
  onSelect?: (label: string | null) => void;
  emptyLabel?: string;
  maxItems?: number;
  className?: string;
};

export default function IntelligenceInteractiveChart({
  title,
  entries,
  variant = "bar",
  activeKey = null,
  onSelect,
  emptyLabel = "No data yet.",
  maxItems = 8,
  className,
}: Props) {
  const visible = entries.slice(0, maxItems);
  const chartData = visible.map((entry) => ({
    name: entry.label,
    count: entry.count,
    percent: entry.percent,
  }));

  const interactive = Boolean(onSelect);

  return (
    <section className={cn("ri-panel ri-dist-panel ri-dist-panel--interactive", className)} aria-label={title}>
      <h3 className="ri-section-title">{title}</h3>
      {visible.length ? (
        <>
          {variant === "pie" ? (
            <div className="ri-chart-wrap ri-chart-wrap--pie">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={2}
                    isAnimationActive={false}
                    onClick={(data) => {
                      if (!interactive || !data?.name) return;
                      onSelect?.(activeKey === data.name ? null : String(data.name));
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        opacity={activeKey && activeKey !== entry.name ? 0.45 : 1}
                        style={{ cursor: interactive ? "pointer" : "default" }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="ri-chart-wrap">
              <ResponsiveContainer width="100%" height={Math.max(140, visible.length * 32)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                >
                  <XAxis type="number" hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ fontSize: 11, fill: "rgba(15,17,15,0.72)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,61,46,0.06)" }} />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                    onClick={(data) => {
                      if (!interactive || !data?.name) return;
                      onSelect?.(activeKey === data.name ? null : String(data.name));
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={activeKey === entry.name ? "#0f3d2e" : CHART_PALETTE[index % CHART_PALETTE.length]}
                        opacity={activeKey && activeKey !== entry.name ? 0.45 : 1}
                        style={{ cursor: interactive ? "pointer" : "default" }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="ri-chart-legend">
            {visible.map((entry, index) => (
              <li key={entry.label}>
                <button
                  type="button"
                  className={cn("ri-chart-legend__item", activeKey === entry.label && "is-active")}
                  onClick={() => onSelect?.(activeKey === entry.label ? null : entry.label)}
                  disabled={!interactive}
                >
                  <span
                    className="ri-chart-legend__swatch"
                    style={{ background: CHART_PALETTE[index % CHART_PALETTE.length] }}
                    aria-hidden
                  />
                  <span>{entry.label}</span>
                  <strong>{entry.count}</strong>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="ri-empty-note">{emptyLabel}</p>
      )}
    </section>
  );
}
