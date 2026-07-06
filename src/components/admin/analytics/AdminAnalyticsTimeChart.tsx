"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminAnalyticsEmptyState from "./AdminAnalyticsEmptyState";

type Point = { label: string; count: number };

type Props = {
  data: Point[];
  emptyTitle?: string;
  emptyHint?: string;
  variant?: "area" | "bar";
  height?: number;
};

const TOOLTIP_STYLE = {
  border: "1px solid #e5e5e0",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

export default function AdminAnalyticsTimeChart({
  data,
  emptyTitle = "No data yet",
  emptyHint = "Activity will appear here once events are logged.",
  variant = "area",
  height = 220,
}: Props) {
  const hasData = data.some((d) => d.count > 0);
  const chartData = data.map((d) => ({ name: d.label, count: d.count }));

  if (!hasData) {
    return <AdminAnalyticsEmptyState title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <div className="admin-line-chart">
      <ResponsiveContainer width="100%" height={height}>
        {variant === "bar" ? (
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#ececea" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b6b66" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b6b66" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#1a1a18" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="adminAnalyticsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4c017" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#d4c017" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ececea" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b6b66" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b6b66" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="count" stroke="#1a1a18" fill="url(#adminAnalyticsArea)" strokeWidth={2} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
