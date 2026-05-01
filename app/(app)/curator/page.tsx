import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { requireCurator, hasRole } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords, type ArchiveRecord } from "@/lib/records";
import {
  createArchiveNote,
  createDossier,
  createPathway,
  featureRecord,
  reviewSubmittedContent,
} from "./actions";

type SearchParams = Promise<{ updated?: string; error?: string }>;

type DossierRow = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
};

type ArchiveNoteRow = {
  id: string;
  record_id: string | null;
  title: string;
  note: string;
  status: string;
  created_at: string;
};

type FeaturedRecordRow = {
  id: string;
  record_id: string;
  reason: string | null;
  placement: string;
  is_active: boolean;
  created_at: string;
};

type PathwayRow = {
  id: string;
  title: string;
  theme: string;
  description: string | null;
  status: string;
  created_at: string;
};

type SubmittedContentRow = {
  id: string;
  title: string;
  content_type: string;
  description: string;
  source_url: string | null;
  review_status: string;
  created_at: string;
};

function RecordSelect({ records }: { records: ArchiveRecord[] }) {
  return (
    <select name="record_id">
      <option value="">Choose record</option>
      {records.slice(0, 100).map((record) => (
        <option key={record.id} value={record.id}>
          {record.title}
        </option>
      ))}
    </select>
  );
}

function recordTitle(recordsById: Map<string, ArchiveRecord>, recordId: string) {
  return recordsById.get(recordId)?.title ?? recordId;
}

function statusClass(status: string) {
  return `workspace-status is-${status}`;
}

