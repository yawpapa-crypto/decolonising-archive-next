"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  Pin,
  PinOff,
  Search,
  Settings,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { refreshAdminWorkspaceSnapshot } from "@/app/(admin)/admin/analytics/actions";
import {
  saveActiveTab,
  saveDateRange,
  togglePinnedTool,
} from "@/app/(admin)/admin/workspace-preferences/actions";
import type {
  AdminDashboardPreferences,
  AdminDateRange,
  AdminWorkspaceTabId,
  AdminWorkspaceToolId,
} from "@/app/(admin)/admin/workspace-preferences/types";
import type { AdminWorkspaceSnapshot } from "@/lib/admin-workspace-snapshot";
import AdminActivityStream from "./analytics/AdminActivityStream";
import AdminAnalyticsChartCard from "./analytics/AdminAnalyticsChartCard";
import AdminAnalyticsDateRange from "./analytics/AdminAnalyticsDateRange";
import AdminAnalyticsLivePill from "./analytics/AdminAnalyticsLivePill";
import AdminAnalyticsRankedList from "./analytics/AdminAnalyticsRankedList";
import AdminAnalyticsStatCard from "./analytics/AdminAnalyticsStatCard";
import AdminAnalyticsTimeChart from "./analytics/AdminAnalyticsTimeChart";
import AdminCalendarPanel from "./AdminCalendarPanel";
import AdminKanbanBoard from "./AdminKanbanBoard";
import AdminProjectsPanel from "./AdminProjectsPanel";
import AdminTeamChat from "./AdminTeamChat";

const POLL_MS = 15_000;

const TABS: { id: AdminWorkspaceTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "users", label: "Users" },
  { id: "searches", label: "Searches" },
  { id: "projects", label: "Projects" },
  { id: "calendar", label: "Calendar" },
  { id: "chat", label: "Chat" },
  { id: "errors", label: "Errors" },
  { id: "settings", label: "Settings" },
];

const TOOLS: {
  id: AdminWorkspaceToolId;
  tab: AdminWorkspaceTabId;
  label: string;
  description: string;
  icon: typeof BarChart3;
  countKey: keyof AdminWorkspaceSnapshot["toolCounts"];
}[] = [
  { id: "analytics", tab: "overview", label: "Analytics", description: "Live metrics and usage overview", icon: BarChart3, countKey: "analytics" },
  { id: "kanban", tab: "projects", label: "Kanban", description: "Platform work board", icon: FolderKanban, countKey: "kanban" },
  { id: "projects", tab: "projects", label: "Projects", description: "Operational project tracking", icon: LayoutGrid, countKey: "projects" },
  { id: "calendar", tab: "calendar", label: "Calendar", description: "Due dates and milestones", icon: CalendarDays, countKey: "calendar" },
  { id: "chat", tab: "chat", label: "Chat", description: "Admin team messaging", icon: MessageSquare, countKey: "chat" },
  { id: "errors", tab: "errors", label: "Errors", description: "App failures and source issues", icon: ShieldAlert, countKey: "errors" },
  { id: "users", tab: "users", label: "Users", description: "Member activity analytics", icon: Users, countKey: "users" },
  { id: "searches", tab: "searches", label: "Searches", description: "Library search trends", icon: Search, countKey: "searches" },
];

