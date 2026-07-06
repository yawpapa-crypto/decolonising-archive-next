"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const weekly = [
  { name: "Mon", v: 12 },
  { name: "Tue", v: 19 },
  { name: "Wed", v: 14 },
  { name: "Thu", v: 22 },
  { name: "Fri", v: 18 },
  { name: "Sat", v: 9 },
  { name: "Sun", v: 11 },
];

const mix = [
  { name: "Pages", value: 32 },
  { name: "Records", value: 48 },
  { name: "Users", value: 14 },
  { name: "Other", value: 6 },
];

const DONUT_COLORS = ["#111111", "#4b5563", "#9ca3af", "#d1d5db"];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card-head">
        <h3 className="admin-chart-card-title">{title}</h3>
        {subtitle ? <p className="admin-chart-card-sub">{subtitle}</p> : null}
      </div>
      <div className="admin-chart-card-body">{children}</div>
    </div>
  );
}

export default function AdminChartsShowcase() {
  return (
    <section className="admin-charts-showcase" aria-label="Analytics charts">
      <div className="admin-panel-label">Visual analytics</div>
      <h2 className="admin-section-title">Line, bar, area &amp; donut</h2>
      <p className="admin-muted admin-chart-intro">
        Minimal monochrome palette — black, gray, and light gray — suitable for editorial
        reporting. Charts resize with the grid on smaller screens.
      </p>

      <div className="admin-charts-grid">
        <ChartCard title="Line" subtitle="Weekly activity index">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="v" stroke="#111111" strokeWidth={2} dot={{ r: 3, fill: "#111" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bar" subtitle="Same series, bars">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="v" fill="#111111" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Area" subtitle="Filled trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="adminAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="v" stroke="#111111" fill="url(#adminAreaFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Donut" subtitle="Composition">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={mix}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={78}
                paddingAngle={2}
              >
                {mix.map((_, i) => (
                  <Cell key={mix[i].name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="admin-chart-legend">
            {mix.map((row, i) => (
              <li key={row.name}>
                <span className="admin-chart-legend-swatch" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {row.name} · {row.value}
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </section>
  );
}
