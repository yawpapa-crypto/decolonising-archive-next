"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Send } from "lucide-react";

const SENT_FEEDBACK_MS = 1600;

export type WorkbenchCanvasSendToDocumentButtonProps = {
  onSend: () => void;
  disabled?: boolean;
  variant?: "topbar" | "inspector";
  className?: string;
};

export function WorkbenchCanvasSendToDocumentButton({
  onSend,
  disabled = false,
  variant = "inspector",
  className = "",
}: WorkbenchCanvasSendToDocumentButtonProps) {
  const [sent, setSent] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (disabled || sent) return;
    onSend();
    setSent(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setSent(false), SENT_FEEDBACK_MS);
  };

  const baseClass =
    variant === "topbar"
      ? "workbench-research-canvas-topbar-btn workbench-research-canvas-topbar-icon-btn workbench-research-canvas-topbar-btn--primary"
      : "workbench-research-canvas-btn workbench-research-canvas-btn--primary";

  return (
    <button
      type="button"
      className={[
        baseClass,
        "workbench-canvas-send-doc-btn",
        sent ? "is-sent" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      aria-live="polite"
      aria-label={sent ? "Sent to document" : "Send to document"}
      onClick={handleClick}
    >
      {sent ? (
        <Check size={variant === "topbar" ? 16 : 16} strokeWidth={2.25} aria-hidden />
      ) : (
        <Send size={variant === "topbar" ? 16 : 16} strokeWidth={1.75} aria-hidden />
      )}
      {variant === "topbar" ? null : <span>{sent ? "Sent" : "Send to document"}</span>}
    </button>
  );
}
