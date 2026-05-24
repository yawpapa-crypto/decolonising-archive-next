"use client";

import type { ReactNode } from "react";

/** Stacks project header + top bar in one column — no absolute overlap. */
export function WorkbenchResearchCanvasChrome({ children }: { children: ReactNode }) {
  return <div className="workbench-research-canvas-chrome">{children}</div>;
}
