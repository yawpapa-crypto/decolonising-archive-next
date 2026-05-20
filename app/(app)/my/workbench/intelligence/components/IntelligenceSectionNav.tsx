"use client";

import {
  BookOpenText,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Network,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const INTELLIGENCE_SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sources", label: "Sources", icon: Network },
  { id: "geography", label: "Geography", icon: Globe2 },
  { id: "timeline", label: "Timeline", icon: LineChart },
  { id: "reviews", label: "Reviews", icon: ClipboardList },
  { id: "citations", label: "Citations", icon: BookOpenText },
  { id: "gaps", label: "Gaps", icon: Lightbulb },
] as const;

export type IntelligenceSectionId = (typeof INTELLIGENCE_SECTIONS)[number]["id"];

type Props = {
  active: IntelligenceSectionId;
  onNavigate: (id: IntelligenceSectionId) => void;
};

export default function IntelligenceSectionNav({ active, onNavigate }: Props) {
  return (
    <nav className="ri-dash-subnav" aria-label="Dashboard sections">
      <div className="ri-dash-subnav__track ri-dash-subnav__track--primary">
        {INTELLIGENCE_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={cn("ri-dash-subnav__item", active === id && "is-active")}
            aria-current={active === id ? "true" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={15} aria-hidden />
            <span className="ri-dash-subnav__label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
