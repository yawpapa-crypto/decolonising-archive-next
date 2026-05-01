import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  formatWorkspaceDate,
  getMemberWorkspaceData,
  workspaceRecordTitle,
} from "@/src/lib/member-workspace";

export default async function MyBookmarksPage() {
  const { bookmarks, recordsById } =
    await getMemberWorkspaceData("/my/bookmarks");

  return (
    <PageShell>
      <main className="workspace-page">
        <header className="workspace-header">
          <p className="workspace-eyebrow">Member workspace</p>
          <div className="workspace-titlebar">
            <h1>Bookmarks</h1>
            <Link href="/workspace" className="workspace-link">
              Workspace
            </Link>
          </div>
        </header>

        <section className="workspace-elevated">
          <div className="workspace-list">
            {bookmarks.length ? (
              bookmarks.map((bookmark) => (
                <div className="workspace-list-item horizontal" key={bookmark.id}>
                  <strong>{workspaceRecordTitle(recordsById, bookmark.record_id)}</strong>
                  <span>{bookmark.note || "No note added"}</span>
                  <Link
                    href={`/#/record/${encodeURIComponent(bookmark.record_id)}`}
                    className="workspace-link"
                  >
                    Open record
                  </Link>
                  <span>{formatWorkspaceDate(bookmark.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="workspace-empty">No bookmarks yet.</p>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
