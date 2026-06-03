import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import {
  getCommunityAttachmentOptions,
  getCommunityFeed,
  getCommunityTopics,
  getMyCommunityPosts,
} from "@/src/lib/community-reading-commons";
import CommunityCreatePostForm from "./CommunityCreatePostForm";
import CommunityPostCard from "./CommunityPostCard";

type SearchParams = Promise<{
  updated?: string;
  error?: string;
  recordId?: string;
  recordTitle?: string;
  readingListId?: string;
}>;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const [profile, sp] = await Promise.all([getCurrentProfile(), searchParams]);
  const posts = await getCommunityFeed(profile?.id ?? null);
  const [options, topics, myPosts] = await Promise.all([
    getCommunityAttachmentOptions(profile?.id ?? null),
    getCommunityTopics(),
    profile ? getMyCommunityPosts(profile.id) : Promise.resolve([]),
  ]);
  const readingListPosts = posts.filter((post) =>
    post.attachments.some((attachment) => attachment.attachment_type === "reading_list"),
  );
  const drafts = myPosts.filter((post) => post.status === "draft");

  return (
    <PageShell>
      <main className="community-page community-commons">
        <section className="community-hero community-card community-hero--compact">
          <div>
            <p className="community-eyebrow">Community Reading Commons</p>
            <h1>Reading Commons</h1>
            <p>
              Share sources, questions, reading paths and reflections from the archive.
            </p>
          </div>
          <div className="community-header-actions">
            <Link href="/community/topics" className="community-button community-button-secondary">
              Browse topics
            </Link>
            <Link href="/community/reading-lists" className="community-button community-button-secondary">
              Reading lists
            </Link>
            <a href="#share" className="community-button community-button-primary">
              New post
            </a>
          </div>
        </section>

        {sp.updated ? <div className="community-success">{sp.updated}</div> : null}
        {sp.error ? <div className="community-error">{sp.error}</div> : null}

        <section className="community-layout">
          <div className="community-feed">
            <CommunityCreatePostForm
              signedIn={Boolean(profile)}
              options={options}
              initialRecordId={sp.recordId ?? ""}
              initialRecordTitle={sp.recordTitle ?? ""}
              initialReadingListId={sp.readingListId ?? ""}
            />

            <div className="community-section-heading">
              <div>
                <p className="community-eyebrow">Recent activity</p>
                <h2>Recent discussions</h2>
              </div>
              <nav className="community-feed-tabs" aria-label="Community feed filters">
                <Link className="is-active" href="/community">For you</Link>
                <Link href="/community">Recent</Link>
                <Link href="/community/topics?tag=question">Questions</Link>
                <Link href="/community/topics?tag=source">Shared sources</Link>
                <Link href="/community/reading-lists">Reading lists</Link>
              </nav>
            </div>
            {posts.length ? (
              posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} signedIn={Boolean(profile)} />
              ))
            ) : (
              <div className="community-empty">
                No public Commons posts yet. Start with a saved record, a reading list, or a
                research question.
              </div>
            )}
          </div>

          <aside className="community-sidebar" aria-label="Community context">
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
                    <span>{post.attachments.length} attached item{post.attachments.length === 1 ? "" : "s"}</span>
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
          </aside>
        </section>
      </main>
    </PageShell>
  );
}
