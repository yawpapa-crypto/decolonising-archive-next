import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { requireMember, hasRole } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords, type ArchiveRecord } from "@/lib/records";
import {
  addRecordToReadingList,
  createBookmark,
  createReadingList,
  createSavedSearch,
  deleteBookmark,
  deleteSavedSearch,
  saveProfileDetails,
  submitSupportRequest,
  submitContent,
} from "./actions";
import WorkspaceSettingsPanel from "./WorkspaceSettingsPanel";

type SearchParams = Promise<{
  denied?: string;
  updated?: string;
  error?: string;
  section?: string;
}>;

type BookmarkRow = {
  id: string;
  record_id: string;
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

const WORKSPACE_SECTIONS = [
  "overview",
  "bookmarks",
  "saved-searches",
  "reading-lists",
  "submissions",
  "profile",
  "notifications",
  "help",
  "settings",
] as const;

type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

type NotificationItem = {
  id: string;
  title: string;
  type:
    | "archive update"
    | "saved search alert"
    | "admin announcement"
    | "support reply"
    | "account notice";
  unread: boolean;
  created_at: string;
};

function normalizeSection(value: string | undefined): WorkspaceSection {
  if (!value) return "overview";
  return (WORKSPACE_SECTIONS as readonly string[]).includes(value)
    ? (value as WorkspaceSection)
    : "overview";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function recordTitle(recordsById: Map<string, ArchiveRecord>, recordId: string) {
  return recordsById.get(recordId)?.title ?? recordId;
}

function RecordSelect({
  records,
  name = "record_id",
}: {
  records: ArchiveRecord[];
  name?: string;
}) {
  return (
    <select name={name} required>
      <option value="">Choose record</option>
      {records.slice(0, 80).map((record) => (
        <option key={record.id} value={record.id}>
          {record.title}
        </option>
      ))}
    </select>
  );
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
      .select("id, record_id, note, created_at")
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
    new Map<string, number>()
  );

  const roleLabel =
    profile.role === "admin"
      ? "Admin"
      : profile.role === "curator"
        ? "Curator"
        : "Member";
  const workspaceHeading = profile.role === "admin" ? "Admin Workspace" : "Member Workspace";
  const roleBadgeLabel =
    profile.role === "admin"
      ? "ADMIN"
      : profile.role === "curator"
        ? "CURATOR"
        : "MEMBER";
  const currentSection = normalizeSection(sp.section);
  const notifications: NotificationItem[] = [];
  const unreadNotifications = notifications.filter((item) => item.unread).length;

  return (
    <PageShell>
      <main className="workspace-page">
        <header className="workspace-header">
          <p className="workspace-eyebrow">{workspaceHeading}</p>
          <div className="workspace-titlebar">
            <h1>{profile.full_name ?? profile.email ?? workspaceHeading}</h1>
            <span className={`role-badge role-${profile.role}`}>{roleBadgeLabel}</span>
          </div>
          <p className="workspace-sub">
            Save records, rerun useful searches, assemble reading lists, and
            send community knowledge into the curator review queue.
          </p>
          <div className="workspace-actions workspace-actions-header">
            <Link href="/my/bookmarks" className="workspace-cta workspace-cta-secondary">
              View bookmarks
            </Link>
            <Link href="/my/lists" className="workspace-cta workspace-cta-secondary">
              Reading lists
            </Link>
            <Link href="/my/searches" className="workspace-cta workspace-cta-secondary">
              Saved searches
            </Link>
          </div>
        </header>

        {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}
        {sp.error ? <p className="auth-error">{sp.error}</p> : null}
        {sp.denied === "curator" ? (
          <p className="auth-notice">
            Curator access required for that page. Contact an Admin if you need
            editorial permissions.
          </p>
        ) : null}
        {sp.denied === "admin" ? (
          <p className="auth-notice">Admin access required for that page.</p>
        ) : null}

        <nav className="workspace-nav" aria-label="Workspace sections">
          <Link
            href="/workspace?section=overview"
            className={`workspace-nav-link ${currentSection === "overview" ? "is-active" : ""}`}
          >
            Overview
          </Link>
          <Link
            href="/workspace?section=bookmarks"
            className={`workspace-nav-link ${currentSection === "bookmarks" ? "is-active" : ""}`}
          >
            Bookmarks
          </Link>
          <Link
            href="/workspace?section=saved-searches"
            className={`workspace-nav-link ${currentSection === "saved-searches" ? "is-active" : ""}`}
          >
            Saved Searches
          </Link>
          <Link
            href="/workspace?section=reading-lists"
            className={`workspace-nav-link ${currentSection === "reading-lists" ? "is-active" : ""}`}
          >
            Reading Lists
          </Link>
          <Link
            href="/workspace?section=submissions"
            className={`workspace-nav-link ${currentSection === "submissions" ? "is-active" : ""}`}
          >
            Submissions
          </Link>
          <Link
            href="/workspace?section=profile"
            className={`workspace-nav-link ${currentSection === "profile" ? "is-active" : ""}`}
          >
            Profile
          </Link>
          <Link
            href="/workspace?section=notifications"
            className={`workspace-nav-link ${currentSection === "notifications" ? "is-active" : ""}`}
          >
            Notifications
            <span className="workspace-nav-badge">{unreadNotifications}</span>
          </Link>
          <Link
            href="/workspace?section=help"
            className={`workspace-nav-link ${currentSection === "help" ? "is-active" : ""}`}
          >
            Help
          </Link>
          <Link
            href="/workspace?section=settings"
            className={`workspace-nav-link ${currentSection === "settings" ? "is-active" : ""}`}
          >
            Settings
          </Link>
        </nav>

        {currentSection === "overview" ? (
          <section className="workspace-metrics" aria-label="Workspace overview">
            <div className="workspace-metric-card">
              <div className="workspace-metric-head">
                <p>Bookmarks</p>
                <span>Active</span>
              </div>
              <span>{bookmarks.length}</span>
            </div>
            <div className="workspace-metric-card">
              <div className="workspace-metric-head">
                <p>Saved searches</p>
                <span>Reusable</span>
              </div>
              <span>{savedSearches.length}</span>
            </div>
            <div className="workspace-metric-card">
              <div className="workspace-metric-head">
                <p>Reading lists</p>
                <span>Curated</span>
              </div>
              <span>{readingLists.length}</span>
            </div>
            <div className="workspace-metric-card">
              <div className="workspace-metric-head">
                <p>Submissions</p>
                <span>In review</span>
              </div>
              <span>{submissions.length}</span>
            </div>
          </section>
        ) : null}

        {currentSection === "overview" || currentSection === "bookmarks" ? (
          <section className="workspace-grid workspace-grid-three">
            <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Bookmarks</h2>
              <Link href="/my/bookmarks" className="workspace-link">
                View all
              </Link>
            </div>
            <form action={createBookmark} className="workspace-form">
              <label>
                <span>Record</span>
                <RecordSelect records={records} />
              </label>
              <label>
                <span>Private note</span>
                <input name="note" placeholder="Why this record matters" />
              </label>
              <button type="submit" className="workspace-cta">
                Save bookmark
              </button>
            </form>
            <div className="workspace-list">
              {bookmarks.length ? (
                bookmarks.slice(0, 5).map((bookmark) => (
                  <div className="workspace-list-item" key={bookmark.id}>
                    <strong>{recordTitle(recordsById, bookmark.record_id)}</strong>
                    <span>{bookmark.note || "No note added"}</span>
                    <form action={deleteBookmark}>
                      <input type="hidden" name="id" value={bookmark.id} />
                      <button type="submit" className="workspace-link">
                        Remove
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No bookmarks yet.</p>
              )}
            </div>
            </article>
          </section>
        ) : null}

        {currentSection === "overview" || currentSection === "saved-searches" ? (
          <section className="workspace-grid workspace-grid-three">
            <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Saved searches</h2>
              <Link href="/my/searches" className="workspace-link">
                View all
              </Link>
            </div>
            <form action={createSavedSearch} className="workspace-form">
              <label>
                <span>Label</span>
                <input name="label" placeholder="Restitution leads" />
              </label>
              <label>
                <span>Query</span>
                <input name="query" placeholder="Benin bronzes restitution" required />
              </label>
              <button type="submit" className="workspace-cta">
                Save search
              </button>
            </form>
            <div className="workspace-list">
              {savedSearches.length ? (
                savedSearches.slice(0, 5).map((search) => (
                  <div className="workspace-list-item" key={search.id}>
                    <strong>{search.label}</strong>
                    <Link
                      href={`/library?q=${encodeURIComponent(search.query)}`}
                      className="workspace-link"
                    >
                      {search.query}
                    </Link>
                    <form action={deleteSavedSearch}>
                      <input type="hidden" name="id" value={search.id} />
                      <button type="submit" className="workspace-link">
                        Remove
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No saved searches yet.</p>
              )}
            </div>
            </article>
          </section>
        ) : null}

        {currentSection === "overview" || currentSection === "reading-lists" ? (
          <section className="workspace-grid workspace-grid-three">
            <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Reading lists</h2>
              <Link href="/my/lists" className="workspace-link">
                View all
              </Link>
            </div>
            <form action={createReadingList} className="workspace-form">
              <label>
                <span>Title</span>
                <input name="title" placeholder="Week 1 seminar records" required />
              </label>
              <label>
                <span>Description</span>
                <textarea name="description" rows={3} placeholder="Focus and use" />
              </label>
              <label className="workspace-check">
                <input type="checkbox" name="is_public" />
                <span>Make public</span>
              </label>
              <button type="submit" className="workspace-cta">
                Create list
              </button>
            </form>
            {readingLists.length ? (
              <form action={addRecordToReadingList} className="workspace-form compact">
                <label>
                  <span>Add record</span>
                  <RecordSelect records={records} />
                </label>
                <label>
                  <span>To list</span>
                  <select name="reading_list_id" required>
                    <option value="">Choose list</option>
                    {readingLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="workspace-cta workspace-cta-secondary">
                  Add to list
                </button>
              </form>
            ) : null}
            <div className="workspace-list">
              {readingLists.length ? (
                readingLists.slice(0, 5).map((list) => (
                  <div className="workspace-list-item" key={list.id}>
                    <strong>{list.title}</strong>
                    <span>
                      {readingListItemCounts.get(list.id) ?? 0} records ·{" "}
                      {list.is_public ? "Public" : "Private"}
                    </span>
                    {list.description ? <span>{list.description}</span> : null}
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No reading lists yet.</p>
              )}
            </div>
            </article>
          </section>
        ) : null}

        {currentSection === "overview" || currentSection === "submissions" ? (
          <section className="workspace-elevated workspace-submit-panel">
          <div>
            <h2>Submitted content</h2>
            <p>
              Share a record lead, source correction, or community note for
              curator review.
            </p>
          </div>
          <form action={submitContent} className="workspace-form workspace-wide-form">
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
            <button type="submit" className="workspace-cta">
              Submit for review
            </button>
          </form>

          <div className="workspace-list">
            {submissions.length ? (
              submissions.slice(0, 5).map((submission) => (
                <div className="workspace-list-item horizontal" key={submission.id}>
                  <strong>{submission.title}</strong>
                  <span>{submission.content_type}</span>
                  <span className={`workspace-status is-${submission.review_status}`}>
                    {submission.review_status.replace("_", " ")}
                  </span>
                  <span>{formatDate(submission.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="workspace-empty">No submitted content yet.</p>
            )}
          </div>
          </section>
        ) : null}

        {currentSection === "notifications" ? (
          <section className="workspace-elevated">
            <h2>Notifications</h2>
            <p>Unread: {unreadNotifications}</p>
            <div className="workspace-list">
              {notifications.length ? (
                notifications.map((item) => (
                  <div className="workspace-list-item" key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.type}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No notifications yet.</p>
              )}
            </div>
          </section>
        ) : null}

        {currentSection === "help" ? (
          <>
            <section className="workspace-grid workspace-grid-three">
              {[
                ["Searching the archive", "Use filters and keywords to narrow large result sets quickly."],
                ["Saving records", "Bookmark records to keep track of sources and return later."],
                ["Creating reading lists", "Group records into private or public thematic lists."],
                ["Submitting corrections", "Send factual fixes and additions for curator review."],
                ["Requesting a source", "Ask for a source pathway to be added to the archive."],
                ["Reporting a broken link", "Flag invalid URLs so editors can update records."],
              ].map(([title, description]) => (
                <article key={title} className="workspace-tile">
                  <h2>{title}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </section>

            <section className="workspace-elevated">
              <h2>Support</h2>
              <form action={submitSupportRequest} className="workspace-form workspace-wide-form">
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
                <button type="submit" className="workspace-cta">
                  Submit support request
                </button>
              </form>
            </section>
          </>
        ) : null}

        {currentSection === "settings" ? (
          <section className="workspace-elevated">
            <h2>Settings</h2>
            <WorkspaceSettingsPanel />
            <form action="/auth/signout" method="post">
              <button type="submit" className="workspace-link workspace-signout">
                Sign out
              </button>
            </form>
          </section>
        ) : null}

        {currentSection === "overview" || currentSection === "profile" ? (
          <section className="workspace-profile-row">
            <article className="workspace-tile">
            <h2>Profile</h2>
            <p>Email: {profile.email ?? "-"}</p>
            <p>Role: {roleLabel}</p>
            <form action={saveProfileDetails} className="workspace-form">
              <label>
                <span>Display name</span>
                <input name="display_name" defaultValue={profile.full_name ?? ""} />
              </label>
              <label>
                <span>Full name</span>
                <input name="full_name" defaultValue={profile.full_name ?? ""} />
              </label>
              <label>
                <span>Institution / organisation</span>
                <input name="institution" />
              </label>
              <label>
                <span>Research interests</span>
                <input name="research_interests" />
              </label>
              <label>
                <span>Website</span>
                <input name="website" placeholder="https://..." />
              </label>
              <label>
                <span>Short bio</span>
                <textarea name="bio" rows={4} />
              </label>
              <button type="submit" className="workspace-cta">
                Save profile
              </button>
            </form>
          </article>

            {hasRole(profile, "curator") ? (
              <article className="workspace-tile">
              <h2>Editorial tools</h2>
              <p>
                You have curator access for dossiers, notes, featured records,
                pathways, submissions, and editorial analytics.
              </p>
              <div className="workspace-actions">
                <Link href="/curator" className="workspace-cta">
                  Open curator workspace
                </Link>
                {hasRole(profile, "admin") ? (
                  <Link href="/admin" className="workspace-cta workspace-cta-secondary">
                    Open admin
                  </Link>
                ) : null}
              </div>
              </article>
            ) : null}
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
