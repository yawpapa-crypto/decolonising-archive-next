"use client";

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
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  bell: Bell,
  bookmark: Bookmark,
  help: CircleHelp,
  overview: LayoutDashboard,
  readingLists: ListChecks,
  search: Search,
  submissions: Send,
  settings: Settings,
  user: User,
} satisfies Record<string, LucideIcon>;

type WorkspaceIconProps = {
  name: keyof typeof ICONS;
  size?: number;
};

export default function WorkspaceIcon({ name, size = 18 }: WorkspaceIconProps) {
  const Icon = ICONS[name];
  return <Icon size={size} aria-hidden />;
}
