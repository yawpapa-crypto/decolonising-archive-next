import Link from "next/link";
import { requireMember } from "@/src/lib/auth";
import { getMyCommunityPosts } from "@/src/lib/community-reading-commons";
import {
  deleteCommunityPost,
  publishCommunityPost,
  unpublishCommunityPost,
} from "@/app/(app)/community/actions";

type PageProps = {
  searchParams: Promise<{ updated?: string; error?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(value));
}

export default async function WorkbenchCommunityPage({ searchParams }: PageProps) {
  const [profile, sp] = await Promise.all([requireMember("/my/workbench/community"), searchParams]);
  const posts = await getMyCommunityPosts(profile.id);
  const drafts = posts.filter((post) => post.status === "draft");
  const published = posts.filter((post) => post.status === "published");

  return (
    <section className="workbench-projects-page workbench-community-page">
      <header className="workbench-reading-header workbench-reading-header--fixed">
        <div className="workbench-reading-heading-block">
          <p className="workbench-reading-eyebrow">Community</p>
          <h1>Shared research</h1>
          <p>
            Manage posts, drafts, and reading lists shared from your Workbench into the
            Community Reading Commons.
          </p>
        </div>
        <Link href="/community" className="workbench-button workbench-button-primary">
          Open Commons
        </Link>
      </header>

      {sp.updated ? <div className="community-success">{sp.updated}</div> : null}
      {sp.error ? <div className="community-error">{sp.error}</div> : null}

      <section className="workbench-project-list-card">
        <div className="workbench-project-list-header">
          <h2>Published posts</h2>
          <p>{published.length} visible in the Commons.</p>
        </div>
        <div className="community-submission-list">
          {published.length ? (
            published.map((post) => (
              <article className="community-submission-item" key={post.id}>
                <div className="community-submission-topline">
                  <strong>{post.title}</strong>
                  <span className="community-status-pill is-public">{post.visibility}</span>
                </div>
                <div className="community-submission-meta">
                  <span>{post.comment_count} comments</span>
                  <span>Updated {formatDate(post.updated_at)}</span>
                </div>
                <div className="community-record-actions">
                  <Link href={`/community/posts/${post.id}`} className="community-button community-button-secondary">
                    Open
                  </Link>
                  <form action={unpublishCommunityPost}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <button type="submit" className="community-button community-button-secondary">
                      Unpublish
                    </button>
                  </form>
                  <form action={deleteCommunityPost}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <button type="submit" className="community-button community-button-secondary">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div className="community-empty">No published posts yet.</div>
          )}
        </div>
      </section>

      <section className="workbench-project-list-card">
        <div className="workbench-project-list-header">
          <h2>Drafts</h2>
          <p>{drafts.length} private drafts.</p>
        </div>
        <div className="community-submission-list">
          {drafts.length ? (
            drafts.map((post) => (
              <article className="community-submission-item" key={post.id}>
                <div className="community-submission-topline">
                  <strong>{post.title}</strong>
                  <span className="community-status-pill">Draft</span>
                </div>
                <div className="community-submission-meta">
                  <span>Updated {formatDate(post.updated_at)}</span>
                  <span>{post.attachments.length} attachments</span>
                </div>
                <div className="community-record-actions">
                  <form action={publishCommunityPost}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <button type="submit" className="community-button community-button-primary">
                      Publish
                    </button>
                  </form>
                  <form action={deleteCommunityPost}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <button type="submit" className="community-button community-button-secondary">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div className="community-empty">No private drafts.</div>
          )}
        </div>
      </section>
    </section>
  );
}
