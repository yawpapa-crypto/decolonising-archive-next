"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const INTELLIGENCE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "geography", label: "Geography" },
  { id: "timeline", label: "Timeline" },
  { id: "reviews", label: "Reviews" },
  { id: "citations", label: "Citations" },
  { id: "recommendations", label: "Recommendations" },
  { id: "records", label: "Records" },
] as const;

export type IntelligenceSectionId = (typeof INTELLIGENCE_SECTIONS)[number]["id"];

type Props = {
  active: IntelligenceSectionId;
  onChange: (id: IntelligenceSectionId) => void;
};

export default function IntelligenceSectionSwitcher({ active, onChange }: Props) {
  return (
    <div className="ri-section-switcher">
      <label className="ri-section-switcher__label" htmlFor="ri-intelligence-section">
        Section
      </label>
      <div className={cn("ri-section-switcher__control")}>
        <select
          id="ri-intelligence-section"
          className="ri-section-switcher__select"
          value={active}
          aria-label="Research intelligence section"
          onChange={(event) => onChange(event.target.value as IntelligenceSectionId)}
        >
          {INTELLIGENCE_SECTIONS.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} strokeWidth={2} className="ri-section-switcher__chevron" aria-hidden />
      </div>
    </div>
  );
}
