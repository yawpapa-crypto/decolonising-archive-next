import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import CommunityContributionForm from "./CommunityContributionForm";
import { createCommunityContribution } from "./actions";

type SearchParams = Promise<{
  submitted?: string;
  updated?: string;
  error?: string;
}>;

type ReadingListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  user_id?: string;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  title: string;
  content_type: string;
  description: string;
  source_url: string | null;
  related_record_id?: string | null;
  related_reading_list_id?: string | null;
  visibility?: string | null;
  review_status: string;
  reviewer_note: string | null;
  created_at: string;
  user_id?: string;
};

const CONTRIBUTION_LABELS: Record<string, string> = {
  record: "Record",
  source: "Source",
  correction: "Correction",
  source_suggestion: "Source suggestion",
  record_correction: "Record correction",
  community_note: "Community note",
  contextual_reflection: "Contextual reflection",
  rights_concern: "Rights concern",
  broken_link: "Broken link",
  event_resource: "Event / resource",
  shared_reading_list: "Shared reading list",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Pending review",
  pending: "Pending review",
  in_review: "In review",
  accepted: "Approved",
  approved: "Approved",
  declined: "Rejected",
  rejected: "Rejected",
  needs_more_information: "Needs more information",
  resolved: "Resolved",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function labelFor(map: Record<string, string>, value: string) {
  return map[value] ?? value.replaceAll("_", " ");
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireMember("/community");
  const sp = await searchParams;
  const supabase = await createClient();
  const accountName =
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email ||
    "Archive member";

  const readingListsResult = await supabase
    .from("reading_lists")
    .select("id, title, description, is_public, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const ownSubmissionsResult = await supabase
    .from("submitted_content")
    .select(
      "id, title, content_type, description, source_url, related_record_id, related_reading_list_id, visibility, review_status, reviewer_note, created_at",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const sharedSubmissionsResult = await supabase
    .from("submitted_content")
    .select(
      "id, title, content_type, description, related_reading_list_id, visibility, review_status, created_at, user_id",
    )
    .eq("content_type", "shared_reading_list")
    .in("review_status", ["accepted", "approved", "resolved"])
    .not("related_reading_list_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);

  const readingLists = (readingListsResult.data ?? []) as ReadingListRow[];
  const ownSubmissions = ownSubmissionsResult.error
    ? []
    : ((ownSubmissionsResult.data ?? []) as SubmissionRow[]);
  const sharedSubmissions = sharedSubmissionsResult.error
    ? []
    : ((sharedSubmissionsResult.data ?? []) as SubmissionRow[]);
  const sharedListIds = sharedSubmissions
    .map((submission) => submission.related_reading_list_id)
    .filter((id): id is string => Boolean(id));

  const sharedListsResult = sharedListIds.length
    ? await supabase
        .from("reading_lists")
        .select("id, title, description, is_public, user_id, created_at")
        .in("id", sharedListIds)
        .eq("is_public", true)
    : { data: [], error: null };

  const sharedItemsResult = sharedListIds.length
    ? await supabase
        .from("reading_list_items")
        .select("reading_list_id")
        .in("reading_list_id", sharedListIds)
    : { data: [], error: null };

  const sharedLists = (sharedListsResult.data ?? []) as ReadingListRow[];
  const sharedListById = new Map(sharedLists.map((list) => [list.id, list]));
  const sharedItemCounts = new Map<string, number>();
  for (const item of (sharedItemsResult.data ?? []) as Array<{ reading_list_id: string }>) {
    sharedItemCounts.set(
      item.reading_list_id,
      (sharedItemCounts.get(item.reading_list_id) ?? 0) + 1,
    );
  }
  const migrationWarning =
    ownSubmissionsResult.error || sharedSubmissionsResult.error
      ? "Community contribution metadata needs the latest Supabase migration before every field can load."
      : "";
  const visibleSharedLists = sharedSubmissions
    .map((submission) => {
      const listId = submission.related_reading_list_id;
      const list = listId ? sharedListById.get(listId) : null;
      if (!list || !list.is_public) return null;
      return { submission, list, count: sharedItemCounts.get(list.id) ?? 0 };
    })
    .filter(
      (
        item,
      ): item is {
        submission: SubmissionRow;
        list: ReadingListRow;
        count: number;
      } => Boolean(item),
    );

  return (
    <PageShell>
      <main className="community-page">
        <section className="community-header community-card">
          <div>
            <p className="community-eyebrow">Community contributions</p>
            <h1>Contribute to the archive</h1>
            <p>
              Share source suggestions, corrections, contextual notes, and rights
              concerns for curator review. Contributions are moderated before they
              appear anywhere public.
            </p>
          </div>
          <div className="community-header-actions">
            <a href="#community-form" className="community-button community-button-primary">
              Submit contribution
            </a>
            <a href="#my-submissions" className="community-button community-button-secondary">
              View my submissions
            </a>
            <Link href="/workspace" className="community-button community-button-secondary">
              Workspace
            </Link>
          </div>
        </section>

        {sp.updated ? (
          <div className="community-success" aria-live="polite">
            {sp.updated}
          </div>
        ) : null}
        {sp.error ? (
          <div className="community-error" aria-live="polite">
            {sp.error}
          </div>
        ) : null}
        {migrationWarning ? (
          <div className="community-error" aria-live="polite">
            {migrationWarning}
          </div>
        ) : null}

        <section className="community-grid">
          <article className="community-card" id="community-form">
            <div className="community-card-header">
              <p className="community-eyebrow">For curator review</p>
              <h2>Submit a contribution</h2>
              <p>
                Send a source, correction, note, concern, or public reading list into
                the review queue.
              </p>
            </div>
            <CommunityContributionForm
              action={createCommunityContribution}
              readingLists={readingLists}
            />
          </article>

          <aside className="community-card">
            <div className="community-card-header">
              <p className="community-eyebrow">What belongs here</p>
              <h2>Contribution guidance</h2>
            </div>
            <ul className="community-guidance-list">
              <li>Suggest a source that extends the archive.</li>
              <li>Correct metadata, names, dates, links, or source details.</li>
              <li>Add cultural, historical, or contextual notes.</li>
              <li>Report broken links or inaccessible records.</li>
              <li>Raise rights, takedown, or custodianship concerns.</li>
              <li>Share a public reading list for curator review.</li>
            </ul>
            <p className="community-note">
              This is a controlled contribution layer, not an open forum. Replies,
              likes, votes, and public threads are intentionally not included.
            </p>
          </aside>
        </section>

        <section className="community-card" id="my-submissions">
          <div className="community-card-header community-card-header-row">
            <div>
              <p className="community-eyebrow">My review queue</p>
              <h2>My submissions</h2>
            </div>
            <span className="community-muted">Signed in as {accountName}</span>
          </div>
          <div className="community-submission-list">
            {ownSubmissions.length ? (
              ownSubmissions.map((submission) => (
                <article className="community-submission-item" key={submission.id}>
                  <div>
                    <div className="community-submission-topline">
                      <strong>{submission.title}</strong>
                      <span className={`community-status-pill is-${submission.review_status}`}>
                        {labelFor(STATUS_LABELS, submission.review_status)}
                      </span>
                    </div>
                    <p>{submission.description}</p>
                    <div className="community-submission-meta">
                      <span>{labelFor(CONTRIBUTION_LABELS, submission.content_type)}</span>
                      <span>{formatDate(submission.created_at)}</span>
                      {submission.related_record_id ? (
                        <span>Record {submission.related_record_id}</span>
                      ) : null}
                    </div>
                    {submission.reviewer_note ? (
                      <p className="community-reviewer-note">
                        Curator note: {submission.reviewer_note}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="community-empty">
                No submissions yet. Share a source, correction, or note to support the archive.
              </div>
            )}
          </div>
        </section>

        <section className="community-card">
          <div className="community-card-header community-card-header-row">
            <div>
              <p className="community-eyebrow">Community reading lists</p>
              <h2>Approved shared lists</h2>
              <p>Public lists shared by members and approved through curator review.</p>
            </div>
          </div>
          <div className="community-reading-list-grid">
            {visibleSharedLists.length ? (
              visibleSharedLists.map(({ submission, list, count }) => (
                <article className="community-shared-list-card" key={submission.id}>
                  <div className="community-submission-topline">
                    <strong>{list.title}</strong>
                    <span className="community-status-pill is-public">Public</span>
                  </div>
                  <p>{list.description || submission.description || "No description added."}</p>
                  <div className="community-submission-meta">
                    <span>
                      Shared by {submission.user_id === profile.id ? accountName : "Archive member"}
                    </span>
                    <span>
                      {count} {count === 1 ? "record" : "records"}
                    </span>
                    <span>{formatDate(submission.created_at)}</span>
                  </div>
                  <Link
                    href={`/community/reading-lists/${list.id}`}
                    className="community-button community-button-secondary"
                  >
                    View reading list
                  </Link>
                </article>
              ))
            ) : (
              <div className="community-empty">
                No shared reading lists yet. Members can share public lists for curator review.
              </div>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
