import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import type { CommunityPost } from "@/src/lib/community-reading-commons";
import { createCommunityComment, toggleCommunityReaction, toggleCommunitySave, reportCommunityContent } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(value));
}

function excerpt(body: string) {
  const trimmed = body.replace(/\s+/g, " ").trim();
  return trimmed.length > 420 ? `${trimmed.slice(0, 417)}…` : trimmed;
}

function postTypeLabel(value: CommunityPost["post_type"]) {
  switch (value) {
    case "source_note":
      return "Source note";
    case "reading_list":
      return "Reading list";
    case "question":
      return "Question";
    case "teaching_path":
      return "Teaching path";
    default:
      return "Reflection";
  }
}

export default function CommunityPostCard({
  post,
  signedIn = false,
  showInlineComments = true,
}: {
  post: CommunityPost;
  signedIn?: boolean;
  showInlineComments?: boolean;
}) {
  const savedRecords = post.attachments.filter((item) => item.attachment_type === "saved_record");
  const readingLists = post.attachments.filter((item) => item.attachment_type === "reading_list");
  const previewComments = post.comments.slice(0, 2);

  return (
    <article className="community-post-card">
      <div className="community-post-header">
        <div className="community-post-author">
          <Link href={`/community/users/${post.user_id}`} className="community-post-avatar-link">
            <span className="community-post-avatar" aria-hidden="true">
              {(post.author_name || "A").slice(0, 1).toUpperCase()}
            </span>
          </Link>
          <span>
            <Link href={`/community/users/${post.user_id}`} className="community-post-author-name">
              <strong>{post.author_name || "Archive member"}</strong>
            </Link>
            <em>{formatDate(post.created_at)}</em>
          </span>
        </div>
        <div className="community-post-card__badges">
          <span className="community-status-pill is-post-type">{postTypeLabel(post.post_type)}</span>
          <span className={`community-status-pill is-${post.visibility}`}>
            {post.visibility === "community" ? "Community" : post.visibility}
          </span>
        </div>
      </div>

      <div className="community-post-content">
        <div>
          <p className="community-post-card__meta">
            {postTypeLabel(post.post_type)}
          </p>
          <h2 className="community-post-title">
            <Link href={`/community/posts/${post.id}`}>{post.title}</Link>
          </h2>
        </div>
        <p className="community-post-card__excerpt community-post-body">{excerpt(post.body)}</p>
      </div>

      {post.tags.length ? (
        <div className="community-tag-row" aria-label="Topics">
          {post.tags.map((tag) => (
            <Link key={tag.id} href={`/community/topics?tag=${tag.slug}`} className="community-tag">
              {tag.label}
            </Link>
          ))}
        </div>
      ) : null}

      {post.attachments.length ? (
        <div className="community-attachment-list">
          {savedRecords.slice(0, 2).map((attachment) => (
            attachment.source_url ? (
              <a
                className="community-source-badge"
                key={attachment.id}
                href={attachment.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{attachment.record_type || "Record"}</strong>
                <span>{attachment.title || attachment.record_id}</span>
                {attachment.source_label ? <em>{attachment.source_label}</em> : null}
              </a>
            ) : (
              <span className="community-source-badge" key={attachment.id}>
                <strong>{attachment.record_type || "Record"}</strong>
                <span>{attachment.title || attachment.record_id}</span>
                {attachment.source_label ? <em>{attachment.source_label}</em> : null}
              </span>
            )
          ))}
          {readingLists.slice(0, 2).map((attachment) => (
            <Link
              key={attachment.id}
              href={
                attachment.reading_list_id
                  ? `/community/reading-lists/${attachment.reading_list_id}`
                  : `/community/posts/${post.id}`
              }
              className="community-source-badge community-source-badge--list"
            >
              <strong>Reading list</strong>
              <span>{attachment.title || "Shared list"}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="community-post-actions-row">
        <form action={toggleCommunityReaction}>
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="redirect_to" value="/community" />
          <button
            type="submit"
            className={`community-action-button${post.current_user_reacted ? " is-active" : ""}`}
            disabled={!signedIn}
          aria-label={signedIn ? "Mark this post useful" : "Sign in to react"}
          >
            <Heart size={16} /> Useful <span>{post.reaction_count}</span>
          </button>
        </form>
        <a className="community-action-button" href={`#comment-${post.id}`}>
          <MessageCircle size={16} /> Comment <span>{post.comment_count}</span>
        </a>
        <Link href={`/community/posts/${post.id}`} className="community-action-button">
          <Share2 size={16} /> Share
        </Link>
        <form action={toggleCommunitySave}>
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="redirect_to" value="/community" />
          <button
            type="submit"
            className={`community-action-button${post.current_user_saved ? " is-active" : ""}`}
            disabled={!signedIn}
            aria-label={signedIn ? "Save this post" : "Sign in to save"}
          >
            <Bookmark size={16} /> Save <span>{post.save_count}</span>
          </button>
        </form>
        <Link href={`/community/posts/${post.id}`} className="community-action-button community-action-button--thread">
          View thread
        </Link>
        {signedIn ? (
          <details className="community-report-details">
            <summary className="community-action-button community-action-button--report" aria-label="Report this post">
              Report
            </summary>
            <form action={reportCommunityContent} className="community-report-form">
              <input type="hidden" name="target_type" value="post" />
              <input type="hidden" name="target_id" value={post.id} />
              <input type="hidden" name="redirect_to" value="/community" />
              <label>
                <span className="sr-only">Reason for report</span>
                <input
                  name="reason"
                  required
                  maxLength={160}
                  placeholder="Brief reason (required)…"
                  className="community-report-input"
                />
              </label>
              <button type="submit" className="community-button community-button-secondary">
                Submit report
              </button>
            </form>
          </details>
        ) : null}
      </div>

      {showInlineComments ? (
        <div className="community-inline-comments">
          {previewComments.length ? (
            previewComments.map((comment) => (
              <article className="community-inline-comment" key={comment.id}>
                <strong>{comment.author_name || "Archive member"}</strong>
                <p>{comment.body}</p>
              </article>
            ))
          ) : null}
          {post.comment_count > previewComments.length ? (
            <Link href={`/community/posts/${post.id}`} className="community-inline-comments__more">
              View all {post.comment_count} comments
            </Link>
          ) : null}
          {signedIn ? (
            <form action={createCommunityComment} className="community-inline-comment-form" id={`comment-${post.id}`}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="redirect_to" value="/community" />
              <input name="body" required maxLength={5000} placeholder="Write a response..." />
              <button type="submit" className="community-button community-button-secondary">
                Reply
              </button>
            </form>
          ) : (
            <Link href="/auth/sign-in?next=/community" className="community-inline-comments__more">
              Sign in to respond
            </Link>
          )}
        </div>
      ) : null}
    </article>
  );
}
