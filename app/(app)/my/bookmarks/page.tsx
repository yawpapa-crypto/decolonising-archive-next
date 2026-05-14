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
import ConfirmSubmitButton from "@/app/(app)/workspace/ConfirmSubmitButton";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";

export default async function MyBookmarksPage() {
  const { bookmarks, recordsById } =
    await getMemberWorkspaceData("/my/bookmarks");

  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--member">
        <main className="workspace-page dashboard-canvas admin-dashboard">
          <section className="saved-records-page">
            <header className="saved-records-header">
              <div className="saved-records-header-text">
                <p className="saved-records-eyebrow">Saved records</p>
                <h1>Bookmarks</h1>
                <p className="saved-records-intro">
                  Records saved from the library. Add them to a Workbench project
                  from the library card or from each project page.
                </p>
              </div>
              <div className="saved-records-header-aside">
                <Link href="/workspace" className="saved-records-back">
                  Back to workspace
                </Link>
              </div>
            </header>

            <div className="saved-records-grid">
              {bookmarks.length ? (
                bookmarks.map((bookmark) => {
                  const openHref = getRecordHref(bookmark);
                  return (
                    <article className="saved-record-card" key={bookmark.id}>
                      <div className="saved-record-card-top">
                        <h2 className="saved-record-title">
                          {bookmark.record_title ||
                            workspaceRecordTitle(
                              recordsById,
                              bookmark.record_id,
                            )}
                        </h2>
                        <time
                          className="saved-record-date"
                          dateTime={bookmark.created_at ?? undefined}
                        >
                          {formatWorkspaceDate(bookmark.created_at)}
                        </time>
                      </div>

                      <form
                        action={updateBookmark}
                        className="saved-record-note-form"
                      >
                        <input type="hidden" name="id" value={bookmark.id} />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value="/my/bookmarks"
                        />
                        <label
                          className="saved-record-note-label"
                          htmlFor={`saved-record-note-${bookmark.id}`}
                        >
                          Private note
                        </label>
                        <input
                          id={`saved-record-note-${bookmark.id}`}
                          type="text"
                          name="note"
                          placeholder="Add a short note"
                          defaultValue={bookmark.note ?? ""}
                          className="saved-record-note-input"
                        />
                        <PendingSubmitButton
                          className="saved-record-note-save"
                          pendingLabel="Saving…"
                        >
                          Save note
                        </PendingSubmitButton>
                      </form>

                      <div className="saved-record-actions">
                        {openHref ? (
                          <a
                            href={openHref}
                            className="saved-record-action saved-record-action-primary"
                            {...(isExternalHref(openHref)
                              ? { target: "_blank", rel: "noreferrer" }
                              : {})}
                          >
                            Open record
                          </a>
                        ) : (
                          <span
                            className="saved-record-action saved-record-action-disabled"
                            aria-disabled
                          >
                            Record link unavailable
                          </span>
                        )}

                        <form action={deleteBookmark}>
                          <input type="hidden" name="id" value={bookmark.id} />
                          <input type="hidden" name="confirm" value="yes" />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value="/my/bookmarks"
                          />
                          <ConfirmSubmitButton
                            className="saved-record-action saved-record-action-danger"
                            message="Remove this bookmark?"
                            pendingLabel="Removing…"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </article>
                  );
                })
              ) : (
                <article className="saved-records-empty">
                  <h2 className="saved-records-empty-title">No bookmarks yet</h2>
                  <p className="saved-records-empty-copy">
                    Save records from the library to keep them here for quick
                    return and note-taking.
                  </p>
                  <a href="/library" className="saved-records-empty-cta">
                    Browse library
                  </a>
                </article>
              )}
            </div>
          </section>
        </main>
      </div>
    </PageShell>
  );
}
