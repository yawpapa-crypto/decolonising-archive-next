import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  formatWorkspaceDate,
  getMemberWorkspaceData,
  workspaceRecordTitle,
} from "@/src/lib/member-workspace";
import {
  deleteBookmark,
  updateBookmark,
} from "@/app/(app)/workspace/actions";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";

export default async function MyBookmarksPage() {
  const { bookmarks, recordsById } =
    await getMemberWorkspaceData("/my/bookmarks");

  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--member">
        <main className="workspace-page dashboard-canvas admin-dashboard">
          <header className="workspace-header admin-header admin-header-card member-my-page-header">
            <div className="admin-header-main">
              <p className="admin-kicker">Member workspace</p>
              <h1>Bookmarks</h1>
              <p className="admin-subtext">
                Records you have saved from the library for quick return and notes.
              </p>
            </div>
            <div className="admin-actions">
              <Link href="/workspace" className="admin-button admin-button-secondary">
                Back to workspace
              </Link>
            </div>
          </header>

        <section className="workspace-elevated admin-surface bookmark-panel">
          <div className="bookmark-list">
            {bookmarks.length ? (
              bookmarks.map((bookmark) => {
                const openHref = getRecordHref(bookmark);
                return (
                <article className="bookmark-card" key={bookmark.id}>
                  <div className="bookmark-card-top">
                    <div className="bookmark-title-group">
                      <p className="bookmark-label">Saved record</p>
                      <h2 className="bookmark-title">
                        {bookmark.record_title || workspaceRecordTitle(recordsById, bookmark.record_id)}
                      </h2>
                    </div>
                    <time className="bookmark-date" dateTime={bookmark.created_at ?? undefined}>
                      {formatWorkspaceDate(bookmark.created_at)}
                    </time>
                  </div>

                  <form action={updateBookmark} className="bookmark-note-form">
                    <input type="hidden" name="id" value={bookmark.id} />
                    <input type="hidden" name="redirectTo" value="/my/bookmarks" />

                    <label className="bookmark-label" htmlFor={`bookmark-note-${bookmark.id}`}>
                      Private note
                    </label>

                    <div className="bookmark-note-row">
                      <input
                        id={`bookmark-note-${bookmark.id}`}
                        type="text"
                        name="note"
                        placeholder="Add a short note about why this record matters"
                        defaultValue={bookmark.note ?? ""}
                        className="bookmark-note-input"
                      />

                      <button type="submit" className="bookmark-note-save">
                        Save note
                      </button>
                    </div>
                  </form>

                  <div className="bookmark-actions">
                    {openHref ? (
                      <a
                        href={openHref}
                        className="bookmark-action-link"
                        {...(isExternalHref(openHref)
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        Open record
                      </a>
                    ) : (
                      <span
                        className="bookmark-action-link bookmark-action-link-disabled"
                        aria-disabled
                      >
                        Record link unavailable
                      </span>
                    )}

                    <form action={deleteBookmark}>
                      <input type="hidden" name="id" value={bookmark.id} />
                      <button type="submit" className="bookmark-action-link bookmark-action-danger">
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              );
              })
            ) : (
              <article className="bookmark-empty-state">
                <h2>No bookmarks yet</h2>
                <p>
                  Save records from the library to keep them here for quick return
                  and note-taking.
                </p>
                <Link href="/library" className="admin-button admin-button-secondary">
                  Browse library
                </Link>
              </article>
            )}
          </div>
        </section>
        </main>
      </div>
    </PageShell>
  );
}
