"use client";

import { X } from "lucide-react";
import type { IntelligenceActiveFilterChip } from "@/lib/workbench-intelligence-client";
import { cn } from "@/lib/cn";

type Props = {
  chips: IntelligenceActiveFilterChip[];
  resultCount: number;
  onClear: () => void;
  className?: string;
};

export default function IntelligenceActiveFilterBar({
  chips,
  resultCount,
  onClear,
  className,
}: Props) {
  if (!chips.length) return null;

  return (
    <div className={cn("ri-active-filters", className)} aria-live="polite">
      <div className="ri-active-filters__meta">
        <strong>{resultCount.toLocaleString()}</strong>
        <span>matching records</span>
      </div>
      <ul className="ri-active-filters__chips">
        {chips.map((chip) => (
          <li key={chip.id}>
            <span className="ri-active-filters__chip">{chip.label}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="ri-active-filters__clear" onClick={onClear}>
        <X size={14} aria-hidden />
        Clear filter
      </button>
    </div>
  );
}
