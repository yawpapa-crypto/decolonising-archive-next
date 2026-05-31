"use client";

import type { AdminDateRange } from "@/app/(admin)/admin/workspace-preferences/types";

const OPTIONS: { id: AdminDateRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

type Props = {
  value: AdminDateRange;
  onChange: (range: AdminDateRange) => void;
  disabled?: boolean;
};

export default function AdminAnalyticsDateRange({ value, onChange, disabled }: Props) {
  return (
    <div className="admin-date-range" role="group" aria-label="Date range">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`admin-date-range-btn ${value === opt.id ? "is-active" : ""}`}
          aria-pressed={value === opt.id}
          disabled={disabled}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
