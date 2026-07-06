import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import {
  getCommunityAttachmentOptions,
  getCommunityFeed,
  getCommunitySpaces,
  getCommunityTopics,
  getMyCommunityPosts,
  getMyCommunitySpaces,
  type CommunityFeedView,
} from "@/src/lib/community-reading-commons";
import CommunityCreatePostForm from "./CommunityCreatePostForm";
import CommunityFeedTabs from "./CommunityFeedTabs";
import CommunityPostCard from "./CommunityPostCard";
import CommunityShell from "./CommunityShell";

type SearchParams = Promise<{
  updated?: string;
  error?: string;
  recordId?: string;
  recordTitle?: string;
  readingListId?: string;
  view?: string;
}>;

const FEED_VIEWS = new Set<CommunityFeedView>([
  "for-you",
  "recent",
  "questions",
  "sources",
  "lists",
]);

function parseView(value: string | undefined): CommunityFeedView {
  return FEED_VIEWS.has(value as CommunityFeedView) ? (value as CommunityFeedView) : "for-you";
}

function feedHeading(view: CommunityFeedView) {
  switch (view) {
    case "questions":
      return "Open questions";
    case "sources":
      return "Shared sources";
    case "lists":
      return "Reading paths";
    case "recent":
      return "Recent discussions";
    default:
      return "For you";
  }
}

function feedEmptyMessage(view: CommunityFeedView) {
  switch (view) {
    case "questions":
      return "No questions posted yet. Ask what you are trying to read with care.";
    case "sources":
      return "No shared sources yet. Attach a saved record or source note to start.";
    case "lists":
      return "No reading lists shared yet. Publish a list from your workbench.";
    case "recent":
      return "No public Commons posts yet. Start with a saved record, a reading list, or a research question.";
    default:
      return "No public Commons posts yet. Join a reading circle or share a source to get started.";
  }
}

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const [profile, sp] = await Promise.all([getCurrentProfile(), searchParams]);
  const view = parseView(sp.view);
  const userId = profile?.id ?? null;

  const [posts, options, topics, myPosts, spaces, mySpaces] = await Promise.all([
    getCommunityFeed(userId, { view }),
    getCommunityAttachmentOptions(userId),
    getCommunityTopics(),
    userId ? getMyCommunityPosts(userId) : Promise.resolve([]),
    getCommunitySpaces(userId),
    userId ? getMyCommunitySpaces(userId) : Promise.resolve([]),
  ]);

  const readingListPosts = posts.filter((post) =>
    post.attachments.some((attachment) => attachment.attachment_type === "reading_list"),
  );
  const drafts = myPosts.filter((post) => post.status === "draft");

  const sidebar = (
    <>
      <div className="community-card community-sidebar-panel">
        <div className="community-card-header">
          <p className="community-eyebrow">Topics</p>
          <h2>Reading with</h2>
        </div>
        <div className="community-chip-stack">
          {topics.slice(0, 8).map((topic) => (
            <Link key={topic.id} href={`/community/topics?tag=${topic.slug}`} className="community-topic-chip">
              <span>{topic.label}</span>
              <em>{topic.postCount}</em>
            </Link>
          ))}
          {!topics.length ? <p className="community-help">Tags will appear as people post.</p> : null}
        </div>
        <Link href="/community/topics" className="community-sidebar-link">
          Browse all topics
        </Link>
      </div>

      <div className="community-card community-sidebar-panel">
        <div className="community-card-header">
          <p className="community-eyebrow">Shared lists</p>
          <h2>Reading paths</h2>
        </div>
        <div className="community-sidebar-list">
          {readingListPosts.slice(0, 4).map((post) => (
            <Link key={post.id} href={`/community/posts/${post.id}`}>
              <strong>{post.title}</strong>
              <span>
                {post.attachments.length} attached item{post.attachments.length === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
          {!readingListPosts.length ? <p className="community-help">No shared reading lists yet.</p> : null}
        </div>
        <Link href="/community/reading-lists" className="community-sidebar-link">
          Open reading lists
        </Link>
      </div>

      <div className="community-card community-sidebar-panel community-care-panel">
        <p className="community-eyebrow">Cultural care</p>
        <p>
          Share with context. Name limits, uncertainty, source origin and what still needs careful reading.
        </p>
        <Link href="/about" className="community-sidebar-link">
          Read guidelines
        </Link>
      </div>

      {profile ? (
        <div className="community-card community-sidebar-panel">
          <div className="community-card-header">
            <p className="community-eyebrow">Your Commons</p>
            <h2>Drafts and posts</h2>
          </div>
          <p className="community-help">
            {drafts.length} draft{drafts.length === 1 ? "" : "s"} · {myPosts.length} total post
            {myPosts.length === 1 ? "" : "s"}
          </p>
          <Link href="/my/workbench/community" className="community-sidebar-link">
            Manage shared research
          </Link>
        </div>
      ) : null}
    </>
  );

  return (
    <PageShell>
      <main className="community-page community-commons">
        <section className="community-hero community-card community-hero--compact">
          <div>
            <p className="community-eyebrow">Community Reading Commons</p>
            <h1>Reading Commons</h1>
            <p>
              Join reading circles, share sources, ask questions, and build teaching paths from the archive.
            </p>
          </div>
          <div className="community-header-actions">
            <Link href="/community/spaces" className="community-button community-button-secondary">
              Reading circles
            </Link>
            <Link href="/community/topics" className="community-button community-button-secondary">
              Browse topics
            </Link>
            <a href="#share" className="community-button community-button-primary">
              New post
            </a>
          </div>
        </section>

        {sp.updated ? <div className="community-success">{sp.updated}</div> : null}
        {sp.error ? <div className="community-error">{sp.error}</div> : null}

        <CommunityShell
          spaces={spaces}
          mySpaces={mySpaces}
          activeView={view}
          signedIn={Boolean(profile)}
          sidebar={sidebar}
        >
          <div className="community-feed">
            <CommunityCreatePostForm
              signedIn={Boolean(profile)}
              options={options}
              spaces={spaces}
              initialRecordId={sp.recordId ?? ""}
              initialRecordTitle={sp.recordTitle ?? ""}
              initialReadingListId={sp.readingListId ?? ""}
            />

            <div className="community-section-heading">
              <div>
                <p className="community-eyebrow">Recent activity</p>
                <h2>{feedHeading(view)}</h2>
              </div>
              <CommunityFeedTabs activeView={view} />
            </div>

            {posts.length ? (
              posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} signedIn={Boolean(profile)} />
              ))
            ) : (
              <div className="community-empty">{feedEmptyMessage(view)}</div>
            )}
          </div>
        </CommunityShell>
      </main>
    </PageShell>
  );
}
