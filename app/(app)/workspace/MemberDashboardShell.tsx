import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  Bookmark,
  CircleHelp,
  LayoutDashboard,
  ListChecks,
  Search,
  Send,
  Settings,
  User,
} from "lucide-react";
import WorkspaceMobileNav from "./WorkspaceMobileNav";

export type MemberDashboardSection =
  | "overview"
  | "bookmarks"
  | "saved-searches"
  | "reading-lists"
  | "submissions"
  | "profile"
  | "notifications"
  | "help"
  | "settings";

type MemberDashboardShellProps = {
  children: ReactNode;
  currentSection: MemberDashboardSection;
  accountName: string;
  accountAvatarUrl?: string | null;
  roleLabel: string;
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "saved-searches", label: "Saved Searches", icon: Search },
  { id: "reading-lists", label: "Reading Lists", icon: ListChecks },
  { id: "submissions", label: "Submissions", icon: Send },
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "help", label: "Help Centre", icon: CircleHelp },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export const MEMBER_DASHBOARD_NAV_ITEMS = NAV_ITEMS;

export default function MemberDashboardShell({
  children,
  currentSection,
  accountName,
  accountAvatarUrl = null,
  roleLabel,
}: MemberDashboardShellProps) {
  return (
    <main className="dashboard-shell dashboard-shell--member workspace-app-shell member-dashboard member-dashboard-shell">
      <WorkspaceMobileNav
        currentSection={currentSection}
        accountName={accountName}
        accountAvatarUrl={accountAvatarUrl}
        roleLabel={roleLabel}
      />
      <aside className="workspace-app-sidebar member-dashboard-sidebar dashboard-sidebar">
        <div className="workspace-sidebar-brand">
          <div className="workspace-sidebar-logo">ARED</div>
          <p className="workspace-sidebar-tagline">Decolonising Archive</p>
        </div>
        <nav className="workspace-sidebar-nav member-dashboard-nav" aria-label="Member workspace">
          <Link
            href="/my/workbench"
            className="workspace-sidebar-item member-dashboard-nav-item"
          >
            <span>Archive Workbench</span>
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={`/workspace?section=${item.id}`}
              className={`workspace-sidebar-item member-dashboard-nav-item ${
                currentSection === item.id ? "is-active" : ""
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="workspace-sidebar-account member-dashboard-account">
          <div className="workspace-account-row">
            <div className="workspace-account-avatar" aria-hidden>
              {accountAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed-in user avatar URL
                <img src={accountAvatarUrl} alt="" className="workspace-account-avatar-img" />
              ) : (
                accountName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="workspace-account-meta">
              <span className="workspace-account-name">{accountName}</span>
              <span className="workspace-account-plan">{roleLabel}</span>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="workspace-account-action">
            <button type="submit" className="workspace-account-signout">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace-app-main member-dashboard-main dashboard-main">
        {children}
      </div>
    </main>
  );
}
