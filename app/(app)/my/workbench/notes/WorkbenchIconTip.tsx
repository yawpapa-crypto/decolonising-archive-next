"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Short label shown on hover */
  tip: string;
  /** Optional extra detail (second line) */
  info?: string;
  children: ReactNode;
  className?: string;
};

type TipPlacement = "above" | "below";

type TipPosition = {
  top: number;
  left: number;
  placement: TipPlacement;
};

const TIP_GAP = 8;
const TIP_ESTIMATED_HEIGHT = 44;

function computePosition(anchor: HTMLElement): TipPosition {
  const rect = anchor.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const roomBelow = window.innerHeight - rect.bottom - TIP_GAP;
  const roomAbove = rect.top - TIP_GAP;
  const placement: TipPlacement =
    roomBelow >= TIP_ESTIMATED_HEIGHT || roomBelow >= roomAbove ? "below" : "above";

  return {
    left: centerX,
    top: placement === "below" ? rect.bottom + TIP_GAP : rect.top - TIP_GAP,
    placement,
  };
}

/** Wraps icon controls with a portaled hover tooltip (escapes overflow clipping). */
export default function WorkbenchIconTip({ tip, info, children, className }: Props) {
  const tooltipId = useId();
  const hostRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<TipPosition | null>(null);

  const nativeTitle = info ? `${tip} — ${info}` : tip;

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncPosition = useCallback(() => {
    const anchor = hostRef.current;
    if (!anchor) return;
    setPosition(computePosition(anchor));
  }, []);

  const show = useCallback(() => {
    syncPosition();
    setVisible(true);
  }, [syncPosition]);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const handleBlur = useCallback((event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget;
    if (next && hostRef.current?.contains(next as Node)) return;
    hide();
  }, [hide]);

  useEffect(() => {
    if (!visible) return;

    const onScrollOrResize = () => syncPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [visible, syncPosition]);

  const popup =
    mounted && visible && position
      ? createPortal(
          <span
            id={tooltipId}
            className={`workbench-icon-tip__popup workbench-icon-tip__popup--portal is-${position.placement}`}
            role="tooltip"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <span className="workbench-icon-tip__title">{tip}</span>
            {info ? <span className="workbench-icon-tip__info">{info}</span> : null}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={hostRef}
        className={["workbench-icon-tip", className].filter(Boolean).join(" ")}
        title={nativeTitle}
        aria-describedby={visible ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={handleBlur}
      >
        {children}
      </span>
      {popup}
    </>
  );
}
