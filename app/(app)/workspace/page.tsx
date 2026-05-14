import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { hasRole, requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords, type ArchiveRecord } from "@/lib/records";
import {
  createBookmark,
  createReadingList,
  createSavedSearch,
  deleteBookmark,
  deleteSavedSearch,
  submitContent,
  submitSupportRequest,
} from "./actions";
import ConfirmSubmitButton from "./ConfirmSubmitButton";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";
import MemberProfileEditor from "./MemberProfileEditor";
import { getMemberProfileRow } from "./member-profile-actions";
import { buildFallbackMemberProfile } from "@/src/lib/member-profile";
import MemberDashboardShell, {
  MEMBER_DASHBOARD_NAV_ITEMS,
  type MemberDashboardSection,
} from "./MemberDashboardShell";
import WorkspaceSettingsPanel from "./WorkspaceSettingsPanel";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";

type SearchParams = Promise<{
  denied?: string;
  updated?: string;
  error?: string;
  section?: string;
}>;

type BookmarkRow = {
  id: string;
  record_id: string;
  record_title: string | null;
  record_source: string | null;
  record_source_url: string | null;
  record_type: string | null;
  record_year: string | null;
  record_metadata: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
};

type SavedSearchRow = {
  id: string;
  label: string;
  query: string;
  created_at: string;
};

type ReadingListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
};

type ReadingListItemRow = {
  reading_list_id: string;
};

type SubmittedContentRow = {
  id: string;
  title: string;
  content_type: string;
  review_status: string;
  created_at: string;
};

const WORKSPACE_SECTIONS = MEMBER_DASHBOARD_NAV_ITEMS.map((item) => item.id);

