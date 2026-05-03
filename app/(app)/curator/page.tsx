import Link from "next/link";
import { headers } from "next/headers";
import PageShell from "@/src/components/layout/PageShell";
import { requireCurator, hasRole } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords, type ArchiveRecord } from "@/lib/records";
import {
  createArchiveNote,
  createDossier,
  createPathway,
  featureRecord,
} from "./actions";
import CuratorDossierEditor from "./CuratorDossierEditor";
import CuratorArchiveNoteEditor from "./CuratorArchiveNoteEditor";
import CuratorFeaturedRecordEditor from "./CuratorFeaturedRecordEditor";
import CuratorPathwayEditor from "./CuratorPathwayEditor";
import CuratorSubmissionReviewEditor from "./CuratorSubmissionReviewEditor";

type SearchParams = Promise<{ updated?: string; error?: string }>;

type DossierRow = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type ArchiveNoteRow = {
  id: string;
  record_id: string | null;
  title: string;
  note: string;
  note_type: string;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type FeaturedRecordRow = {
  id: string;
  record_id: string;
  reason: string | null;
  placement: string;
  is_active: boolean;
  editorial_status?: string | null;
  created_at: string;
  updated_at: string | null;
};

type PathwayRow = {
  id: string;
  title: string;
  theme: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type SubmittedContentRow = {
  id: string;
  title: string;
  content_type: string;
  description: string;
  source_url: string | null;
  review_status: string;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string | null;
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

function featuredSlotStatus(row: FeaturedRecordRow) {
  return row.editorial_status ?? (row.is_active ? "active" : "inactive");
}

function featuredIsActive(row: FeaturedRecordRow) {
  return featuredSlotStatus(row) === "active";
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
  const recordOptions = records.slice(0, 120).map((record) => ({
    id: record.id,
    title: record.title,
  }));

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const pathwayLinkBase =
    host.length > 0
      ? `${proto}://${host}`
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") ||
        "http://localhost:3000";

  const [
    dossiersResult,
    notesResult,
    featuredResult,
    pathwaysResult,
    submissionsResult,
  ] = await Promise.all([
    supabase
      .from("curator_dossiers")
      .select("id, title, summary, body, status, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("archive_notes")
      .select(
        "id, record_id, title, note, note_type, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("featured_records")
      .select(
        "id, record_id, reason, placement, is_active, editorial_status, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("themed_pathways")
      .select(
        "id, title, theme, description, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("submitted_content")
      .select(
        "id, title, content_type, description, source_url, review_status, reviewer_note, created_at, updated_at",
      )
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

  const draftEditorialCount =
    dossiers.filter((item) => item.status === "draft").length +
    notes.filter((item) => item.status === "draft").length +
    pathways.filter((item) => item.status === "draft").length;

  const reviewEditorialCount =
    dossiers.filter((item) => item.status === "review").length +
    notes.filter((item) => item.status === "review").length +
    pathways.filter((item) => item.status === "review").length;

  const submissionsByStatus = {
    submitted: submissions.filter((s) => s.review_status === "submitted").length,
    in_review: submissions.filter((s) => s.review_status === "in_review").length,
    accepted: submissions.filter((s) => s.review_status === "accepted").length,
    declined: submissions.filter((s) => s.review_status === "declined").length,
  };

  const pipelineMax = Math.max(
    1,
    draftEditorialCount,
    reviewEditorialCount,
    publishedCount,
    pendingSubmissions.length,
    submissionsByStatus.submitted + submissionsByStatus.in_review,
  );

  function barPct(n: number) {
    return `${Math.round((n / pipelineMax) * 100)}%`;
  }

  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--curator">
        <main className="workspace-page curator-workspace dashboard-canvas">
          <header className="workspace-page-header dashboard-header">
            <div className="workspace-page-header-top">
              <div className="workspace-page-title-block">
                <p className="workspace-eyebrow">Editorial tools</p>
                <h1>Curator workspace</h1>
                <p className="workspace-page-intro">
                  Build dossiers, annotate archive records, feature discoveries,
                  shape themed pathways, review member submissions, and watch the
                  editorial pipeline.
                </p>
              </div>
              <div className="workspace-header-pill-row">
                <span className={`role-badge role-${profile.role}`}>
                  {profile.role === "admin" ? "Admin" : "Curator"}
                </span>
                <Link href="/curator/media" className="workspace-cta">
                  Open media library
                </Link>
              </div>
            </div>
          </header>

          {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}
          {sp.error ? <p className="auth-error">{sp.error}</p> : null}

        <section className="workspace-metrics curator-metrics-band" aria-label="Curator overview">
          <div>
            <span>{dossiers.length}</span>
            <p>Dossiers</p>
          </div>
          <div>
            <span>{notes.length}</span>
            <p>Archive notes</p>
          </div>
          <div>
            <span>{featured.filter((item) => featuredIsActive(item)).length}</span>
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

        <section
          className="curator-pipeline-panel"
          aria-label="Editorial pipeline snapshot"
        >
          <div className="curator-pipeline-panel-inner">
            <div className="curator-mini-chart-block">
              <h3 className="curator-mini-chart-title">Editorial mix</h3>
              <p className="curator-mini-chart-sub">
                Draft and review load versus published output
              </p>
              <ul className="curator-mini-chart">
                <li>
                  <span className="curator-mini-chart-label">Drafts</span>
                  <div className="curator-mini-chart-track">
                    <div
                      className="curator-mini-chart-fill is-draft"
                      style={{ width: barPct(draftEditorialCount) }}
                    />
                  </div>
                  <span className="curator-mini-chart-value">{draftEditorialCount}</span>
                </li>
                <li>
                  <span className="curator-mini-chart-label">In review</span>
                  <div className="curator-mini-chart-track">
                    <div
                      className="curator-mini-chart-fill is-review"
                      style={{ width: barPct(reviewEditorialCount) }}
                    />
                  </div>
                  <span className="curator-mini-chart-value">{reviewEditorialCount}</span>
                </li>
                <li>
                  <span className="curator-mini-chart-label">Published</span>
                  <div className="curator-mini-chart-track">
                    <div
                      className="curator-mini-chart-fill is-published"
                      style={{ width: barPct(publishedCount) }}
                    />
                  </div>
                  <span className="curator-mini-chart-value">{publishedCount}</span>
                </li>
              </ul>
            </div>
            <div className="curator-mini-chart-block">
              <h3 className="curator-mini-chart-title">Community intake</h3>
              <p className="curator-mini-chart-sub">
                Submissions by review stage
              </p>
              <ul className="curator-mini-chart">
                <li>
                  <span className="curator-mini-chart-label">Queued</span>
                  <div className="curator-mini-chart-track">
                    <div
                      className="curator-mini-chart-fill is-queue"
                      style={{ width: barPct(pendingSubmissions.length) }}
                    />
                  </div>
                  <span className="curator-mini-chart-value">{pendingSubmissions.length}</span>
                </li>
                <li>
                  <span className="curator-mini-chart-label">Accepted</span>
                  <div className="curator-mini-chart-track">
                    <div
                      className="curator-mini-chart-fill is-accepted"
                      style={{ width: barPct(submissionsByStatus.accepted) }}
                    />
                  </div>
                  <span className="curator-mini-chart-value">{submissionsByStatus.accepted}</span>
                </li>
                <li>
                  <span className="curator-mini-chart-label">Declined</span>
                  <div className="curator-mini-chart-track">
                    <div
                      className="curator-mini-chart-fill is-declined"
                      style={{ width: barPct(submissionsByStatus.declined) }}
                    />
                  </div>
                  <span className="curator-mini-chart-value">{submissionsByStatus.declined}</span>
                </li>
              </ul>
            </div>
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
                <span>Essay / body</span>
                <textarea name="body" rows={6} placeholder="Long-form essay (optional)" />
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <button type="submit" className="workspace-cta">
                Create dossier
              </button>
            </form>
            <div className="curator-editor-stack">
              {dossiers.length ? (
                dossiers.map((dossier) => (
                  <CuratorDossierEditor
                    key={`${dossier.id}-${dossier.updated_at ?? dossier.created_at}`}
                    dossier={{
                      id: dossier.id,
                      title: dossier.title,
                      summary: dossier.summary,
                      body: dossier.body ?? null,
                      status: dossier.status,
                      updated_at: dossier.updated_at,
                    }}
                  />
                ))
              ) : (
                <div className="curator-empty-state">
                  <p className="curator-empty-title">No dossiers yet</p>
                  <p className="curator-empty-hint">
                    Use the form above to start a curatorial thread. Dossiers can move
                    from draft through review to publication.
                  </p>
                </div>
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
              <label>
                <span>Note type</span>
                <select name="note_type" defaultValue="context">
                  <option value="context">Context</option>
                  <option value="provenance">Provenance</option>
                  <option value="rights">Rights</option>
                  <option value="warning">Warning</option>
                  <option value="citation">Citation</option>
                  <option value="correction">Correction</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <button type="submit" className="workspace-cta">
                Save note
              </button>
            </form>
            <div className="curator-editor-stack">
              {notes.length ? (
                notes.map((note) => (
                  <CuratorArchiveNoteEditor
                    key={`${note.id}-${note.updated_at ?? note.created_at}`}
                    note={{
                      id: note.id,
                      record_id: note.record_id,
                      title: note.title,
                      note: note.note,
                      note_type: note.note_type ?? "context",
                      status: note.status,
                      updated_at: note.updated_at,
                    }}
                  />
                ))
              ) : (
                <div className="curator-empty-state">
                  <p className="curator-empty-title">No archive notes yet</p>
                  <p className="curator-empty-hint">
                    Tie context, provenance, or rights notes to a record ID, or leave
                    the field empty for a general note.
                  </p>
                </div>
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
              <label>
                <span>Status</span>
                <select name="editorial_status" defaultValue="active">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <button type="submit" className="workspace-cta">
                Feature record
              </button>
            </form>
            <div className="curator-editor-stack">
              {featured.length ? (
                featured.map((item) => (
                  <CuratorFeaturedRecordEditor
                    key={`${item.id}-${item.updated_at ?? item.created_at}`}
                    item={{
                      id: item.id,
                      record_id: item.record_id,
                      reason: item.reason,
                      placement: item.placement,
                      is_active: item.is_active,
                      editorial_status: featuredSlotStatus(item),
                      updated_at: item.updated_at,
                    }}
                    records={recordOptions}
                  />
                ))
              ) : (
                <div className="curator-empty-state">
                  <p className="curator-empty-title">Nothing featured yet</p>
                  <p className="curator-empty-hint">
                    Pick a record and placement to surface it on the homepage, library,
                    or a pathway slot. Status can be active, inactive, or archived.
                  </p>
                </div>
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
              <label>
                <span>Status</span>
                <select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <button type="submit" className="workspace-cta">
                Build pathway
              </button>
            </form>
            <div className="curator-editor-stack">
              {pathways.length ? (
                pathways.map((pathway) => (
                  <CuratorPathwayEditor
                    key={`${pathway.id}-${pathway.updated_at ?? pathway.created_at}`}
                    pathway={{
                      id: pathway.id,
                      title: pathway.title,
                      theme: pathway.theme,
                      description: pathway.description,
                      status: pathway.status,
                      updated_at: pathway.updated_at,
                    }}
                    pathwayLinkBase={pathwayLinkBase}
                  />
                ))
              ) : (
                <div className="curator-empty-state">
                  <p className="curator-empty-title">No themed pathways yet</p>
                  <p className="curator-empty-hint">
                    Group records under a shared theme. Pathways can be drafted,
                    sent to review, published, or archived when the story arc closes.
                  </p>
                </div>
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
            <div className="workspace-list queue curator-submissions-queue">
              {submissions.length ? (
                submissions.map((submission) => (
                  <CuratorSubmissionReviewEditor
                    key={`${submission.id}-${submission.updated_at ?? submission.created_at}`}
                    submission={{
                      id: submission.id,
                      title: submission.title,
                      content_type: submission.content_type,
                      description: submission.description,
                      source_url: submission.source_url,
                      review_status: submission.review_status,
                      reviewer_note: submission.reviewer_note,
                      updated_at: submission.updated_at,
                    }}
                  />
                ))
              ) : (
                <div className="curator-empty-state">
                  <p className="curator-empty-title">No submissions to review</p>
                  <p className="curator-empty-hint">
                    When members suggest records, sources, or corrections, they will
                    appear here for triage. Nothing is waiting right now.
                  </p>
                </div>
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
              <span>{featured.filter((item) => featuredIsActive(item)).length}</span>
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
      </div>
    </PageShell>
  );
}
