"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Layout,
  MessageSquare,
  Search,
  ShieldAlert,
  User,
  Wrench,
} from "lucide-react";

type ActivityEvent = Record<string, unknown> & {
  profile?: Record<string, unknown> | null;
};

function displayUser(profile: Record<string, unknown> | null | undefined) {
  if (!profile) return "Anonymous";
  return (
    (profile.display_name as string) ||
    (profile.full_name as string) ||
    (profile.email as string) ||
    "Member"
  );
}

function timeAgo(value: string | null | undefined, now: number) {
  if (!value) return "—";
  const diff = now - new Date(value).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return formatStableDate(value);
}

function formatStableDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function areaIcon(area: string) {
  const a = area.toLowerCase();
  if (a.includes("library") || a.includes("search")) return Search;
  if (a.includes("workbench")) return Wrench;
  if (a.includes("community")) return MessageSquare;
  if (a.includes("source")) return ShieldAlert;
  if (a.includes("library")) return BookOpen;
  if (a.includes("canvas") || a.includes("board")) return Layout;
  return User;
}

function describeEvent(event: ActivityEvent) {
  const query = event.query as string | undefined;
  const action = event.action as string | undefined;
  const area = event.area as string | undefined;
  const eventType = event.event_type as string | undefined;
  if (query) return `searched “${query}”`;
  if (action && area) return `${action} · ${area}`;
  if (eventType) return eventType.replace(/_/g, " ");
  return "activity";
}

type Props = {
  events: ActivityEvent[];
  emptyTitle?: string;
  emptyHint?: string;
};

export default function AdminActivityStream({
  events,
  emptyTitle = "No activity yet",
  emptyHint = "Open the library, workbench, or community to generate events.",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  if (events.length === 0) {
    return (
      <div className="admin-activity-stream admin-activity-stream--empty">
        <p className="admin-analytics-empty-title">{emptyTitle}</p>
        <p className="admin-analytics-empty-hint">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="admin-activity-stream">
      {events.map((event) => {
        const area = String(event.area || "platform");
        const Icon = areaIcon(area);
        const profile = event.profile as Record<string, unknown> | null | undefined;
        const userId = profile?.id as string | undefined;
        const name = displayUser(profile);

        return (
          <li key={String(event.id)} className="admin-activity-stream-item">
            <span className="admin-activity-stream-icon" aria-hidden>
              <Icon size={14} strokeWidth={1.75} />
            </span>
            <div className="admin-activity-stream-body">
              <p className="admin-activity-stream-text">
                {userId ? (
                  <Link href={`/admin/users/${userId}`} className="admin-user-link">
                    {name}
                  </Link>
                ) : (
                  <span>{name}</span>
                )}{" "}
                {describeEvent(event)}
              </p>
              <p className="admin-activity-stream-meta">
                <span>{area}</span>
                {event.path ? <span>{String(event.path)}</span> : null}
                <time dateTime={String(event.created_at)}>
                  {mounted && now ? timeAgo(event.created_at as string, now) : ""}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
