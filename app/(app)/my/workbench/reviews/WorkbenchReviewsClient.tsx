"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  createExtractionField,
  createReviewProject,
  importReadingListToReviewProject,
  importSavedCorpusToReviewProject,
  manualAddReviewRecord,
  updateReviewFullText,
  updateReviewScreening,
  upsertExtraction,
} from "@/lib/workbench-review-actions";
import type {
  WorkbenchReviewField,
  WorkbenchReviewScreening,
  WorkbenchReviewSnapshot,
} from "@/lib/workbench-review-module";
import type {
  ReviewExclusionReason,
  ReviewProjectType,
  ReviewScreeningStatus,
} from "@/lib/workbench-intelligence-types";

type TabKey =
  | "overview"
  | "import"
  | "screening"
  | "fulltext"
  | "extraction"
  | "conflicts"
  | "reporting";

const REVIEW_TYPES: Array<{ value: ReviewProjectType; label: string }> = [
  { value: "systematic_review", label: "Systematic review" },
  { value: "scoping_review", label: "Scoping review" },
  { value: "rapid_review", label: "Rapid review" },
  { value: "evidence_map", label: "Evidence map" },
  { value: "mapping_review", label: "Mapping review" },
  { value: "narrative_review", label: "Narrative review" },
];

const REVIEW_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Dashboard" },
  { key: "import", label: "Import" },
  { key: "screening", label: "Screening" },
  { key: "fulltext", label: "Full text" },
  { key: "extraction", label: "Extraction" },
  { key: "conflicts", label: "Conflicts" },
  { key: "reporting", label: "Reporting" },
];

const STAGES = [
  "Setup",
  "Import",
  "Title and abstract",
  "Full text",
  "Extraction",
  "Reporting",
];

const EXCLUSION_REASONS: Array<{ value: ReviewExclusionReason; label: string }> = [
  { value: "wrong_topic", label: "Wrong topic" },
  { value: "wrong_geography", label: "Wrong geography" },
  { value: "wrong_method", label: "Wrong method" },
  { value: "duplicate", label: "Duplicate" },
  { value: "no_full_text", label: "No full text" },
  { value: "outside_date_range", label: "Outside date range" },
  { value: "other", label: "Other" },
];

function reviewTypeLabel(value: ReviewProjectType) {
  return REVIEW_TYPES.find((type) => type.value === value)?.label ?? value;
}

function statusLabel(value: ReviewScreeningStatus) {
  const labels: Record<ReviewScreeningStatus, string> = {
    imported: "Awaiting screening",
    title_abstract_screening: "Title and abstract",
    included: "Included",
    excluded: "Excluded",
    maybe: "Maybe",
    full_text_review: "Full text",
    final_included: "Included in review",
  };
  return labels[value] ?? value;
}

function fieldKeyFromName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "field"
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="workbench-review-stage-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="workbench-review-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function resultMessage(result: { ok: boolean; error?: string }, success: string) {
  return result.ok ? success : result.error ?? "Something went wrong.";
}

