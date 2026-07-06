"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { IntelligenceFacetFilters, IntelligenceFacets } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  facets: IntelligenceFacets;
  active: IntelligenceFacetFilters;
  onChange: (next: IntelligenceFacetFilters) => void;
  onClear: () => void;
  resultCount: number;
  openAccessPercent: number;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  variant?: "sidebar" | "drawer";
};

const OA_COLORS = ["#0f3d2e", "#94a3b8"];

function FacetCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ri-dash-facet-card", className)}>
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: Array<{ value: string; label: string; count: number }>;
  onChange: (value: string | null) => void;
}) {
  if (!options.length) return null;
  return (
    <label className="ri-facet">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Any</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} ({opt.count})
          </option>
        ))}
      </select>
    </label>
  );
}

export default function IntelligenceFacetsPanel({
  facets,
  active,
  onChange,
  onClear,
  resultCount,
  openAccessPercent,
  drawerOpen = false,
  onDrawerClose,
  variant = "sidebar",
}: Props) {
  const hasActive = Object.values(active).some((v) => v != null && v !== false);

  const yearChart = facets.years.slice(0, 8).map((y) => ({ name: y.label, count: y.count }));
  const openData = [
    { name: "Open", value: openAccessPercent },
    { name: "Other", value: Math.max(0, 100 - openAccessPercent) },
  ];

  const panel = (
    <>
      <div className="ri-facets__head">
        <div>
          <h3>Filters</h3>
          <p className="ri-dash-facets__count">{resultCount.toLocaleString()} results</p>
        </div>
        <div className="ri-facets__head-actions">
          {hasActive ? (
            <button type="button" className="ri-facets__clear" onClick={onClear}>
              Clear
            </button>
          ) : null}
          {variant === "drawer" && onDrawerClose ? (
            <button type="button" className="ri-btn ri-btn--ghost" onClick={onDrawerClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="ri-dash-facet-grid">
        {yearChart.length ? (
          <FacetCard title="Year">
            <div className="ri-dash-mini-chart">
              <ResponsiveContainer width="100%" height={88}>
                <BarChart data={yearChart} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <Tooltip cursor={{ fill: "rgba(15,61,46,0.06)" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {yearChart.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={active.year === entry.name ? "#0f3d2e" : "rgba(15,61,46,0.35)"}
                        onClick={() =>
                          onChange({
                            ...active,
                            year: active.year === entry.name ? null : entry.name,
                          })
                        }
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FacetCard>
        ) : null}

        <FacetCard title="Open access">
          <div className="ri-dash-donut">
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie
                  data={openData}
                  innerRadius={28}
                  outerRadius={42}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {openData.map((_, i) => (
                    <Cell key={i} fill={OA_COLORS[i % OA_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="ri-dash-donut__label">{openAccessPercent}%</span>
          </div>
          <label className="ri-facet">
            <span>Access</span>
            <select
              value={active.openAccess ?? ""}
              onChange={(e) =>
                onChange({
                  ...active,
                  openAccess: (e.target.value || null) as IntelligenceFacetFilters["openAccess"],
                })
              }
            >
              <option value="">Any</option>
              <option value="open">Open access</option>
              <option value="closed">Restricted</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </FacetCard>

        <FacetCard title="Filters" className="ri-dash-facet-card--stack">
          <FacetSelect
            label="Type"
            value={active.type}
            options={facets.types}
            onChange={(type) => onChange({ ...active, type })}
          />
          <FacetSelect
            label="Field / theme"
            value={active.theme}
            options={facets.themes}
            onChange={(theme) => onChange({ ...active, theme })}
          />
          <FacetSelect
            label="Author / creator"
            value={active.creator}
            options={facets.creators}
            onChange={(creator) => onChange({ ...active, creator })}
          />
          <FacetSelect
            label="Institution"
            value={active.institution}
            options={facets.institutions}
            onChange={(institution) => onChange({ ...active, institution })}
          />
          <FacetSelect
            label="Country"
            value={active.country}
            options={facets.countries}
            onChange={(country) => onChange({ ...active, country, city: null })}
          />
          <FacetSelect
            label="Region"
            value={active.region}
            options={facets.regions}
            onChange={(region) => onChange({ ...active, region })}
          />
          <FacetSelect
            label="City / place"
            value={active.city}
            options={facets.cities}
            onChange={(city) => onChange({ ...active, city })}
          />
          <label className="ri-facet">
            <span>Diaspora</span>
            <select
              value={active.diaspora === true ? "yes" : active.diaspora === false ? "no" : ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange({
                  ...active,
                  diaspora: val === "yes" ? true : val === "no" ? false : null,
                });
              }}
            >
              <option value="">Any</option>
              <option value="yes">Diaspora records</option>
              <option value="no">Non-diaspora</option>
            </select>
          </label>
          <FacetSelect
            label="Source database"
            value={active.sourceDatabase}
            options={facets.sourceDatabases}
            onChange={(sourceDatabase) => onChange({ ...active, sourceDatabase })}
          />
          <FacetSelect
            label="Status"
            value={active.status ?? null}
            options={facets.statuses.map((s) => ({ ...s, label: s.label.replace(/_/g, " ") }))}
            onChange={(status) =>
              onChange({
                ...active,
                status: (status || null) as IntelligenceFacetFilters["status"],
              })
            }
          />
        </FacetCard>
      </div>
    </>
  );

  if (variant === "drawer") {
    return (
      <div
        className={cn("ri-facet-drawer", drawerOpen && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-label="Record filters"
      >
        <button type="button" className="ri-facet-drawer__backdrop" aria-label="Close filters" onClick={onDrawerClose} />
        <aside className="ri-dash-facets ri-dash-facets--drawer">{panel}</aside>
      </div>
    );
  }

  return (
    <aside className="ri-dash-facets ri-dash-facets--sidebar" aria-label="Faceted search">
      {panel}
    </aside>
  );
}
