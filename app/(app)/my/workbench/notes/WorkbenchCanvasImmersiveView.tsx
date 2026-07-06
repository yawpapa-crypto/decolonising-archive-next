"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import WorkbenchResearchCanvas, {
  type WorkbenchResearchCanvasProps,
} from "./WorkbenchResearchCanvas";

/** @deprecated Top chrome moved into canvas — use `shell` on WorkbenchResearchCanvas instead. */
export type WorkbenchCanvasImmersiveChromeProps = NonNullable<
  WorkbenchResearchCanvasProps["shell"]
>;

export type WorkbenchCanvasImmersiveViewProps = WorkbenchResearchCanvasProps;

export function WorkbenchCanvasImmersiveView({
  ...canvasProps
}: WorkbenchCanvasImmersiveViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("workbench-canvas-immersive");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("workbench-canvas-immersive");
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const immersiveElement = (
    <div
      className="workbench-canvas-immersive is-immersive is-fullscreen"
      role="presentation"
      data-workbench-canvas-immersive
    >
      <WorkbenchResearchCanvas {...canvasProps} />
    </div>
  );

  if (!isMounted) return null;

  return createPortal(immersiveElement, document.body);
}
