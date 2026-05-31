import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import { getCommunityComments, getCommunityPost } from "@/src/lib/community-reading-commons";
import {
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  reportCommunityContent,
  toggleCommunityReaction,
} from "../../actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date(value));
}

function bodyParagraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function postTypeLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CommunityPostPage({ params, searchParams }: PageProps) {
  const [{ id }, sp, profile] = await Promise.all([params, searchParams, getCurrentProfile()]);
  const post = await getCommunityPost(id, profile?.id ?? null);
  if (!post || post.status === "deleted") notFound();
  const comments = await getCommunityComments(id);
  const canManagePost = Boolean(profile && profile.id === post.user_id);

  return (
    <PageShell>
      <main className="community-page community-post-detail">
        <section className="community-card community-post-article">
          <div className="community-post-detail__nav">
            <Link href="/community" className="community-button community-button-secondary">
              Back to Commons
            </Link>
            <div className="community-post-card__badges">
              <span className="community-status-pill is-post-type">{postTypeLabel(post.post_type)}</span>
              <span className={`community-status-pill is-${post.visibility}`}>{post.visibility}</span>
            </div>
          </div>
          <p className="community-eyebrow">Community thread</p>
          <h1>{post.title}</h1>
          <p className="community-post-card__meta">
            {post.author_name || "Archive member"} · {formatDate(post.created_at)}
          </p>
          <div className="community-post-body">
            {bodyParagraphs(post.body).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {post.tags.length ? (
            <div className="community-tag-row">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/community/topics?tag=${tag.slug}`} className="community-tag">
                  {tag.label}
                </Link>
              ))}
            </div>
          ) : null}

          {post.attachments.length ? (
            <section className="community-detail-attachments">
              <p className="community-eyebrow">Attached sources</p>
              <div className="community-attachment-list">
                {post.attachments.map((attachment) => {
                  const content = (
                    <>
                      <strong>
                        {attachment.attachment_type === "reading_list"
                          ? "Reading list"
                          : attachment.record_type || "Saved record"}
                      </strong>
                      {attachment.title || attachment.record_id || "Attached item"}
                      {attachment.source_label ? <em>{attachment.source_label}</em> : null}
                    </>
                  );
                  if (attachment.attachment_type === "reading_list" && attachment.reading_list_id) {
                    return (
                      <Link
                        key={attachment.id}
                        href={`/community/reading-lists/${attachment.reading_list_id}`}
                        className="community-source-badge community-source-badge--list"
                      >
                        {content}
                      </Link>
                    );
                  }
                  if (attachment.source_url) {
                    return (
                      <a
                        key={attachment.id}
                        href={attachment.source_url}
                        className="community-source-badge"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {content}
                      </a>
                    );
                  }
                  return (
                    <span key={attachment.id} className="community-source-badge">
                      {content}
                    </span>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="community-post-actions">
            <form action={toggleCommunityReaction}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="redirect_to" value={`/community/posts/${post.id}`} />
              <button
                type="submit"
                className={`community-action-button${post.current_user_reacted ? " is-active" : ""}`}
                disabled={!profile}
              >
                Useful <span>{post.reaction_count}</span>
              </button>
            </form>
            {canManagePost ? (
              <form action={deleteCommunityPost}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="redirect_to" value="/community" />
                <button type="submit" className="community-button community-button-secondary">
                  Delete post
                </button>
              </form>
            ) : null}
            {profile ? (
              <details className="community-report">
                <summary>Report</summary>
                <form action={reportCommunityContent} className="community-inline-form">
                  <input type="hidden" name="target_type" value="post" />
                  <input type="hidden" name="target_id" value={post.id} />
                  <input type="hidden" name="redirect_to" value={`/community/posts/${post.id}`} />
                  <input name="reason" placeholder="Reason" required />
                  <button type="submit" className="community-button community-button-secondary">
                    Send report
                  </button>
                </form>
              </details>
            ) : null}
          </div>
        </section>

        {sp.updated ? <div className="community-success">{sp.updated}</div> : null}
        {sp.error ? <div className="community-error">{sp.error}</div> : null}

        <section className="community-card community-comments">
          <div className="community-card-header">
            <p className="community-eyebrow">Discussion</p>
            <h2>{comments.length} {comments.length === 1 ? "comment" : "comments"}</h2>
          </div>
          {profile ? (
            <form action={createCommunityComment} className="community-form community-comment-form">
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="redirect_to" value={`/community/posts/${post.id}`} />
              <textarea name="body" rows={4} placeholder="Add a careful note or question…" required />
              <button type="submit" className="community-button community-button-primary">
                Add comment
              </button>
            </form>
          ) : (
            <div className="community-empty">
              <Link href={`/auth/sign-in?next=/community/posts/${post.id}`}>Sign in</Link> to comment.
            </div>
          )}

          <div className="community-comment-list">
            {comments.map((comment) => (
              <article className="community-comment" key={comment.id}>
                <div>
                  <strong>{comment.author_name || "Archive member"}</strong>
                  <span>{formatDate(comment.created_at)}</span>
                </div>
                <p>{comment.body}</p>
                {profile?.id === comment.user_id ? (
                  <form action={deleteCommunityComment}>
                    <input type="hidden" name="comment_id" value={comment.id} />
                    <input type="hidden" name="post_id" value={post.id} />
                    <button type="submit" className="community-button community-button-secondary">
                      Delete comment
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
