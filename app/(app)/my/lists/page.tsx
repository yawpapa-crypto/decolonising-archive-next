import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  getMemberWorkspaceData,
  workspaceRecordTitle,
} from "@/src/lib/member-workspace";

export default async function MyListsPage() {
  const { readingLists, readingListItems, recordsById } =
    await getMemberWorkspaceData("/my/lists");

  return (
    <PageShell>
      <main className="workspace-page">
        <header className="workspace-header">
          <p className="workspace-eyebrow">Member workspace</p>
          <div className="workspace-titlebar">
            <h1>Reading lists</h1>
            <Link href="/workspace" className="workspace-link">
              Workspace
            </Link>
          </div>
        </header>

        <section className="workspace-grid">
          {readingLists.length ? (
            readingLists.map((list) => {
              const items = readingListItems.filter(
                (item) => item.reading_list_id === list.id,
              );
              return (
                <article className="workspace-tile" key={list.id}>
                  <div className="workspace-tile-head">
                    <h2>{list.title}</h2>
                    <span className="workspace-status">
                      {list.is_public ? "Public" : "Private"}
                    </span>
                  </div>
                  {list.description ? <p>{list.description}</p> : null}
                  <div className="workspace-list">
                    {items.length ? (
                      items.map((item) => (
                        <div className="workspace-list-item" key={item.id}>
                          <strong>
                            {workspaceRecordTitle(recordsById, item.record_id)}
                          </strong>
                          <Link
                            href={`/#/record/${encodeURIComponent(item.record_id)}`}
                            className="workspace-link"
                          >
                            Open record
                          </Link>
                        </div>
                      ))
                    ) : (
                      <p className="workspace-empty">No records in this list yet.</p>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <article className="workspace-tile">
              <p className="workspace-empty">No reading lists yet.</p>
            </article>
          )}
        </section>
      </main>
    </PageShell>
  );
}