function normalizeSection(value: string | undefined): MemberDashboardSection {
  if (!value) return "overview";
  return (WORKSPACE_SECTIONS as readonly string[]).includes(value)
    ? (value as MemberDashboardSection)
    : "overview";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function bookmarkRecordCandidates(recordId: string) {
  const candidates = [recordId];

  const withoutTrailingDuplicateNumber = recordId.replace(/-\d+$/, "");
  if (withoutTrailingDuplicateNumber !== recordId) {
    candidates.push(withoutTrailingDuplicateNumber);
  }

  return Array.from(new Set(candidates));
}

function getWorkspaceRecord(
  recordsById: Map<string, ArchiveRecord>,
  recordId: string,
) {
  for (const candidate of bookmarkRecordCandidates(recordId)) {
    const record = recordsById.get(candidate);
    if (record) return record;
  }

  return undefined;
}

function readableRecordIdFallback(recordId: string) {
  const cleaned = recordId
    .replace(/^live-openalex-https-openalex-org-/i, "OpenAlex ")
    .replace(/^live-/i, "")
    .replace(/-/g, " ")
    .trim();

  return cleaned ? `Untitled record (${cleaned})` : "Untitled record";
}

function recordTitle(recordsById: Map<string, ArchiveRecord>, recordId: string) {
  const record = getWorkspaceRecord(recordsById, recordId) as
    | (ArchiveRecord & Record<string, unknown>)
    | undefined;

  const metadata =
    record?.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : {};

  const data =
    record?.data && typeof record.data === "object" && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {};

  const raw =
    record?.raw && typeof record.raw === "object" && !Array.isArray(record.raw)
      ? (record.raw as Record<string, unknown>)
      : {};

  const title =
    record?.title ||
    (typeof record?.name === "string" ? record.name : "") ||
    (typeof record?.record_title === "string" ? record.record_title : "") ||
    (typeof metadata.title === "string" ? metadata.title : "") ||
    (typeof metadata.display_name === "string" ? metadata.display_name : "") ||
    (typeof metadata.displayTitle === "string" ? metadata.displayTitle : "") ||
    (typeof metadata.display_title === "string" ? metadata.display_title : "") ||
    (typeof data.title === "string" ? data.title : "") ||
    (typeof raw.title === "string" ? raw.title : "");

  return title?.trim() || readableRecordIdFallback(recordId);
}

function RecordSelect({ records }: { records: ArchiveRecord[] }) {
  return (
    <select name="record_id" required>
      <option value="">Choose record</option>
      {records.slice(0, 80).map((record) => (
        <option key={record.id} value={record.id}>
          {record.title}
        </option>
      ))}
    </select>
  );
}

function redirectInput(section: MemberDashboardSection) {
  return <input type="hidden" name="redirectTo" value={`/workspace?section=${section}`} />;
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireMember();
  const sp = await searchParams;
  const supabase = await createClient();
  const records = (await readRecords()).filter((record) => record.published);
  const recordsById = new Map(records.map((record) => [record.id, record]));

  const [
    bookmarksResult,
    savedSearchesResult,
    readingListsResult,
    readingListItemsResult,
    submissionsResult,
  ] = await Promise.all([
    supabase
      .from("bookmarks")
      .select("id, record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata, note, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_searches")
      .select("id, label, query, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("reading_lists")
      .select("id, title, description, is_public, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("reading_list_items").select("reading_list_id"),
    supabase
      .from("submitted_content")
      .select("id, title, content_type, review_status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const bookmarks = (bookmarksResult.data ?? []) as BookmarkRow[];
  const savedSearches = (savedSearchesResult.data ?? []) as SavedSearchRow[];
  const readingLists = (readingListsResult.data ?? []) as ReadingListRow[];
  const readingListItems =
    (readingListItemsResult.data ?? []) as ReadingListItemRow[];
  const submissions = (submissionsResult.data ?? []) as SubmittedContentRow[];
  const readingListItemCounts = readingListItems.reduce(
    (counts, item) =>
      counts.set(item.reading_list_id, (counts.get(item.reading_list_id) ?? 0) + 1),
    new Map<string, number>(),
  );

  const roleLabel =
    profile.role === "admin"
      ? "ADMIN"
      : profile.role === "curator"
        ? "CURATOR"
        : "MEMBER";
  const memberProfileForEditor =
    (await getMemberProfileRow()) ?? buildFallbackMemberProfile(profile);
  const accountDisplayName =
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email ||
    "Account";
  const currentSection = normalizeSection(sp.section);
  const sectionLabel =
    MEMBER_DASHBOARD_NAV_ITEMS.find((item) => item.id === currentSection)?.label ??
    "Overview";
  const notifications: Array<{
    id: string;
    title: string;
    type: string;
    created_at: string;
  }> = [];

  const bookmarkRows = bookmarks.map((bookmark) => {
    const openHref = getRecordHref(bookmark);
    return (
      <div className="workspace-list-item member-dashboard-list-item" key={bookmark.id}>
        <div className="member-dashboard-row-main">
          <strong>{bookmark.record_title || recordTitle(recordsById, bookmark.record_id)}</strong>
          <span>{bookmark.note || "No note added"}</span>
        </div>
        <div className="workspace-actions-inline member-dashboard-actions">
          {openHref ? (
            <a
              href={openHref}
              className="workspace-link"
              {...(isExternalHref(openHref)
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              Open record
            </a>
          ) : (
            <span className="workspace-link workspace-link-disabled" aria-disabled>
              Record link unavailable
            </span>
          )}
          <form action={deleteBookmark}>
            <input type="hidden" name="id" value={bookmark.id} />
            {redirectInput(currentSection)}
            <input type="hidden" name="confirm" value="yes" />
            <ConfirmSubmitButton
              className="workspace-link workspace-link-danger"
              message="Remove this bookmark?"
              pendingLabel="Removing…"
            >
              Remove
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    );
  });

  const searchRows = savedSearches.map((search) => (
    <div className="workspace-list-item member-dashboard-list-item" key={search.id}>
      <div className="member-dashboard-row-main">
        <strong>{search.label}</strong>
        <span>{search.query}</span>
      </div>
      <div className="workspace-actions-inline member-dashboard-actions">
        <a
          href={`/?q=${encodeURIComponent(search.query)}`}
          className="workspace-link"
        >
          Run search
        </a>
        <form action={deleteSavedSearch}>
          <input type="hidden" name="id" value={search.id} />
          {redirectInput(currentSection)}
          <input type="hidden" name="confirm" value="yes" />
          <ConfirmSubmitButton
            className="workspace-link workspace-link-danger"
            message="Delete this saved search? This cannot be undone."
            pendingLabel="Deleting…"
          >
            Remove
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  ));

  const readingListRows = readingLists.slice(0, 3).map((list) => {
    const itemCount = readingListItemCounts.get(list.id) ?? 0;

    return (
      <Link
        href="/my/lists"
        className="workspace-list-item workspace-reading-list-item member-dashboard-list-item member-reading-list-preview"
        key={list.id}
      >
        <div className="workspace-reading-list-main">
          <div className="workspace-reading-list-heading">
            <strong className="workspace-reading-list-title">{list.title}</strong>
            <span className="member-dashboard-pill">
              {list.is_public ? "Public" : "Private"}
            </span>
          </div>
          <p className="workspace-reading-list-description">
            {list.description || "No description added"}
          </p>
          <span className="workspace-reading-list-meta">
            {itemCount} {itemCount === 1 ? "record" : "records"}
          </span>
        </div>
      </Link>
    );
  });

  return (
    <PageShell>
      <MemberDashboardShell
        currentSection={currentSection}
        accountName={accountDisplayName}
        accountAvatarUrl={profile.avatar_url}
        roleLabel={roleLabel}
      >
        <header className="member-dashboard-header">
          <div>
            <p className="member-dashboard-eyebrow">Member workspace</p>
            <h1>{sectionLabel}</h1>
            <p>
              Save records, rerun searches, build reading lists, and send archive
              knowledge into curator review from one focused workspace.
            </p>
            <div className="member-dashboard-header-pills">
              <span className="member-dashboard-pill">Role: {roleLabel}</span>
              <span className="member-dashboard-pill">{bookmarks.length} bookmarks</span>
              <span className="member-dashboard-pill">{savedSearches.length} searches</span>
              <span className="member-dashboard-pill">{readingLists.length} lists</span>
            </div>
            {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}
            {sp.error ? <p className="auth-error">{sp.error}</p> : null}
            {sp.denied === "curator" ? (
              <p className="auth-notice">Curator access required for that page.</p>
            ) : null}
            {sp.denied === "admin" ? (
              <p className="auth-notice">Admin access required for that page.</p>
            ) : null}
          </div>
          <div className="member-dashboard-header-actions">
            <a href="/library" className="admin-button admin-button-secondary">
              Browse archive
            </a>
            <Link href="/my/lists" className="admin-button">
              Manage lists
            </Link>
          </div>
        </header>

        <section className="community-entry-panel">
          <Link href="/community" className="community-entry-card">
            <p className="dashboard-eyebrow">Community</p>
            <h2>Community Contributions</h2>
            <p>
              Share sources, corrections, contextual notes, and public reading lists for curator review.
            </p>
          </Link>
        </section>


        <div className="member-dashboard-content">
          {currentSection === "overview" ? (
            <>
              <section className="member-dashboard-metric-grid" aria-label="Workspace overview">
                {[
                  ["Bookmarks", bookmarks.length, "Records saved for return visits"],
                  ["Saved Searches", savedSearches.length, "Queries ready to run again"],
                  ["Reading Lists", readingLists.length, "Groups for teaching and citation"],
                  ["Submissions", submissions.length, "Items sent for curator review"],
                ].map(([label, value, description]) => (
                  <article className="member-dashboard-metric" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>{description}</p>
                  </article>
                ))}
              </section>

              <section className="member-dashboard-grid">
                <article className="member-dashboard-card">
                  <div className="member-dashboard-card-header">
                    <h2>Bookmarks</h2>
                    <Link href="/my/bookmarks" className="workspace-link">
                      View all
                    </Link>
                  </div>
                  <form action={createBookmark} className="member-dashboard-form">
                    {redirectInput(currentSection)}
                    <label>
                      <span>Record</span>
                      <RecordSelect records={records} />
                    </label>
                    <label>
                      <span>Private note</span>
                      <input name="note" placeholder="Why this record matters" />
                    </label>
                    <PendingSubmitButton
                      className="admin-button"
                      pendingLabel="Saving bookmark…"
                    >
                      Save bookmark
                    </PendingSubmitButton>
                  </form>
                  <div className="member-dashboard-list">
                    {bookmarkRows.length ? (
                      bookmarkRows.slice(0, 5)
                    ) : (
                      <p className="member-dashboard-empty">
                        No bookmarks yet. Save a record to return to it later.
                      </p>
                    )}
                  </div>
                </article>

                <article className="member-dashboard-card">
                  <div className="member-dashboard-card-header">
                    <h2>Saved Searches</h2>
                    <Link href="/my/searches" className="workspace-link">
                      View all
                    </Link>
                  </div>
                  <form action={createSavedSearch} className="member-dashboard-form">
                    {redirectInput(currentSection)}
                    <label>
                      <span>Label</span>
                      <input name="label" placeholder="Search name" required />
                    </label>
                    <label>
                      <span>Query</span>
                      <input name="query" placeholder="Search terms" required />
                    </label>
                    <PendingSubmitButton
                      className="admin-button"
                      pendingLabel="Saving search…"
                    >
                      Save search
                    </PendingSubmitButton>
                  </form>
                  <div className="member-dashboard-list">
                    {searchRows.length ? (
                      searchRows.slice(0, 5)
                    ) : (
                      <p className="member-dashboard-empty">
                        No saved searches yet. Save a search to return to it later.
                      </p>
                    )}
                  </div>
                </article>

                <article className="member-dashboard-card">
                  <div className="member-dashboard-card-header">
                    <h2>Reading Lists</h2>
                    <Link href="/my/lists" className="workspace-link">
                      Manage
                    </Link>
                  </div>
                  <form action={createReadingList} className="member-dashboard-form">
                    {redirectInput(currentSection)}
                    <label>
                      <span>Title</span>
                      <input name="title" placeholder="List name" required />
                    </label>
                    <label>
                      <span>Description</span>
                      <textarea name="description" rows={2} />
                    </label>
                    <label className="workspace-checkbox-label">
                      <input type="checkbox" name="is_public" />
                      <span>Make public</span>
                    </label>
                    <PendingSubmitButton
                      className="admin-button"
                      pendingLabel="Creating list…"
                    >
                      Create list
                    </PendingSubmitButton>
                  </form>
                  <div className="member-dashboard-list">
                    {readingListRows.length ? (
                      readingListRows
                    ) : (
                      <p className="member-dashboard-empty">
                        No reading lists yet. Create one to collect records and export citations.
                      </p>
                    )}
                  </div>
                </article>
              </section>

              <article className="member-dashboard-card member-dashboard-card-wide">
                <div className="member-dashboard-card-header">
                  <h2>Submitted Content</h2>
                </div>
                <form action={submitContent} className="member-dashboard-form member-dashboard-form-wide">
                  {redirectInput(currentSection)}
                  <label>
                    <span>Type</span>
                    <select name="content_type" defaultValue="record">
                      <option value="record">Record</option>
                      <option value="source">Source</option>
                      <option value="correction">Correction</option>
                      <option value="community_note">Community note</option>
                    </select>
                  </label>
                  <label>
                    <span>Title</span>
                    <input name="title" placeholder="Object, source, or correction title" required />
                  </label>
                  <label className="span-two">
                    <span>Description</span>
                    <textarea
                      name="description"
                      rows={4}
                      placeholder="What should curators know, verify, or add?"
                      required
                    />
                  </label>
                  <label>
                    <span>Source URL</span>
                    <input name="source_url" placeholder="https://..." />
                  </label>
                  <PendingSubmitButton className="admin-button" pendingLabel="Submitting…">
                    Submit for review
                  </PendingSubmitButton>
                </form>
                <div className="member-dashboard-list">
                  {submissions.length ? (
                    submissions.slice(0, 5).map((submission) => (
                      <div className="workspace-list-item member-dashboard-list-item" key={submission.id}>
                        <div className="member-dashboard-row-main">
                          <strong>{submission.title}</strong>
                          <span>
                            {submission.content_type} · {formatDate(submission.created_at)}
                          </span>
                        </div>
                        <span className="member-dashboard-pill">
                          {submission.review_status.replace("_", " ")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="member-dashboard-empty">No submitted content yet.</p>
                  )}
                </div>
              </article>
            </>
          ) : null}

          {currentSection === "bookmarks" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Bookmarks</h2>
              </div>
              <form action={createBookmark} className="member-dashboard-form">
                {redirectInput(currentSection)}
                <label>
                  <span>Record</span>
                  <RecordSelect records={records} />
                </label>
                <label>
                  <span>Private note</span>
                  <input name="note" placeholder="Why this record matters" />
                </label>
                <PendingSubmitButton className="admin-button" pendingLabel="Saving bookmark…">
                  Save bookmark
                </PendingSubmitButton>
              </form>
              <div className="member-dashboard-list">
                {bookmarkRows.length ? bookmarkRows : <p className="member-dashboard-empty">No bookmarks yet.</p>}
              </div>
            </article>
          ) : null}

          {currentSection === "saved-searches" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Saved Searches</h2>
              </div>
              <form action={createSavedSearch} className="member-dashboard-form">
                {redirectInput(currentSection)}
                <label>
                  <span>Label</span>
                  <input name="label" placeholder="Search name" required />
                </label>
                <label>
                  <span>Query</span>
                  <input name="query" placeholder="Search terms" required />
                </label>
                <PendingSubmitButton className="admin-button" pendingLabel="Saving search…">
                  Save search
                </PendingSubmitButton>
              </form>
              <div className="member-dashboard-list">
                {searchRows.length ? searchRows : <p className="member-dashboard-empty">No saved searches yet.</p>}
              </div>
            </article>
          ) : null}

          {currentSection === "reading-lists" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Reading Lists</h2>
                <Link href="/my/lists" className="admin-button admin-button-secondary">
                  Full management
                </Link>
              </div>
              <form action={createReadingList} className="member-dashboard-form">
                {redirectInput(currentSection)}
                <label>
                  <span>Title</span>
                  <input name="title" placeholder="List name" required />
                </label>
                <label>
                  <span>Description</span>
                  <textarea name="description" rows={2} />
                </label>
                <label className="workspace-checkbox-label">
                  <input type="checkbox" name="is_public" />
                  <span>Make public</span>
                </label>
                <PendingSubmitButton className="admin-button" pendingLabel="Creating list…">
                  Create list
                </PendingSubmitButton>
              </form>
              <div className="member-dashboard-list">
                {readingListRows.length ? readingListRows : <p className="member-dashboard-empty">No reading lists yet.</p>}
              </div>
            </article>
          ) : null}

          {currentSection === "submissions" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Submissions</h2>
              </div>
              <form action={submitContent} className="member-dashboard-form member-dashboard-form-wide">
                {redirectInput(currentSection)}
                <label>
                  <span>Type</span>
                  <select name="content_type" defaultValue="record">
                    <option value="record">Record</option>
                    <option value="source">Source</option>
                    <option value="correction">Correction</option>
                    <option value="community_note">Community note</option>
                  </select>
                </label>
                <label>
                  <span>Title</span>
                  <input name="title" required />
                </label>
                <label className="span-two">
                  <span>Description</span>
                  <textarea name="description" rows={5} required />
                </label>
                <label>
                  <span>Source URL</span>
                  <input name="source_url" placeholder="https://..." />
                </label>
                <PendingSubmitButton className="admin-button" pendingLabel="Submitting…">
                  Submit for review
                </PendingSubmitButton>
              </form>
            </article>
          ) : null}

          {currentSection === "profile" ? (
            <article className="member-dashboard-card member-dashboard-card-wide member-profile-article">
              <div className="member-dashboard-card-header">
                <h2>Profile</h2>
              </div>
              <MemberProfileEditor
                key={`${memberProfileForEditor.id}-${memberProfileForEditor.updated_at ?? ""}-${memberProfileForEditor.avatar_url ?? ""}`}
                initial={memberProfileForEditor}
                roleLabel={roleLabel}
              />
            </article>
          ) : null}

          {currentSection === "notifications" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Notifications</h2>
              </div>
              <div className="member-dashboard-list">
                {notifications.length ? (
                  notifications.map((item) => (
                    <div className="workspace-list-item member-dashboard-list-item" key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.type}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="member-dashboard-empty">No notifications yet.</p>
                )}
              </div>
            </article>
          ) : null}

          {currentSection === "help" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Help Centre</h2>
              </div>
              <div className="help-grid">
                {[
                  ["Searching the archive", "Use filters and keywords to narrow large result sets quickly."],
                  ["Saving records", "Bookmark records to keep track of sources and return later."],
                  ["Creating reading lists", "Group records into private or public thematic lists."],
                  ["Submitting corrections", "Send factual fixes and additions for curator review."],
                  ["Reporting a broken link", "Flag invalid URLs so editors can update records."],
                ].map(([title, description]) => (
                  <div key={title} className="help-tile admin-surface">
                    <h4>{title}</h4>
                    <p>{description}</p>
                  </div>
                ))}
              </div>
              <form action={submitSupportRequest} className="member-dashboard-form member-dashboard-form-wide">
                {redirectInput(currentSection)}
                <label>
                  <span>Category</span>
                  <select name="category" required defaultValue="General support">
                    <option>Account issue</option>
                    <option>Search issue</option>
                    <option>Broken source link</option>
                    <option>Suggest a source</option>
                    <option>General support</option>
                  </select>
                </label>
                <label>
                  <span>Subject</span>
                  <input name="subject" required />
                </label>
                <label className="span-two">
                  <span>Message</span>
                  <textarea name="message" rows={5} required />
                </label>
                <PendingSubmitButton className="admin-button" pendingLabel="Sending…">
                  Submit support request
                </PendingSubmitButton>
              </form>
            </article>
          ) : null}

          {currentSection === "settings" ? (
            <article className="member-dashboard-card member-dashboard-card-wide">
              <div className="member-dashboard-card-header">
                <h2>Settings</h2>
              </div>
              <WorkspaceSettingsPanel />
              {hasRole(profile, "curator") ? (
                <Link href="/curator" className="workspace-link">
                  Open curator workspace
                </Link>
              ) : null}
              {hasRole(profile, "admin") ? (
                <Link href="/admin" className="workspace-link">
                  Open admin
                </Link>
              ) : null}
            </article>
          ) : null}
        </div>
      </MemberDashboardShell>
    </PageShell>
  );
}
