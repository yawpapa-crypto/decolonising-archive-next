"use client";

import type { ReactNode } from "react";

export function linkHostname(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export type ObjectCardAccent =
  | "link"
  | "comment"
  | "question"
  | "citation"
  | "source"
  | "quote"
  | "task"
  | "image"
  | "frame"
  | "text"
  | "sticky";

export type ObjectCardShellProps = {
  typeLabel: string;
  icon: ReactNode;
  accent: ObjectCardAccent;
  className?: string;
  headExtra?: ReactNode;
  children: ReactNode;
};

export function ObjectCardShell({
  typeLabel,
  icon,
  accent,
  className = "",
  headExtra,
  children,
}: ObjectCardShellProps) {
  return (
    <div
      className={[
        "workbench-research-canvas-object-card",
        `is-accent-${accent}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="workbench-research-canvas-object-card__head">
        <span className={`workbench-research-canvas-object-card__icon is-accent-${accent}`}>
          {icon}
        </span>
        <span className="workbench-research-canvas-object-card__type">{typeLabel}</span>
        {headExtra ? (
          <div className="workbench-research-canvas-object-card__head-extra">{headExtra}</div>
        ) : null}
      </div>
      <div className="workbench-research-canvas-object-card__body">{children}</div>
    </div>
  );
}
