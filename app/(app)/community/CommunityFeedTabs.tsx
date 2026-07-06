import Link from "next/link";
import type { CommunityFeedView } from "@/src/lib/community-reading-commons";

type CommunityFeedTabsProps = {
  activeView: CommunityFeedView;
  spaceSlug?: string | null;
};

function tabHref(view: CommunityFeedView, spaceSlug?: string | null) {
  if (spaceSlug) {
    const base = `/community/spaces/${spaceSlug}`;
    return view === "for-you" ? base : `${base}?view=${view}`;
  }
  return view === "for-you" ? "/community" : `/community?view=${view}`;
}

export default function CommunityFeedTabs({ activeView, spaceSlug }: CommunityFeedTabsProps) {
  const tabs: Array<{ view: CommunityFeedView; label: string }> = [
    { view: "for-you", label: "For you" },
    { view: "recent", label: "Recent" },
    { view: "questions", label: "Questions" },
    { view: "sources", label: "Shared sources" },
  ];

  return (
    <nav className="community-feed-tabs" aria-label="Community feed filters">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          href={tabHref(tab.view, spaceSlug)}
          className={activeView === tab.view ? "is-active" : undefined}
        >
          {tab.label}
        </Link>
      ))}
      <Link href="/community/reading-lists">Reading lists</Link>
    </nav>
  );
}
