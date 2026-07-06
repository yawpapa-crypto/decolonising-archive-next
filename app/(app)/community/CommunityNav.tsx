import Link from "next/link";
import type { CommunityFeedView, CommunitySpace } from "@/src/lib/community-reading-commons";

type CommunityNavProps = {
  spaces: CommunitySpace[];
  mySpaces: CommunitySpace[];
  activeSpaceSlug?: string | null;
  activeView?: CommunityFeedView | null;
  signedIn: boolean;
};

function feedHref(view: CommunityFeedView) {
  if (view === "for-you") return "/community";
  return `/community?view=${view}`;
}

function isFeedActive(activeView: CommunityFeedView | null | undefined, view: CommunityFeedView) {
  return (activeView ?? "for-you") === view;
}

export default function CommunityNav({
  spaces,
  mySpaces,
  activeSpaceSlug,
  activeView,
  signedIn,
}: CommunityNavProps) {
  return (
    <nav className="community-hub-nav" aria-label="Community navigation">
      <div className="community-hub-nav__section">
        <p className="community-eyebrow">Commons</p>
        <ul className="community-hub-nav__list">
          <li>
            <Link
              href={feedHref("for-you")}
              className={`community-hub-nav__link${!activeSpaceSlug && isFeedActive(activeView, "for-you") ? " is-active" : ""}`}
            >
              <span aria-hidden="true">🏠</span>
              For you
            </Link>
          </li>
          <li>
            <Link
              href={feedHref("recent")}
              className={`community-hub-nav__link${!activeSpaceSlug && isFeedActive(activeView, "recent") ? " is-active" : ""}`}
            >
              <span aria-hidden="true">⚡</span>
              Recent
            </Link>
          </li>
          <li>
            <Link
              href={feedHref("questions")}
              className={`community-hub-nav__link${!activeSpaceSlug && isFeedActive(activeView, "questions") ? " is-active" : ""}`}
            >
              <span aria-hidden="true">❓</span>
              Questions
            </Link>
          </li>
          <li>
            <Link
              href={feedHref("sources")}
              className={`community-hub-nav__link${!activeSpaceSlug && isFeedActive(activeView, "sources") ? " is-active" : ""}`}
            >
              <span aria-hidden="true">📎</span>
              Shared sources
            </Link>
          </li>
          <li>
            <Link href="/community/reading-lists" className="community-hub-nav__link">
              <span aria-hidden="true">📋</span>
              Reading lists
            </Link>
          </li>
          <li>
            <Link href="/community/topics" className="community-hub-nav__link">
              <span aria-hidden="true">🏷️</span>
              Topics
            </Link>
          </li>
        </ul>
      </div>

      {signedIn && mySpaces.length ? (
        <div className="community-hub-nav__section">
          <p className="community-eyebrow">Your circles</p>
          <ul className="community-hub-nav__list">
            {mySpaces.map((space) => (
              <li key={space.id}>
                <Link
                  href={`/community/spaces/${space.slug}`}
                  className={`community-hub-nav__link${activeSpaceSlug === space.slug ? " is-active" : ""}`}
                >
                  <span aria-hidden="true">{space.emoji}</span>
                  <span className="community-hub-nav__label">{space.name}</span>
                  <em>{space.post_count}</em>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="community-hub-nav__section">
        <p className="community-eyebrow">Reading circles</p>
        <ul className="community-hub-nav__list">
          {spaces.slice(0, 8).map((space) => (
            <li key={space.id}>
              <Link
                href={`/community/spaces/${space.slug}`}
                className={`community-hub-nav__link${activeSpaceSlug === space.slug ? " is-active" : ""}`}
              >
                <span aria-hidden="true">{space.emoji}</span>
                <span className="community-hub-nav__label">{space.name}</span>
                <em>{space.member_count}</em>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/community/spaces" className="community-sidebar-link">
          Browse all circles
        </Link>
      </div>

      {signedIn ? (
        <div className="community-hub-nav__section community-hub-nav__section--cta">
          <Link href="/community/spaces/new" className="community-button community-button-secondary community-button-block">
            Start a reading circle
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
