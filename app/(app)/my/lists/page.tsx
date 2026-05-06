import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import ReadingListExportActions from "./ReadingListExportActions";
import ReadingListToolbar from "./ReadingListToolbar";
import ReadingListCitationPreview from "./ReadingListCitationPreview";
import CopyRecordLinkButton from "./CopyRecordLinkButton";
import CopyReadingListLinkButton from "./CopyReadingListLinkButton";
import ReadingListExportAllActions from "./ReadingListExportAllActions";
import {
  DeleteReadingListForm,
  RemoveReadingListItemForm,
} from "./ReadingListDeleteForms";
import {
  getMemberWorkspaceData,
  workspaceRecordTitle,
} from "@/src/lib/member-workspace";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";
import { updateReadingList } from "@/app/(app)/workspace/actions";
import MemberDashboardShell from "@/app/(app)/workspace/MemberDashboardShell";

export default async function MyListsPage() {
  const { profile, readingLists, readingListItems, recordsById } =
    await getMemberWorkspaceData("/my/lists");
  const roleLabel =
    profile.role === "admin"
      ? "ADMIN"
      : profile.role === "curator"
        ? "CURATOR"
        : "MEMBER";
  const accountDisplayName =
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email ||
    "Account";

  return (
    <PageShell>
      <MemberDashboardShell
        currentSection="reading-lists"
        accountName={accountDisplayName}
        accountAvatarUrl={profile.avatar_url}
        roleLabel={roleLabel}
      >
        <header className="member-dashboard-header">
          <div>
            <p className="member-dashboard-eyebrow">Member workspace</p>
            <h1>Reading lists</h1>
            <p>
              Organise records into lists, manage visibility, and export citations for
              teaching or publication.
            </p>
          </div>
          <div className="member-dashboard-header-actions">
            <Link href="/workspace" className="admin-button admin-button-secondary">
              Back to workspace
            </Link>
          </div>
        </header>

        <section className="workspace-export-panel admin-surface member-dashboard-card">
          <ReadingListExportAllActions
            listCount={readingLists.length}
            recordCount={readingListItems.length}
          />
          <div className="reading-list-export-note">
            <strong>Citation note:</strong> Exports use available archive metadata to generate APA 7-style citations. Please check titles, authors, dates, and source details against the original record before formal submission or publication.
          </div>
        </section>

        <ReadingListToolbar />

        <section className="workspace-grid member-lists-grid" data-reading-lists-grid>
          {readingLists.length ? (
            readingLists.map((list) => {
              const items = readingListItems.filter(
                (item) => item.reading_list_id === list.id,
              );
              const recordTitles = items.map((item) =>
                item.record_title || workspaceRecordTitle(recordsById, item.record_id),
              );
              const searchText = [
                list.title,
                list.description,
                list.is_public ? "public" : "private",
                ...recordTitles,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              const createdAt = list.created_at
                ? new Date(list.created_at).getTime()
                : 0;

              return (
                <article
                  id={`list-${list.id}`}
                  className="workspace-tile workspace-reading-list-card member-dashboard-card"
                  key={list.id}
                  data-reading-list-card
                  data-search-text={searchText}
                  data-title={list.title?.toLowerCase() ?? ""}
                  data-record-count={items.length}
                  data-created-at={createdAt}
                >
                  <div className="workspace-tile-head">
                    <div>
                      <h2>{list.title}</h2>
                      <div className="workspace-reading-list-meta">
                        <span>
                          {items.length} {items.length === 1 ? "record" : "records"}
                        </span>
                        <span className="member-dashboard-pill">{list.is_public ? "Public" : "Private"}</span>
                      </div>
                      {list.description ? (
                        <p className="workspace-reading-list-description">
                          {list.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="reading-list-card-actions">
                      <CopyReadingListLinkButton
                        listId={list.id}
                        listTitle={list.title}
                      />
                      <DeleteReadingListForm listId={list.id} />
                    </div>
                  </div>
                  <form action={updateReadingList} className="workspace-form workspace-form-compact">
                    <input type="hidden" name="id" value={list.id} />
                    <label>
                      <span>Title</span>
                      <input name="title" defaultValue={list.title} required />
                    </label>
                    <label>
                      <span>Description</span>
                      <input name="description" defaultValue={list.description ?? ""} />
                    </label>
                    <label className="workspace-check">
                      <input
                        type="checkbox"
                        name="is_public"
                        defaultChecked={list.is_public}
                      />
                      <span>Public</span>
                    </label>
                    <input type="hidden" name="redirectTo" value="/my/lists" />
                    <button type="submit" className="admin-button admin-button-secondary">
                      Save list
                    </button>
                  </form>

                  <ReadingListExportActions listId={list.id} listTitle={list.title} />
                  <ReadingListCitationPreview listId={list.id} listTitle={list.title} />
                  <div className="workspace-list">
                    {items.length ? (
                      items.map((item) => (
                        <div className="workspace-list-item" key={item.id}>
                          <div className="reading-list-record-meta">
                            <strong className="reading-list-record-title">
                              {item.record_title || workspaceRecordTitle(recordsById, item.record_id)}
                            </strong>
                            <div className="reading-list-item-actions">
                            {(() => {
                              const title =
                                item.record_title ||
                                workspaceRecordTitle(recordsById, item.record_id);
                              const href = getRecordHref(item);
                              return (
                                <>
                                  <div className="reading-list-record-actions reading-list-record-actions-primary">
                                    {href ? (
                                      <a
                                        href={href}
                                        className="workspace-link"
                                        {...(isExternalHref(href)
                                          ? {
                                              target: "_blank",
                                              rel: "noreferrer",
                                            }
                                          : {})}
                                      >
                                        Open record
                                      </a>
                                    ) : (
                                      <span
                                        className="workspace-link workspace-link-disabled"
                                        aria-disabled
                                      >
                                        Record link unavailable
                                      </span>
                                    )}
                                    <CopyRecordLinkButton
                                      recordHref={href}
                                      recordTitle={title}
                                    />
                                  </div>
                                  <RemoveReadingListItemForm itemId={item.id} />
                                </>
                              );
                            })()}
                          </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="workspace-empty workspace-empty-guidance">
                        <p>No records are currently added to this list.</p>
                        <p>
                          Save records from the Library, then return here to export citations
                          as TXT or DOCX.
                        </p>
                        <Link href="/library" className="workspace-empty-action">
                          Browse Library
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <article className="workspace-tile workspace-reading-list-card">
              <div className="workspace-empty workspace-empty-guidance">
                <p>No reading lists yet.</p>
                <p>
                  Create a reading list from your workspace to organise records,
                  build teaching sets, or export citations later.
                </p>
                <Link href="/workspace" className="workspace-empty-action">
                  Create a reading list
                </Link>
              </div>
            </article>
          )}
        </section>
      </MemberDashboardShell>
    </PageShell>
  );
}
