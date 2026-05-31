import Link from "next/link";
import { adminModerateCommunityContent } from "@/app/(app)/community/actions";
import { getCommunityFeed, getCommunityReportsForAdmin } from "@/src/lib/community-reading-commons";

type PageProps = {
  searchParams: Promise<{ updated?: string; error?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(value));
}

export default async function AdminCommunityPage({ searchParams }: PageProps) {
  const [reports, posts, sp] = await Promise.all([
    getCommunityReportsForAdmin(),
    getCommunityFeed(),
    searchParams,
  ]);

  return (
    <section className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Moderation</p>
          <h1>Community Reading Commons</h1>
          <p className="admin-subtext">
            Review reported posts and comments, hide unsafe content, and keep the Commons calm.
          </p>
        </div>
        <Link href="/community" className="admin-button admin-button-secondary">
          View Commons
        </Link>
      </header>

      {sp.updated ? <div className="community-success">{sp.updated}</div> : null}
      {sp.error ? <div className="community-error">{sp.error}</div> : null}

      <section className="admin-surface">
        <div className="admin-section-title">
          <h2>Reports</h2>
          <span>{reports.length} total</span>
        </div>
        <div className="community-submission-list">
          {reports.length ? (
            reports.map((report) => (
              <article className="community-submission-item" key={report.id}>
                <div className="community-submission-topline">
                  <strong>{report.reason}</strong>
                  <span className={`community-status-pill is-${report.status}`}>{report.status}</span>
                </div>
                <p>{report.details || "No extra details provided."}</p>
                <div className="community-submission-meta">
                  <span>{report.target_type}</span>
                  <span>{report.target_id}</span>
                  <span>{formatDate(report.created_at)}</span>
                </div>
                <form action={adminModerateCommunityContent} className="community-inline-form">
                  <input type="hidden" name="report_id" value={report.id} />
                  <input type="hidden" name="target_type" value={report.target_type} />
                  <input type="hidden" name="target_id" value={report.target_id} />
                  <input name="moderator_note" placeholder="Moderator note" />
                  <button name="moderation_action" value="hide" className="admin-small-button" type="submit">
                    Hide
                  </button>
                  <button name="moderation_action" value="unhide" className="admin-small-button" type="submit">
                    Unhide
                  </button>
                  <button name="moderation_action" value="delete" className="admin-small-button admin-danger-button" type="submit">
                    Delete
                  </button>
                  <button name="moderation_action" value="dismiss" className="admin-small-button" type="submit">
                    Dismiss
                  </button>
                </form>
              </article>
            ))
          ) : (
            <div className="community-empty">No reports yet.</div>
          )}
        </div>
      </section>

      <section className="admin-surface">
        <div className="admin-section-title">
          <h2>Recent public posts</h2>
          <span>{posts.length} visible</span>
        </div>
        <div className="community-submission-list">
          {posts.slice(0, 20).map((post) => (
            <article className="community-submission-item" key={post.id}>
              <div className="community-submission-topline">
                <strong>{post.title}</strong>
                <span className="community-status-pill is-public">{post.visibility}</span>
              </div>
              <div className="community-submission-meta">
                <span>{post.author_name || "Archive member"}</span>
                <span>{post.comment_count} comments</span>
                <span>{formatDate(post.created_at)}</span>
              </div>
              <div className="community-record-actions">
                <Link href={`/community/posts/${post.id}`} className="community-button community-button-secondary">
                  Open
                </Link>
                <form action={adminModerateCommunityContent}>
                  <input type="hidden" name="target_type" value="post" />
                  <input type="hidden" name="target_id" value={post.id} />
                  <button name="moderation_action" value="hide" className="community-button community-button-secondary" type="submit">
                    Hide
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
