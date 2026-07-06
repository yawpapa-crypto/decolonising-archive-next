"use client";

import {
  Bookmark,
  Heart,
  Link2,
  ListPlus,
  MessageCircle,
  Share2,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  bookmark: Bookmark,
  heart: Heart,
  link: Link2,
  listPlus: ListPlus,
  messageCircle: MessageCircle,
  share: Share2,
} satisfies Record<string, LucideIcon>;

type Props = {
  name: keyof typeof ICONS;
  size?: number;
};

export default function CommunityIcon({ name, size = 16 }: Props) {
  const Icon = ICONS[name];
  return <Icon size={size} aria-hidden />;
}
