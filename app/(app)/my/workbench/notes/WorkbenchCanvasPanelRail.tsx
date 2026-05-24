"use client";

import { LayoutTemplate, PanelRight, Sparkles, SlidersHorizontal, Wand2 } from "lucide-react";
import type { CanvasPanelTab } from "./workbench-canvas-panel-types";
import WorkbenchIconTip from "./WorkbenchIconTip";

const RAIL_ITEMS: { id: CanvasPanelTab; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <LayoutTemplate size={18} /> },
  { id: "inspect", label: "Inspect", icon: <SlidersHorizontal size={18} /> },
  { id: "theme", label: "Theme", icon: <Sparkles size={18} /> },
  { id: "smart", label: "Smart organise", icon: <Wand2 size={18} /> },
];

export type WorkbenchCanvasPanelRailProps = {
  activeTab: CanvasPanelTab;
  hasSelection: boolean;
  onSelectTab: (tab: CanvasPanelTab) => void;
  onExpand: () => void;
};

export function WorkbenchCanvasPanelRail({
  activeTab,
  hasSelection,
  onSelectTab,
  onExpand,
}: WorkbenchCanvasPanelRailProps) {
  return (
    <nav className="workbench-canvas-panel-rail" aria-label="Canvas panel">
      {RAIL_ITEMS.map((item) => (
        <WorkbenchIconTip key={item.id} tip={item.label} variant="canvas">
          <button
            type="button"
            className={`workbench-canvas-panel-rail__btn${
              activeTab === item.id ? " is-active" : ""
            }${item.id === "inspect" && hasSelection ? " has-badge" : ""}`}
            aria-label={item.label}
            aria-pressed={activeTab === item.id}
            onClick={() => {
              onSelectTab(item.id);
              onExpand();
            }}
          >
            {item.icon}
          </button>
        </WorkbenchIconTip>
      ))}
      <WorkbenchIconTip tip="Expand panel" variant="canvas">
        <button
          type="button"
          className="workbench-canvas-panel-rail__btn workbench-canvas-panel-rail__btn--expand"
          aria-label="Expand panel"
          onClick={onExpand}
        >
          <PanelRight size={18} aria-hidden />
        </button>
      </WorkbenchIconTip>
    </nav>
  );
}