export default function WorkbenchReviewsClient({
  snapshot,
  detailMode = false,
}: {
  snapshot: WorkbenchReviewSnapshot;
  detailMode?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(detailMode ? "overview" : "overview");
  const firstScreeningId = snapshot.screenings[0]?.recordId ?? "";
  const [selectedRecordId, setSelectedRecordId] = useState(firstScreeningId);
  const [exclusionReason, setExclusionReason] =
    useState<ReviewExclusionReason>("wrong_topic");

  const activeProject = snapshot.activeProject;
  const counts = snapshot.prismaCounts;
  const conflictCount =
    snapshot.conflicts.length +
    snapshot.screenings.filter(
      (record) => record.conflictStatus && record.conflictStatus !== "none",
    ).length;

  const sourceCoverage = useMemo(() => {
    const map = new Map<string, number>();
    snapshot.screenings.forEach((record) => {
      const label = record.source || "Unknown source";
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [snapshot.screenings]);

  const selectedRecord =
    snapshot.screenings.find((record) => record.recordId === selectedRecordId) ??
    snapshot.screenings[0] ??
    null;
  const extractionValueByFieldAndRecord = useMemo(() => {
    const map = new Map<string, string>();
    snapshot.extractions.forEach((row) => {
      const fieldId = typeof row.field_id === "string" ? row.field_id : "";
      const recordId = typeof row.record_id === "string" ? row.record_id : "";
      if (!fieldId || !recordId) return;
      const value = row.value;
      map.set(
        `${fieldId}:${recordId}`,
        typeof value === "string" ? value : JSON.stringify(value ?? ""),
      );
    });
    return map;
  }, [snapshot.extractions]);
  const fullTextByRecord = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    snapshot.fullTexts.forEach((row) => {
      const recordId = typeof row.record_id === "string" ? row.record_id : "";
      if (recordId) map.set(recordId, row);
    });
    return map;
  }, [snapshot.fullTexts]);

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      setMessage(resultMessage(result, success));
      router.refresh();
    });
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const reviewType = String(form.get("reviewType") ?? "systematic_review") as ReviewProjectType;
    const languages = String(form.get("languages") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const databasesSearched = String(form.get("databasesSearched") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await createReviewProject({
        title,
        reviewType,
        researchQuestion: String(form.get("researchQuestion") ?? ""),
        inclusionCriteria: String(form.get("inclusionCriteria") ?? ""),
        exclusionCriteria: String(form.get("exclusionCriteria") ?? ""),
        protocolNotes: String(form.get("protocolNotes") ?? ""),
        databasesSearched,
        languages,
        reviewMethod: String(form.get("reviewMethod") ?? ""),
        sourceScope: String(form.get("sourceScope") ?? ""),
      });
      if (result.ok) {
        router.push(`/my/workbench/reviews/${result.projectId}`);
      } else {
        setMessage(result.error ?? "Review could not be created.");
      }
    });
  }

  function addManualRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProject) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    startTransition(async () => {
      const result = await manualAddReviewRecord({
        projectId: activeProject.id,
        title: String(form.get("title") ?? ""),
        source: String(form.get("source") ?? ""),
        year: String(form.get("year") ?? ""),
        doi: String(form.get("doi") ?? ""),
        sourceUrl: String(form.get("sourceUrl") ?? ""),
      });
      setMessage(resultMessage(result, "Record added to review."));
      if (result.ok) formElement.reset();
      router.refresh();
    });
  }

  function addExtractionField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProject) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "");
    startTransition(async () => {
      const result = await createExtractionField(activeProject.id, {
        name,
        fieldKey: fieldKeyFromName(name),
        fieldType: String(form.get("fieldType") ?? "text"),
        required: form.get("required") === "on",
      });
      setMessage(resultMessage(result, "Extraction field added."));
      if (result.ok) formElement.reset();
      router.refresh();
    });
  }

  function saveExtraction(event: FormEvent<HTMLFormElement>, field: WorkbenchReviewField) {
    event.preventDefault();
    if (!activeProject || !selectedRecord) return;
    const form = new FormData(event.currentTarget);
    runAction(
      () =>
        upsertExtraction(
          activeProject.id,
          field.id,
          selectedRecord.recordId,
          String(form.get("value") ?? ""),
        ),
      "Extraction value saved.",
    );
  }

  if (!detailMode) {
    return (
      <section className="workbench-review workbench-review-dashboard">
        <header className="workbench-review-hero">
          <div>
            <p className="workbench-review-eyebrow">Reviews</p>
            <h1>Evidence review workspace</h1>
            <p>
              Plan systematic, scoping and rapid reviews from saved records,
              reading lists and manual sources.
            </p>
          </div>
          <Link href="/my/workbench/saved-records" className="workbench-review-ghost">
            Manage saved records
          </Link>
        </header>

        {message ? <p className="workbench-review-flash">{message}</p> : null}
        {snapshot.errors.length ? (
          <p className="workbench-review-flash is-error">
            Review tables need attention: {snapshot.errors.join("; ")}
          </p>
        ) : null}

        <div className="workbench-review-metrics">
          <MetricCard label="Review projects" value={snapshot.projects.length} detail="Dedicated evidence workflows" />
          <MetricCard label="Saved corpus" value={snapshot.savedRecords.length} detail="Records ready to import" />
          <MetricCard label="Reading lists" value={snapshot.readingLists.length} detail="Curated import groups" />
          <MetricCard label="Awaiting screening" value={counts.awaitingScreening} detail="Across the active review" />
        </div>

        <div className="workbench-review-grid">
          <section className="workbench-review-card">
            <div className="workbench-review-card-header">
              <div>
                <span>Setup</span>
                <h2>New review</h2>
              </div>
              <p>Define the protocol before importing records.</p>
            </div>

            <form className="workbench-review-form" onSubmit={createProject}>
              <label>
                <span>Review title</span>
                <input name="title" required placeholder="e.g. Cultural memory in digital archives" />
              </label>
              <label>
                <span>Review type</span>
                <select name="reviewType" defaultValue="scoping_review">
                  {REVIEW_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="is-wide">
                <span>Research question</span>
                <textarea name="researchQuestion" rows={3} placeholder="What does the review need to answer?" />
              </label>
              <label>
                <span>Method</span>
                <input name="reviewMethod" placeholder="Systematic, PCC, PICO, rapid synthesis" />
              </label>
              <label>
                <span>Languages</span>
                <input name="languages" placeholder="English, French, Yolngu Matha" />
              </label>
              <label>
                <span>Sources searched</span>
                <input name="databasesSearched" placeholder="OpenAlex, Trove, AODL, CORE" />
              </label>
              <label>
                <span>Source scope</span>
                <input name="sourceScope" placeholder="Peer reviewed, archival, community records" />
              </label>
              <label className="is-wide">
                <span>Eligibility criteria</span>
                <textarea name="inclusionCriteria" rows={3} placeholder="Inclusion criteria" />
              </label>
              <label className="is-wide">
                <span>Exclusion criteria</span>
                <textarea name="exclusionCriteria" rows={3} placeholder="Exclusion criteria" />
              </label>
              <label className="is-wide">
                <span>Protocol notes</span>
                <textarea name="protocolNotes" rows={3} placeholder="Protocol version, decisions, caveats" />
              </label>
              <button className="workbench-review-primary" type="submit" disabled={isPending}>
                {isPending ? "Creating" : "Create review"}
              </button>
            </form>
          </section>

          <section className="workbench-review-card">
            <div className="workbench-review-card-header">
              <div>
                <span>Projects</span>
                <h2>Your reviews</h2>
              </div>
              <p>Open a review to import, screen and extract records.</p>
            </div>

            {snapshot.projects.length ? (
              <div className="workbench-review-project-list">
                {snapshot.projects.map((project) => (
                  <Link key={project.id} href={`/my/workbench/reviews/${project.id}`}>
                    <div>
                      <strong>{project.title}</strong>
                      <span>{reviewTypeLabel(project.reviewType)} · {project.status}</span>
                    </div>
                    <em>Open</em>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No review projects yet"
                body="Create a review to start building an auditable evidence pipeline."
              />
            )}
          </section>
        </div>
      </section>
    );
  }

  if (!activeProject) {
    return (
      <section className="workbench-review workbench-review-dashboard">
        <header className="workbench-review-hero">
          <div>
            <p className="workbench-review-eyebrow">Reviews</p>
            <h1>Review not found</h1>
            <p>Create a review project before opening the workspace.</p>
          </div>
          <Link href="/my/workbench/reviews" className="workbench-review-primary">
            Back to reviews
          </Link>
        </header>
      </section>
    );
  }

  return (
    <section className="workbench-review">
      <header className="workbench-review-header">
        <Link href="/my/workbench/reviews" className="workbench-review-back">
          Back to reviews
        </Link>
        <p className="workbench-review-eyebrow">Review workspace</p>
        <h1>{activeProject.title}</h1>
        <div className="workbench-review-chips">
          <span>{reviewTypeLabel(activeProject.reviewType)}</span>
          <span>{activeProject.status}</span>
          <span>{snapshot.screenings.length} records</span>
          <span>{counts.finalIncluded} included</span>
          <span>{conflictCount} conflicts</span>
        </div>
      </header>

      {message ? <p className="workbench-review-flash">{message}</p> : null}
      {snapshot.errors.length ? (
        <p className="workbench-review-flash is-error">
          Review tables need attention: {snapshot.errors.join("; ")}
        </p>
      ) : null}

      <nav className="workbench-review-pipeline" aria-label="Review pipeline">
        {STAGES.map((stage, index) => (
          <span key={stage} className={index < 2 || snapshot.screenings.length ? "is-active" : undefined}>
            {stage}
          </span>
        ))}
      </nav>

      <div className="workbench-review-tabs" role="tablist">
        {REVIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "is-active" : undefined}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="workbench-review-stack">
          <div className="workbench-review-metrics">
            <MetricCard label="Identified" value={counts.recordsIdentified} detail="Imported or manually added" />
            <MetricCard label="Screened" value={counts.recordsScreened} detail="Title and abstract decisions" />
            <MetricCard label="Full text" value={counts.fullTextAssessed} detail="Advanced for assessment" />
            <MetricCard label="Included" value={counts.finalIncluded} detail="Final synthesis records" />
          </div>

          <div className="workbench-review-grid">
            <section className="workbench-review-card">
              <div className="workbench-review-card-header">
                <div>
                  <span>Protocol</span>
                  <h2>Review setup</h2>
                </div>
              </div>
              <dl className="workbench-review-definition-list">
                <div>
                  <dt>Question</dt>
                  <dd>{activeProject.researchQuestion || "Not defined yet"}</dd>
                </div>
                <div>
                  <dt>Eligibility</dt>
                  <dd>{activeProject.inclusionCriteria || "No inclusion criteria recorded"}</dd>
                </div>
                <div>
                  <dt>Exclusions</dt>
                  <dd>{activeProject.exclusionCriteria || "No exclusion criteria recorded"}</dd>
                </div>
                <div>
                  <dt>Sources</dt>
                  <dd>{activeProject.databasesSearched.join(", ") || activeProject.sourceScope || "No sources recorded"}</dd>
                </div>
              </dl>
            </section>

            <section className="workbench-review-card">
              <div className="workbench-review-card-header">
                <div>
                  <span>Coverage</span>
                  <h2>Source diversity</h2>
                </div>
              </div>
              {sourceCoverage.length ? (
                <div className="workbench-review-coverage">
                  {sourceCoverage.map(([source, total]) => (
                    <span key={source}>
                      <strong>{source}</strong>
                      <em>{total}</em>
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState title="No sources yet" body="Import saved records or reading lists to see coverage." />
              )}
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "import" ? (
        <div className="workbench-review-grid">
          <section className="workbench-review-card">
            <div className="workbench-review-card-header">
              <div>
                <span>Corpus</span>
                <h2>Import records</h2>
              </div>
              <p>Bring in saved records, reading lists, library search results or manual citations.</p>
            </div>
            <div className="workbench-review-import-actions">
              <button
                type="button"
                className="workbench-review-primary"
                disabled={isPending || snapshot.savedRecords.length === 0}
                onClick={() =>
                  runAction(
                    () => importSavedCorpusToReviewProject(activeProject.id),
                    "Saved records imported.",
                  )
                }
              >
                Import saved records
              </button>
              <span>{snapshot.savedRecords.length} available</span>
            </div>

            <div className="workbench-review-list">
              {snapshot.readingLists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () => importReadingListToReviewProject(activeProject.id, list.id),
                      "Reading list imported.",
                    )
                  }
                >
                  <strong>{list.title}</strong>
                  <span>Import reading list</span>
                </button>
              ))}
              {!snapshot.readingLists.length ? (
                <EmptyState title="No reading lists" body="Create reading lists from saved records to import grouped evidence." />
              ) : null}
            </div>
          </section>

          <section className="workbench-review-card">
            <div className="workbench-review-card-header">
              <div>
                <span>Manual add</span>
                <h2>Add source</h2>
              </div>
            </div>
            <form className="workbench-review-form" onSubmit={addManualRecord}>
              <label className="is-wide">
                <span>Title</span>
                <input name="title" required placeholder="Record title" />
              </label>
              <label>
                <span>Source</span>
                <input name="source" placeholder="Journal, archive or database" />
              </label>
              <label>
                <span>Year</span>
                <input name="year" placeholder="2026" />
              </label>
              <label>
                <span>DOI</span>
                <input name="doi" placeholder="10.xxxx/example" />
              </label>
              <label>
                <span>Source URL</span>
                <input name="sourceUrl" placeholder="https://..." />
              </label>
              <button className="workbench-review-primary" type="submit" disabled={isPending}>
                Add source
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "screening" ? (
        <section className="workbench-review-card">
          <div className="workbench-review-card-header">
            <div>
              <span>Title and abstract</span>
              <h2>Screening queue</h2>
            </div>
            <label className="workbench-review-inline-select">
              <span>Exclusion reason</span>
              <select
                value={exclusionReason}
                onChange={(event) => setExclusionReason(event.target.value as ReviewExclusionReason)}
              >
                {EXCLUSION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="workbench-review-screening-list">
            {snapshot.screenings.map((record) => (
              <ScreeningCard
                key={record.id}
                record={record}
                isPending={isPending}
                exclusionReason={exclusionReason}
                onDecide={(status) =>
                  runAction(
                    () =>
                      updateReviewScreening({
                        projectId: activeProject.id,
                        recordId: record.recordId,
                        screeningStatus: status,
                        exclusionReason: status === "excluded" ? exclusionReason : null,
                      }),
                    "Screening decision saved.",
                  )
                }
                onSaveNote={(notes) =>
                  runAction(
                    () =>
                      updateReviewScreening({
                        projectId: activeProject.id,
                        recordId: record.recordId,
                        screeningStatus: record.status,
                        exclusionReason: record.exclusionReason as ReviewExclusionReason | null,
                        notes,
                      }),
                    "Reviewer note saved.",
                  )
                }
              />
            ))}
            {!snapshot.screenings.length ? (
              <EmptyState title="No records imported" body="Import saved records or add a manual source before screening." />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "fulltext" ? (
        <section className="workbench-review-card">
          <div className="workbench-review-card-header">
            <div>
              <span>Full text</span>
              <h2>Assessment queue</h2>
            </div>
            <p>Track full text links, access status and final inclusion.</p>
          </div>
          <div className="workbench-review-screening-list">
            {snapshot.screenings
              .filter((record) => ["included", "full_text_review", "final_included"].includes(record.status))
              .map((record) => (
                <article key={record.id} className="workbench-review-screening-card">
                  <div>
                    <span>{statusLabel(record.status)}</span>
                    <h3>{record.title}</h3>
                    <p>{[record.source, record.year].filter(Boolean).join(" · ") || "Source pending"}</p>
                    <small>
                      Full text: {String(fullTextByRecord.get(record.recordId)?.access_status ?? record.fullTextStatus ?? "not sought")}
                    </small>
                  </div>
                  <div className="workbench-review-decision-bar">
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          () =>
                            updateReviewFullText({
                              projectId: activeProject.id,
                              recordId: record.recordId,
                              url: record.sourceUrl,
                              accessStatus: record.sourceUrl ? "found" : "not_sought",
                            }),
                          "Full text status saved.",
                        )
                      }
                    >
                      Track full text
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          () =>
                            updateReviewScreening({
                              projectId: activeProject.id,
                              recordId: record.recordId,
                              screeningStatus: "final_included",
                            }),
                          "Record included in final review.",
                        )
                      }
                    >
                      Include
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          () =>
                            updateReviewScreening({
                              projectId: activeProject.id,
                              recordId: record.recordId,
                              screeningStatus: "excluded",
                              exclusionReason: "no_full_text",
                            }),
                          "Record excluded at full text.",
                        )
                      }
                    >
                      Exclude
                    </button>
                  </div>
                </article>
              ))}
            {!snapshot.screenings.some((record) => ["included", "full_text_review", "final_included"].includes(record.status)) ? (
              <EmptyState title="No full text records" body="Include records during screening to move them into full text assessment." />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "extraction" ? (
        <section className="workbench-review-card workbench-review-extraction">
          <div className="workbench-review-card-header">
            <div>
              <span>Extraction</span>
              <h2>Data extraction</h2>
            </div>
            <p>Capture fields like country, method, population, findings and coverage.</p>
          </div>

          <div className="workbench-review-extraction-grid">
            <form className="workbench-review-form" onSubmit={addExtractionField}>
              <label>
                <span>Field name</span>
                <input name="name" required placeholder="Country or region" />
              </label>
              <label>
                <span>Field type</span>
                <select name="fieldType" defaultValue="text">
                  <option value="text">Text</option>
                  <option value="long_text">Long text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                </select>
              </label>
              <label className="workbench-review-checkbox">
                <input name="required" type="checkbox" />
                <span>Required field</span>
              </label>
              <button className="workbench-review-primary" type="submit" disabled={isPending}>
                Add field
              </button>
            </form>

            <div className="workbench-review-record-picker">
              <label>
                <span>Record</span>
                <select
                  value={selectedRecord?.recordId ?? ""}
                  onChange={(event) => setSelectedRecordId(event.target.value)}
                >
                  {snapshot.screenings.map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {record.title}
                    </option>
                  ))}
                </select>
              </label>
              <p>{selectedRecord ? statusLabel(selectedRecord.status) : "No record selected"}</p>
            </div>
          </div>

          <div className="workbench-review-extraction-table">
            {snapshot.fields.map((field) => (
              <form key={field.id} onSubmit={(event) => saveExtraction(event, field)}>
                <div>
                  <strong>{field.name}</strong>
                  <span>{field.fieldType}{field.required ? " · required" : ""}</span>
                </div>
                <input
                  name="value"
                  defaultValue={
                    selectedRecord
                      ? extractionValueByFieldAndRecord.get(`${field.id}:${selectedRecord.recordId}`) ?? ""
                      : ""
                  }
                  placeholder="Add extracted value"
                />
                <button type="submit" disabled={isPending || !selectedRecord}>
                  Save
                </button>
              </form>
            ))}
            {!snapshot.fields.length ? (
              <EmptyState title="No extraction fields" body="Add custom fields for methods, findings, population, region and relevance." />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "conflicts" ? (
        <section className="workbench-review-card workbench-review-conflict">
          <div className="workbench-review-card-header">
            <div>
              <span>Collaboration</span>
              <h2>Conflict queue</h2>
            </div>
            <p>Use this space to resolve reviewer disagreement and decision drift.</p>
          </div>
          {conflictCount ? (
            <div className="workbench-review-list">
              {snapshot.screenings
                .filter((record) => record.conflictStatus && record.conflictStatus !== "none")
                .map((record) => (
                  <article key={record.id}>
                    <strong>{record.title}</strong>
                    <span>{record.conflictStatus}</span>
                  </article>
                ))}
            </div>
          ) : (
            <EmptyState title="No conflicts" body="Records with reviewer disagreement will appear here for resolution." />
          )}
        </section>
      ) : null}

      {activeTab === "reporting" ? (
        <section className="workbench-review-card workbench-review-prisma">
          <div className="workbench-review-card-header">
            <div>
              <span>Reporting</span>
              <h2>Review flow counts</h2>
            </div>
            <p>PRISMA-style counts for export and reporting.</p>
          </div>
          <div className="workbench-review-flow">
            <MetricCard label="Records identified" value={counts.recordsIdentified} detail="All imported evidence" />
            <MetricCard label="Duplicates removed" value={counts.duplicatesRemoved} detail="Marked duplicate" />
            <MetricCard label="Screened" value={counts.recordsScreened} detail="Decision recorded" />
            <MetricCard label="Excluded" value={counts.recordsExcluded} detail="Title, abstract or full text" />
            <MetricCard label="Full text assessed" value={counts.fullTextAssessed} detail="Moved into full text" />
            <MetricCard label="Included" value={counts.finalIncluded} detail="Final synthesis set" />
          </div>
        </section>
      ) : null}
    </section>
  );
}

function ScreeningCard({
  record,
  isPending,
  exclusionReason,
  onDecide,
  onSaveNote,
}: {
  record: WorkbenchReviewScreening;
  isPending: boolean;
  exclusionReason: ReviewExclusionReason;
  onDecide: (status: ReviewScreeningStatus) => void;
  onSaveNote: (notes: string) => void;
}) {
  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSaveNote(String(form.get("notes") ?? ""));
  }

  return (
    <article className="workbench-review-screening-card">
      <div>
        <span>{statusLabel(record.status)}</span>
        <h3>{record.title}</h3>
        <p>{[record.source, record.recordType, record.year].filter(Boolean).join(" · ") || "Source metadata pending"}</p>
        {record.notes ? <small>{record.notes}</small> : null}
      </div>
      <div className="workbench-review-decision-bar">
        <button type="button" disabled={isPending} onClick={() => onDecide("included")}>
          Include
        </button>
        <button type="button" disabled={isPending} onClick={() => onDecide("maybe")}>
          Maybe
        </button>
        <button type="button" disabled={isPending} onClick={() => onDecide("excluded")}>
          Exclude
        </button>
        <button type="button" disabled={isPending} onClick={() => onDecide("full_text_review")}>
          Full text
        </button>
      </div>
      {record.status === "excluded" ? (
        <p className="workbench-review-reason">
          Reason: {record.exclusionReason || exclusionReason}
        </p>
      ) : null}
      <form className="workbench-review-note-form" onSubmit={submitNote}>
        <input
          name="notes"
          defaultValue={record.notes ?? ""}
          placeholder="Reviewer note"
          aria-label={`Reviewer note for ${record.title}`}
        />
        <button type="submit" disabled={isPending}>
          Save note
        </button>
      </form>
    </article>
  );
}