type Props = {
  adminUserId: string;
  snapshot: AdminWorkspaceSnapshot;
  initialPreferences: AdminDashboardPreferences;
  /** Passed from server layout; purely for display — the bell is in AdminAppShell */
  unreadNotifications?: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function displayUser(profile: Record<string, unknown> | null | undefined) {
  if (!profile) return "Anonymous";
  return (
    (profile.display_name as string) ||
    (profile.full_name as string) ||
    (profile.email as string) ||
    "Member"
  );
}

function UserLink({ profile }: { profile: Record<string, unknown> | null | undefined }) {
  const id = profile?.id as string | undefined;
  if (!id) return <span>{displayUser(profile)}</span>;
  return (
    <Link href={`/admin/users/${id}`} className="admin-user-link">
      {displayUser(profile)}
    </Link>
  );
}

export default function AdminWorkspaceShell({
  adminUserId,
  snapshot: initialSnapshot,
  initialPreferences,
  unreadNotifications: _unreadNotifications,
}: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [tab, setTab] = useState<AdminWorkspaceTabId>(initialPreferences.active_tab);
  const [pinned, setPinned] = useState<AdminWorkspaceToolId[]>(initialPreferences.pinned_tools);
  const [dateRange, setDateRange] = useState<AdminDateRange>(initialPreferences.date_range);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();

  const tableErrors = Object.values(snapshot.tableErrors).filter(Boolean);

  const refresh = useCallback(async (range: AdminDateRange) => {
    setRefreshing(true);
    try {
      const next = await refreshAdminWorkspaceSnapshot(range);
      setSnapshot(next);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh(dateRange);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [dateRange, refresh]);

  const changeTab = useCallback((next: AdminWorkspaceTabId) => {
    setTab(next);
    startTransition(async () => {
      const res = await saveActiveTab(next);
      if (res.ok) {
        setPinned(res.data.pinned_tools);
        setDateRange(res.data.date_range);
      }
    });
  }, []);

  const handlePin = useCallback((toolId: AdminWorkspaceToolId) => {
    startTransition(async () => {
      const res = await togglePinnedTool(toolId);
      if (res.ok) {
        setPinned(res.data.pinned_tools);
        setTab(res.data.active_tab);
      }
    });
  }, []);

  const handleDateRange = useCallback(
    (range: AdminDateRange) => {
      setDateRange(range);
      startTransition(async () => {
        const pref = await saveDateRange(range);
        if (pref.ok) setDateRange(pref.data.date_range);
        await refresh(range);
      });
    },
    [refresh],
  );

  const pinnedTools = useMemo(() => TOOLS.filter((tool) => pinned.includes(tool.id)), [pinned]);
  const rangeLabel =
    dateRange === "today" ? "today" : dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "all time";

  return (
    <div className="admin-analytics-page admin-workspace">
      <header className="admin-analytics-header">
        <div className="admin-analytics-header-main">
          <p className="admin-kicker">Command centre</p>
          <h1>Admin Analytics</h1>
          <p className="admin-subtext">
            Live platform analytics, user activity, search trends, errors, and workspace tools.
          </p>
        </div>
        <div className="admin-analytics-header-tools">
          <AdminAnalyticsLivePill refreshing={refreshing} lastUpdated={snapshot.fetchedAt} />
          <AdminAnalyticsDateRange value={dateRange} onChange={handleDateRange} disabled={pending || refreshing} />
        </div>
      </header>

      <nav className="admin-workspace-tabs" role="tablist" aria-label="Workspace sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-workspace-tab ${tab === item.id ? "is-active" : ""}`}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tableErrors.length > 0 ? (
        <section className="admin-status-card is-warning">
          <strong>Some analytics tables could not be read.</strong>
          <p>{tableErrors.join(" ")}</p>
        </section>
      ) : null}

      {tab === "overview" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <section className="admin-stat-grid">
            <AdminAnalyticsStatCard label="Active now" value={snapshot.counts.activeNow} caption="Sessions in last 5 min" icon={Zap} accent="lemon" loading={refreshing} />
            <AdminAnalyticsStatCard label="Searches today" value={snapshot.counts.searchesToday} caption="Tracked library searches" icon={Search} loading={refreshing} />
            <AdminAnalyticsStatCard label="Events" value={snapshot.counts.totalEventsInRange} caption={`Activity in ${rangeLabel}`} icon={Activity} loading={refreshing} />
            <AdminAnalyticsStatCard label="Workbench" value={snapshot.counts.workbenchActionsInRange} caption={`Workbench events · ${rangeLabel}`} icon={BarChart3} loading={refreshing} />
            <AdminAnalyticsStatCard label="Open tasks" value={snapshot.counts.openTasks} caption="Kanban tasks not done" icon={FolderKanban} loading={refreshing} />
            <AdminAnalyticsStatCard label="Errors today" value={snapshot.counts.errorsToday} caption="App and source failures" icon={AlertTriangle} accent="danger" loading={refreshing} />
          </section>

          {pinnedTools.length > 0 ? (
            <section className="admin-dashboard-tools">
              <div className="admin-panel-label">Pinned tools</div>
              <ApplicationsGrid pinned={pinned} snapshot={snapshot} onOpen={changeTab} onPin={handlePin} pending={pending} filterPinned />
            </section>
          ) : null}

          <section className="admin-analytics-charts-grid">
            <AdminAnalyticsChartCard title="Searches over time" subtitle={`Search volume · ${rangeLabel}`}>
              <AdminAnalyticsTimeChart
                data={snapshot.searchesOverTime}
                emptyTitle="No search events yet"
                emptyHint="Run a library search to populate this chart."
              />
            </AdminAnalyticsChartCard>
            <AdminAnalyticsChartCard title="Feature usage" subtitle={`By area · ${rangeLabel}`}>
              <AdminAnalyticsRankedList
                items={snapshot.featureUsage}
                emptyTitle="No feature events yet"
                emptyHint="Browse the library, workbench, or community to generate usage."
              />
            </AdminAnalyticsChartCard>
            <AdminAnalyticsChartCard title="Top searches" subtitle={`Ranked queries · ${rangeLabel}`}>
              <AdminAnalyticsRankedList
                items={snapshot.topSearches}
                emptyTitle="No searches logged yet"
                emptyHint="Search queries will rank here once users search the library."
              />
            </AdminAnalyticsChartCard>
            <AdminAnalyticsChartCard title="Most active users" subtitle={`By event count · ${rangeLabel}`}>
              <AdminAnalyticsRankedList
                items={snapshot.mostActiveUsers}
                emptyTitle="No user activity yet"
                emptyHint="User rankings appear when members use the platform."
                onItemClick={(item) => item.userId && router.push(`/admin/users/${item.userId}`)}
              />
            </AdminAnalyticsChartCard>
          </section>

          <section className="admin-analytics-charts-grid admin-analytics-charts-grid--compact">
            <AdminAnalyticsChartCard title="Sessions over time" subtitle={`Active sessions · ${rangeLabel}`}>
              <AdminAnalyticsTimeChart
                data={snapshot.sessionsOverTime}
                variant="bar"
                emptyTitle="No sessions yet"
                emptyHint="Sessions appear when users browse the site."
              />
            </AdminAnalyticsChartCard>
            <AdminAnalyticsChartCard title="Error trends" subtitle={`Failures · ${rangeLabel}`}>
              <AdminAnalyticsTimeChart
                data={snapshot.errorsOverTime}
                variant="bar"
                emptyTitle="No errors logged"
                emptyHint="Error trends appear when failures are recorded."
              />
            </AdminAnalyticsChartCard>
          </section>

          <AdminAnalyticsChartCard title="Live activity stream" subtitle="Most recent platform events">
            <AdminActivityStream events={snapshot.activityStream as Record<string, unknown>[]} />
          </AdminAnalyticsChartCard>

          <ApplicationsGrid pinned={pinned} snapshot={snapshot} onOpen={changeTab} onPin={handlePin} pending={pending} />
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <AdminAnalyticsChartCard title="Activity feed" subtitle={`Last 40 events · ${rangeLabel}`}>
            <AdminActivityStream events={snapshot.activityStream as Record<string, unknown>[]} />
          </AdminAnalyticsChartCard>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <section className="admin-stat-grid admin-stat-grid--compact">
            <AdminAnalyticsStatCard label="Active now" value={snapshot.counts.activeNow} caption="Live sessions" icon={Zap} accent="lemon" />
            <AdminAnalyticsStatCard label="Total users" value={snapshot.counts.totalUsers} caption="Registered profiles" icon={Users} />
            <AdminAnalyticsStatCard label="New users" value={snapshot.counts.newUsersInRange} caption={`Joined · ${rangeLabel}`} icon={Users} />
          </section>
          <AdminAnalyticsChartCard title="Most active users" subtitle={rangeLabel}>
            <AdminAnalyticsRankedList
              items={snapshot.mostActiveUsers}
              onItemClick={(item) => item.userId && router.push(`/admin/users/${item.userId}`)}
            />
          </AdminAnalyticsChartCard>
          <article className="admin-surface">
            <h2 className="admin-section-title">All users</h2>
            {snapshot.users.length === 0 ? (
              <p className="admin-muted">No profile rows found.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Last seen</th>
                      <th>Sessions</th>
                      <th>Searches</th>
                      <th>Posts</th>
                      <th>Workbench</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.users.slice(0, 80).map((user) => {
                      const row = user as Record<string, unknown>;
                      return (
                        <tr key={String(row.id)}>
                          <td><UserLink profile={row} /></td>
                          <td>{String(row.role || "member")}</td>
                          <td>{formatDate(row.last_seen_at as string)}</td>
                          <td>{Number(row.sessionCount ?? 0)}</td>
                          <td>{Number(row.searchCount ?? 0)}</td>
                          <td>{Number(row.communityPostsCount ?? 0)}</td>
                          <td>{Number(row.workbenchActionsCount ?? 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {tab === "searches" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <section className="admin-stat-grid admin-stat-grid--compact">
            <AdminAnalyticsStatCard label="Searches today" value={snapshot.counts.searchesToday} caption="Since midnight" icon={Search} />
            <AdminAnalyticsStatCard label="In range" value={snapshot.counts.searchesInRange} caption={rangeLabel} icon={Search} />
            <AdminAnalyticsStatCard label="Failed" value={snapshot.searchAnalytics.failedCount} caption={rangeLabel} icon={AlertTriangle} accent="danger" />
            <AdminAnalyticsStatCard
              label="Avg duration"
              value={snapshot.searchAnalytics.avgDurationMs == null ? "—" : `${snapshot.searchAnalytics.avgDurationMs} ms`}
              caption="Round-trip"
              icon={BarChart3}
            />
          </section>
          <section className="admin-analytics-charts-grid">
            <AdminAnalyticsChartCard title="Searches over time" subtitle={rangeLabel}>
              <AdminAnalyticsTimeChart data={snapshot.searchesOverTime} emptyHint="Run a library search to populate this chart." />
            </AdminAnalyticsChartCard>
            <AdminAnalyticsChartCard title="Top searches" subtitle={rangeLabel}>
              <AdminAnalyticsRankedList items={snapshot.topSearches} emptyHint="Search terms rank here once logged." />
            </AdminAnalyticsChartCard>
          </section>
          <article className="admin-surface">
            <h2 className="admin-section-title">Recent searches</h2>
            {snapshot.recentSearches.length === 0 ? (
              <p className="admin-muted">No searches logged yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>User</th>
                      <th>Results</th>
                      <th>Local</th>
                      <th>External</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.recentSearches.map((search) => {
                      const row = search as Record<string, unknown>;
                      return (
                        <tr key={String(row.id)}>
                          <td>{String(row.query)}</td>
                          <td><UserLink profile={row.profile as Record<string, unknown>} /></td>
                          <td>{Number(row.result_count ?? 0)}</td>
                          <td>{Number(row.local_result_count ?? 0)}</td>
                          <td>{Number(row.external_result_count ?? 0)}</td>
                          <td>{row.duration_ms ? `${row.duration_ms} ms` : "—"}</td>
                          <td>{String(row.status)}</td>
                          <td>{formatDate(row.created_at as string)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {tab === "projects" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <section className="admin-surface admin-kanban-board-wrap">
            <div className="admin-panel-label">Kanban</div>
            <h2 className="admin-section-title">Task board</h2>
            <AdminKanbanBoard />
          </section>
          <section className="admin-surface"><AdminProjectsPanel /></section>
        </div>
      ) : null}

      {tab === "calendar" ? (
        <div className="admin-workspace-panel admin-calendar-panel" role="tabpanel">
          <AdminCalendarPanel />
        </div>
      ) : null}

      {tab === "chat" ? (
        <div className="admin-workspace-panel admin-chat-panel" role="tabpanel">
          <AdminTeamChat adminUserId={adminUserId} />
        </div>
      ) : null}

      {tab === "errors" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <section className="admin-stat-grid admin-stat-grid--compact">
            <AdminAnalyticsStatCard label="Errors today" value={snapshot.counts.errorsToday} caption="Since midnight" icon={AlertTriangle} accent="danger" />
            <AdminAnalyticsStatCard label="In range" value={snapshot.counts.errorsInRange} caption={rangeLabel} icon={ShieldAlert} accent="danger" />
          </section>
          <section className="admin-analytics-charts-grid">
            <AdminAnalyticsChartCard title="Errors over time" subtitle={rangeLabel}>
              <AdminAnalyticsTimeChart data={snapshot.errorsOverTime} variant="bar" emptyHint="No errors recorded in this period." />
            </AdminAnalyticsChartCard>
            <AdminAnalyticsChartCard title="Errors by area" subtitle={rangeLabel}>
              <AdminAnalyticsRankedList items={snapshot.errorsByArea} emptyHint="Error breakdown appears when failures are logged." />
            </AdminAnalyticsChartCard>
          </section>
          <section className="admin-grid-two">
            <article className="admin-surface">
              <h2 className="admin-section-title">Recent failures</h2>
              {snapshot.errors.length === 0 ? (
                <p className="admin-muted">No errors logged yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Area</th>
                        <th>Code</th>
                        <th>Message</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.errors.map((error) => {
                        const row = error as Record<string, unknown>;
                        return (
                          <tr key={String(row.id)}>
                            <td>{formatDate(row.created_at as string)}</td>
                            <td>{String(row.area || "app")}</td>
                            <td>{String(row.code || "—")}</td>
                            <td>{String(row.message)}</td>
                            <td><UserLink profile={row.profile as Record<string, unknown>} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
            <article className="admin-surface">
              <h2 className="admin-section-title">External source failures</h2>
              {snapshot.externalSourceFailures.length === 0 ? (
                <p className="admin-muted">No external fetch failures logged.</p>
              ) : (
                <ul className="admin-list admin-list-stack">
                  {snapshot.externalSourceFailures.map((row) => (
                    <li key={String(row.id)}>
                      <strong>{String(row.area || "external")}</strong>
                      <span>{String(row.message)}</span>
                      <span>{formatDate(row.created_at as string)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="admin-workspace-panel" role="tabpanel">
          <ApplicationsGrid pinned={pinned} snapshot={snapshot} onOpen={changeTab} onPin={handlePin} pending={pending} />
          <article className="admin-surface">
            <div className="admin-panel-label"><Settings size={14} aria-hidden /> Workspace settings</div>
            <p className="admin-muted">Pinned tools appear on Overview. Tab, date range, and pins persist when you return.</p>
            <p className="admin-muted">Tab: <strong>{tab}</strong> · Range: <strong>{rangeLabel}</strong> · Pinned: {pinned.length > 0 ? pinned.join(", ") : "none"}</p>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function ApplicationsGrid({
  pinned,
  snapshot,
  onOpen,
  onPin,
  pending,
  filterPinned = false,
}: {
  pinned: AdminWorkspaceToolId[];
  snapshot: AdminWorkspaceSnapshot;
  onOpen: (tab: AdminWorkspaceTabId) => void;
  onPin: (tool: AdminWorkspaceToolId) => void;
  pending: boolean;
  filterPinned?: boolean;
}) {
  const items = filterPinned ? TOOLS.filter((t) => pinned.includes(t.id)) : TOOLS;

  return (
    <section className="admin-app-grid admin-apps-hub">
      {!filterPinned ? (
        <>
          <div className="admin-panel-label">Applications</div>
          <h2 className="admin-section-title">Kanban, projects, calendar &amp; chat</h2>
          <p className="admin-muted admin-apps-intro">Workspace tools are saved to the dashboard and available when you return.</p>
        </>
      ) : null}
      <div className="admin-app-cards">
        {items.map((tool) => {
          const Icon = tool.icon;
          const isPinned = pinned.includes(tool.id);
          const count = snapshot.toolCounts[tool.countKey];
          return (
            <article key={tool.id} className={`admin-app-card ${isPinned ? "is-pinned" : ""}`}>
              <div className="admin-app-card-head">
                <span className="admin-app-card-icon"><Icon size={18} strokeWidth={1.75} aria-hidden /></span>
                <div>
                  <strong>{tool.label}</strong>
                  <p>{tool.description}</p>
                </div>
              </div>
              <div className="admin-app-card-meta">
                <span className="admin-app-card-count">{count}</span>
                <span className="admin-app-card-status">{count > 0 ? "Live" : "Empty"}</span>
              </div>
              <div className="admin-app-card-actions">
                <button type="button" className="admin-button admin-button-secondary" onClick={() => onOpen(tool.tab)}>Open</button>
                <button type="button" className="admin-button" disabled={pending} onClick={() => onPin(tool.id)} aria-pressed={isPinned}>
                  {isPinned ? <><PinOff size={14} aria-hidden /> Unpin</> : <><Pin size={14} aria-hidden /> Pin</>}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
