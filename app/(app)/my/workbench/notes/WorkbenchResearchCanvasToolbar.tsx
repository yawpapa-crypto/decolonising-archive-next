"use client";

import type { CanvasToolId } from "./workbench-canvas-types";
import { CANVAS_TOOL_GROUPS } from "./workbench-canvas-tool-groups";
import WorkbenchIconTip from "./WorkbenchIconTip";

export type WorkbenchResearchCanvasToolbarProps = {
  activeTool: CanvasToolId;
  canEdit: boolean;
  hidden?: boolean;
  onSelectTool: (tool: CanvasToolId) => void;
};

export function WorkbenchResearchCanvasToolbar({
  activeTool,
  canEdit,
  hidden = false,
  onSelectTool,
}: WorkbenchResearchCanvasToolbarProps) {
  return (
    <aside
      className={`workbench-research-canvas-toolbar${hidden ? " is-hidden" : ""}`}
      aria-label="Canvas tools"
    >
      {CANVAS_TOOL_GROUPS.map((group, groupIndex) => (
        <div key={group.id} className="workbench-research-canvas-toolbar-group">
          {groupIndex > 0 ? (
            <span className="workbench-research-canvas-toolbar-divider" aria-hidden />
          ) : null}
          <p className="workbench-research-canvas-toolbar-group-label">{group.label}</p>
          <div className="workbench-research-canvas-toolbar-tools">
            {group.tools.map((tool) => (
              <WorkbenchIconTip key={tool.id} tip={tool.label} variant="canvas">
                <button
                  type="button"
                  className={`workbench-research-canvas-tool${
                    activeTool === tool.id ? " is-active" : ""
                  }`}
                  aria-label={tool.label}
                  aria-pressed={activeTool === tool.id}
                  disabled={!canEdit && tool.id !== "select" && tool.id !== "pan"}
                  onClick={() => onSelectTool(tool.id)}
                >
                  {tool.icon}
                </button>
              </WorkbenchIconTip>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
