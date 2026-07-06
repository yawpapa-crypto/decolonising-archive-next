"use client";

import { useState } from "react";
import { CalendarDays, FolderKanban, LayoutGrid, MessagesSquare } from "lucide-react";
import AdminKanbanBoard from "./AdminKanbanBoard";
import AdminCalendarPanel from "./AdminCalendarPanel";
import AdminProjectsPanel from "./AdminProjectsPanel";
import AdminTeamChat from "./AdminTeamChat";

const TABS = [
  { id: "kanban", label: "Kanban", icon: FolderKanban },
  { id: "projects", label: "Projects", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "chat", label: "Chat", icon: MessagesSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminAppsHub({ adminUserId }: { adminUserId: string }) {
  const [tab, setTab] = useState<TabId>("kanban");

  return (
    <section className="admin-apps-hub" aria-label="Applications">
      <div className="admin-panel-label">Applications</div>
      <h2 className="admin-section-title">Kanban, projects, calendar &amp; chat</h2>
      <p className="admin-muted admin-apps-intro">
        Workspace tools are saved to the dashboard and available when you return.
      </p>

      <div className="admin-apps-tabs" role="tablist" aria-label="Application areas">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`admin-apps-tab ${active ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="admin-apps-panel" role="tabpanel">
        {tab === "kanban" ? <AdminKanbanBoard /> : null}
        {tab === "projects" ? <AdminProjectsPanel /> : null}
        {tab === "calendar" ? <AdminCalendarPanel /> : null}
        {tab === "chat" ? <AdminTeamChat adminUserId={adminUserId} /> : null}
      </div>
    </section>
  );
}