export default async function CuratorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireCurator();
  const sp = await searchParams;
  const isAdmin = hasRole(profile, "admin");
  const supabase = await createClient();
  const records = (await readRecords()).filter((record) => record.published);
  const recordsById = new Map(records.map((record) => [record.id, record]));

  const [
    dossiersResult,
    notesResult,
    featuredResult,
    pathwaysResult,
    submissionsResult,
  ] = await Promise.all([
    supabase
      .from("curator_dossiers")
      .select("id, title, summary, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("archive_notes")
      .select("id, record_id, title, note, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("featured_records")
      .select("id, record_id, reason, placement, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("themed_pathways")
      .select("id, title, theme, description, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("submitted_content")
      .select("id, title, content_type, description, source_url, review_status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const dossiers = (dossiersResult.data ?? []) as DossierRow[];
  const notes = (notesResult.data ?? []) as ArchiveNoteRow[];
  const featured = (featuredResult.data ?? []) as FeaturedRecordRow[];
  const pathways = (pathwaysResult.data ?? []) as PathwayRow[];
  const submissions = (submissionsResult.data ?? []) as SubmittedContentRow[];
  const pendingSubmissions = submissions.filter(
    (item) => item.review_status === "submitted" || item.review_status === "in_review"
  );
  const publishedCount =
    dossiers.filter((item) => item.status === "published").length +
    notes.filter((item) => item.status === "published").length +
    pathways.filter((item) => item.status === "published").length;

  return (
    <PageShell>
      <main className="workspace-page curator-workspace">
        <header className="workspace-header">
          <p className="workspace-eyebrow">Editorial tools</p>
          <div className="workspace-titlebar">
            <h1>Curator workspace</h1>
            <span className={`role-badge role-${profile.role}`}>
              {profile.role === "admin" ? "Admin" : "Curator"}
            </span>
          </div>
          <p className="workspace-sub">
            Build dossiers, annotate archive records, feature discoveries,
            shape themed pathways, review member submissions, and watch the
            editorial pipeline.
          </p>
          <div className="workspace-actions">
            <Link href="/curator/media" className="workspace-cta">
              Open media library
            </Link>
          </div>
        </header>

        {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}
        {sp.error ? <p className="auth-error">{sp.error}</p> : null}

        <section className="workspace-metrics" aria-label="Curator overview">
          <div>
            <span>{dossiers.length}</span>
            <p>Dossiers</p>
          </div>
          <div>
            <span>{notes.length}</span>
            <p>Archive notes</p>
          </div>
          <div>
            <span>{featured.filter((item) => item.is_active).length}</span>
            <p>Featured</p>
          </div>
          <div>
            <span>{pendingSubmissions.length}</span>
            <p>Review queue</p>
          </div>
          <div>
            <span>{publishedCount}</span>
            <p>Published editorial items</p>
          </div>
        </section>

        <section className="workspace-grid workspace-grid-three">
          <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Curated dossiers</h2>
            </div>
            <form action={createDossier} className="workspace-form">
              <label>
                <span>Title</span>
                <input name="title" placeholder="Restitution dossier" required />
              </label>
              <label>
                <span>Summary</span>
                <textarea name="summary" rows={4} placeholder="Narrative frame" />
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <button type="submit" className="workspace-cta">
                Create dossier
              </button>
            </form>
            <div className="workspace-list">
              {dossiers.length ? (
                dossiers.slice(0, 4).map((dossier) => (
                  <div className="workspace-list-item" key={dossier.id}>
                    <strong>{dossier.title}</strong>
                    <span>{dossier.summary || "No summary yet"}</span>
                    <span className={statusClass(dossier.status)}>{dossier.status}</span>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No dossiers yet.</p>
              )}
            </div>
          </article>

          <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Archive notes</h2>
            </div>
            <form action={createArchiveNote} className="workspace-form">
              <label>
                <span>Record</span>
                <RecordSelect records={records} />
              </label>
              <label>
                <span>Title</span>
                <input name="title" placeholder="Provenance caution" required />
              </label>
              <label>
                <span>Note</span>
                <textarea name="note" rows={4} placeholder="Curatorial context" required />
              </label>
              <button type="submit" className="workspace-cta">
                Save note
              </button>
            </form>
            <div className="workspace-list">
              {notes.length ? (
                notes.slice(0, 4).map((note) => (
                  <div className="workspace-list-item" key={note.id}>
                    <strong>{note.title}</strong>
                    <span>
                      {note.record_id
                        ? recordTitle(recordsById, note.record_id)
                        : "General note"}
                    </span>
                    <span>{note.note}</span>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No archive notes yet.</p>
              )}
            </div>
          </article>

          <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Featured records</h2>
              <Link href="/library" className="workspace-link">
                Browse library
              </Link>
            </div>
            <form action={featureRecord} className="workspace-form">
              <label>
                <span>Record</span>
                <RecordSelect records={records} />
              </label>
              <label>
                <span>Placement</span>
                <select name="placement" defaultValue="homepage">
                  <option value="homepage">Homepage</option>
                  <option value="library">Library</option>
                  <option value="pathway">Pathway</option>
                </select>
              </label>
              <label>
                <span>Reason</span>
                <input name="reason" placeholder="Why feature this now?" />
              </label>
              <button type="submit" className="workspace-cta">
                Feature record
              </button>
            </form>
            <div className="workspace-list">
              {featured.length ? (
                featured.slice(0, 4).map((item) => (
                  <div className="workspace-list-item" key={item.id}>
                    <strong>{recordTitle(recordsById, item.record_id)}</strong>
                    <span>{item.placement}</span>
                    <span>{item.reason || "No feature note"}</span>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">Nothing featured yet.</p>
              )}
            </div>
          </article>

          <article className="workspace-tile workspace-tool">
            <div className="workspace-tile-head">
              <h2>Themed pathways</h2>
            </div>
            <form action={createPathway} className="workspace-form">
              <label>
                <span>Title</span>
                <input name="title" placeholder="Sonic archives pathway" required />
              </label>
              <label>
                <span>Theme</span>
                <input name="theme" placeholder="Music, memory, language" required />
              </label>
              <label>
                <span>Description</span>
                <textarea name="description" rows={4} placeholder="Pathway scope" />
              </label>
              <button type="submit" className="workspace-cta">
                Build pathway
              </button>
            </form>
            <div className="workspace-list">
              {pathways.length ? (
                pathways.slice(0, 4).map((pathway) => (
                  <div className="workspace-list-item" key={pathway.id}>
                    <strong>{pathway.title}</strong>
                    <span>{pathway.theme}</span>
                    <span className={statusClass(pathway.status)}>{pathway.status}</span>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">No themed pathways yet.</p>
              )}
            </div>
          </article>

          <article className="workspace-tile workspace-tool span-two">
            <div className="workspace-tile-head">
              <h2>Submitted content</h2>
              <Link href="/workspace" className="workspace-link">
                Member view
              </Link>
            </div>
            <div className="workspace-list queue">
              {submissions.length ? (
                submissions.slice(0, 6).map((submission) => (
                  <div className="workspace-list-item review-item" key={submission.id}>
                    <div>
                      <strong>{submission.title}</strong>
                      <span>{submission.content_type}</span>
                      <span>{submission.description}</span>
                      {submission.source_url ? (
                        <a href={submission.source_url} className="workspace-link">
                          Source
                        </a>
                      ) : null}
                    </div>
                    <form action={reviewSubmittedContent} className="workspace-form compact">
                      <input type="hidden" name="id" value={submission.id} />
                      <label>
                        <span>Status</span>
                        <select name="review_status" defaultValue={submission.review_status}>
                          <option value="submitted">Submitted</option>
                          <option value="in_review">In review</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                      </label>
                      <label>
                        <span>Reviewer note</span>
                        <input name="reviewer_note" placeholder="Decision note" />
                      </label>
                      <button type="submit" className="workspace-cta workspace-cta-secondary">
                        Update
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="workspace-empty">Nothing in the queue.</p>
              )}
            </div>
          </article>
        </section>

        <section className="workspace-elevated">
          <h2>Editorial analytics</h2>
          <p>
            A fast operational readout of the pipeline: draft load, public
            output, pending community submissions, and active feature slots.
          </p>
          <div className="workspace-analytics-grid">
            <div>
              <span>{dossiers.filter((item) => item.status === "draft").length}</span>
              <p>Draft dossiers</p>
            </div>
            <div>
              <span>{notes.filter((item) => item.status === "draft").length}</span>
              <p>Draft notes</p>
            </div>
            <div>
              <span>{pathways.filter((item) => item.status === "draft").length}</span>
              <p>Draft pathways</p>
            </div>
            <div>
              <span>{featured.filter((item) => item.is_active).length}</span>
              <p>Active feature slots</p>
            </div>
          </div>
        </section>

        {isAdmin ? (
          <section className="workspace-elevated">
            <h2>System tools</h2>
            <p>
              You also have admin access. Manage users, roles, settings, and
              underlying records.
            </p>
            <div className="workspace-actions">
              <Link href="/admin" className="workspace-cta">
                Open admin dashboard
              </Link>
              <Link href="/admin/users" className="workspace-cta workspace-cta-secondary">
                Moderate users
              </Link>
            </div>
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
