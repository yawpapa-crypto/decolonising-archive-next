"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import type { IntelligenceActivityEntry } from "@/lib/workbench-intelligence-types";

type Props = {
  entries: IntelligenceActivityEntry[];
};

const VISIBLE = 8;

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function IntelligenceActivityFeed({ entries }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, VISIBLE);

  return (
    <details className="ri-activity-block">
      <summary className="ri-activity-block__summary">
        <span>
          <Activity size={15} aria-hidden /> Recent activity ({entries.length})
        </span>
      </summary>
      {entries.length ? (
        <>
          <ol className="ri-activity-feed ri-activity-feed--compact">
            {visible.map((entry) => (
              <li key={entry.id} className="ri-activity-item">
                <div className="ri-activity-item__body">
                  <strong>{entry.label}</strong>
                  <span>{relativeTime(entry.createdAt)}</span>
                </div>
              </li>
            ))}
          </ol>
          {entries.length > VISIBLE ? (
            <button
              type="button"
              className="ri-btn ri-btn--ghost ri-activity-block__more"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Show less" : `Show ${entries.length - VISIBLE} more`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="ri-muted">Activity appears as you save, cite, and organise records.</p>
      )}
    </details>
  );
}
