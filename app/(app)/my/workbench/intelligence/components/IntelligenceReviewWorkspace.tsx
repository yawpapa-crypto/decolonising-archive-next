"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import {
  createReviewProject,
  importSavedCorpusToReviewProject,
  updateReviewScreening,
} from "@/lib/workbench-review-actions";
import {
  EXCLUSION_REASON_LABELS,
  REVIEW_TYPE_LABELS,
  SCREENING_STATUS_LABELS,
} from "@/lib/workbench-intelligence-review";
import type { PipelineStage } from "@/lib/workbench-intelligence-pipeline";
import type {
  PrismaFlowCounts,
  ReviewExclusionReason,
  ReviewProject,
  ReviewProjectType,
  ReviewScreeningRecord,
  ReviewScreeningStatus,
  SavedSearchInsight,
} from "@/lib/workbench-intelligence-types";
import IntelligencePipeline from "./IntelligencePipeline";
import IntelligencePrismaSummary from "./IntelligencePrismaSummary";
import { cn } from "@/lib/cn";

type Props = {
  projects: ReviewProject[];
  screenings: ReviewScreeningRecord[];
  savedSearches: SavedSearchInsight[];
  prismaCounts: PrismaFlowCounts;
  pipelineStages: PipelineStage[];
};

type ReviewTab = "projects" | "screening" | "flow" | "pipeline";

const REVIEW_TYPES: ReviewProjectType[] = [
  "systematic_review",
  "scoping_review",
  "mapping_review",
  "narrative_review",
];

const SCREENING_STATUSES: ReviewScreeningStatus[] = [
  "imported",
  "title_abstract_screening",
  "included",
  "excluded",
  "full_text_review",
  "final_included",
];

const EMPTY_FORM = {
  title: "",
  reviewType: "systematic_review" as ReviewProjectType,
  researchQuestion: "",
  inclusionCriteria: "",
  exclusionCriteria: "",
  searchStrings: "",
  databasesSearched: "",
  dateRangeStart: "",
  dateRangeEnd: "",
  notes: "",
};

export default function IntelligenceReviewWorkspace({
  projects,
  screenings,
  savedSearches,
  prismaCounts,
  pipelineStages,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<ReviewTab>("projects");
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectScreenings = screenings.filter(
    (screening) => screening.projectId === activeProject?.id,
  );

  function handleCreateProject(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createReviewProject({
        title: form.title,
        reviewType: form.reviewType,
        researchQuestion: form.researchQuestion,
        inclusionCriteria: form.inclusionCriteria,
        exclusionCriteria: form.exclusionCriteria,
        searchStrings: form.searchStrings
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        databasesSearched: form.databasesSearched
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
        dateRangeStart: form.dateRangeStart || null,
        dateRangeEnd: form.dateRangeEnd || null,
        notes: form.notes,
      });
      if (!result.ok) {
        setMessage(result.error ?? "Could not create review project.");
        return;
      }
      setForm(EMPTY_FORM);
      setActiveProjectId(result.projectId);
      setModalOpen(false);
      setMessage("Review project created.");
      router.refresh();
    });
  }

  function handleImportCorpus() {
    if (!activeProject) return;
    setMessage(null);
    startTransition(async () => {
      const result = await importSavedCorpusToReviewProject(activeProject.id);
      if (!result.ok) {
        setMessage(result.error ?? "Import failed.");
        return;
      }
      setMessage(`Imported ${result.imported} saved records.`);
      setActiveTab("screening");
      router.refresh();
    });
  }

  function handleScreeningChange(
    recordId: string,
    screeningStatus: ReviewScreeningStatus,
    exclusionReason?: ReviewExclusionReason | null,
  ) {
    if (!activeProject) return;
    startTransition(async () => {
      await updateReviewScreening({
        projectId: activeProject.id,
        recordId,
        screeningStatus,
        exclusionReason,
      });
      router.refresh();
    });
  }

  return (
    <>
      <div className="ri-section-shell">
        <div className="ri-section-shell__head">
          <div>
            <p className="ri-eyebrow">Review workspace</p>
            <h2 className="ri-section-shell__title">Systematic & scoping reviews</h2>
          </div>
          <button
            type="button"
            className="ri-btn ri-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} aria-hidden />
            New project
          </button>
        </div>

        {message ? <p className="ri-inline-message">{message}</p> : null}

        <div className="ri-review-tabs" role="tablist" aria-label="Review workspace views">
          {(
            [
              ["projects", "Projects"],
              ["screening", "Screening"],
              ["flow", "PRISMA counts"],
              ["pipeline", "Pipeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={cn("ri-review-tabs__item", activeTab === id && "is-active")}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "projects" ? (
          <div className="ri-review-projects" role="tabpanel">
            {projects.length ? (
              <ul className="ri-review-project-list">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      className={cn(
                        "ri-review-project-card",
                        activeProject?.id === project.id && "is-active",
                      )}
                      onClick={() => setActiveProjectId(project.id)}
                    >
                      <strong>{project.title}</strong>
                      <span>{REVIEW_TYPE_LABELS[project.reviewType]}</span>
                      {project.researchQuestion ? (
                        <p>{project.researchQuestion}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ri-muted">No review projects yet. Create one to start screening.</p>
            )}

            {activeProject ? (
              <div className="ri-review-project-actions">
                <label className="ri-field ri-field--inline">
                  <span>Active project</span>
                  <select
                    className="ri-field__control"
                    value={activeProject.id}
                    onChange={(e) => setActiveProjectId(e.target.value)}
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="ri-btn ri-btn--secondary"
                  disabled={isPending}
                  onClick={handleImportCorpus}
                >
                  Import saved corpus
                </button>
              </div>
            ) : null}

            {savedSearches.length ? (
              <div className="ri-review-searches">
                <h3 className="ri-subsection-title">Saved searches</h3>
                <ul className="ri-corpus-list ri-corpus-list--compact">
                  {savedSearches.slice(0, 4).map((search) => (
                    <li key={search.id}>
                      <strong>{search.label}</strong>
                      <span>{search.query}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "screening" ? (
          <div role="tabpanel">
            {!activeProject ? (
              <p className="ri-muted">Create or select a review project first.</p>
            ) : projectScreenings.length ? (
              <div className="ri-review-table-wrap">
                <table className="ri-review-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Year</th>
                      <th>Status</th>
                      <th>Exclusion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectScreenings.map((row) => (
                      <tr key={row.id}>
                        <td>{row.title}</td>
                        <td>{row.year ?? "—"}</td>
                        <td>
                          <select
                            className="ri-field__control ri-field__control--table"
                            value={row.screeningStatus}
                            disabled={isPending}
                            onChange={(e) =>
                              handleScreeningChange(
                                row.recordId,
                                e.target.value as ReviewScreeningStatus,
                                row.exclusionReason,
                              )
                            }
                            aria-label={`Screening status for ${row.title}`}
                          >
                            {SCREENING_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {SCREENING_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {row.screeningStatus === "excluded" ? (
                            <select
                              className="ri-field__control ri-field__control--table"
                              value={row.exclusionReason ?? "other"}
                              disabled={isPending}
                              onChange={(e) =>
                                handleScreeningChange(
                                  row.recordId,
                                  "excluded",
                                  e.target.value as ReviewExclusionReason,
                                )
                              }
                              aria-label={`Exclusion reason for ${row.title}`}
                            >
                              {Object.entries(EXCLUSION_REASON_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ri-muted">
                No records imported. Use Import saved corpus on the Projects tab.
              </p>
            )}
          </div>
        ) : null}

        {activeTab === "flow" ? (
          <IntelligencePrismaSummary counts={prismaCounts} embedded />
        ) : null}

        {activeTab === "pipeline" ? (
          <IntelligencePipeline stages={pipelineStages} embedded />
        ) : null}
      </div>

      {modalOpen ? (
        <div className="ri-modal" role="presentation" onClick={() => setModalOpen(false)}>
          <div
            className="ri-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ri-review-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ri-modal__head">
              <h2 id="ri-review-modal-title">New review project</h2>
              <button
                type="button"
                className="ri-btn ri-btn--ghost"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form className="ri-review-form ri-review-form--modal" onSubmit={handleCreateProject}>
              <label className="ri-field">
                <span>Title</span>
                <input
                  className="ri-field__control"
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  required
                />
              </label>
              <label className="ri-field">
                <span>Review type</span>
                <select
                  className="ri-field__control"
                  value={form.reviewType}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      reviewType: e.target.value as ReviewProjectType,
                    }))
                  }
                >
                  {REVIEW_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {REVIEW_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ri-field">
                <span>Research question</span>
                <textarea
                  className="ri-field__control"
                  value={form.researchQuestion}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, researchQuestion: e.target.value }))
                  }
                  rows={2}
                />
              </label>
              <label className="ri-field">
                <span>Inclusion criteria</span>
                <textarea
                  className="ri-field__control"
                  value={form.inclusionCriteria}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, inclusionCriteria: e.target.value }))
                  }
                  rows={2}
                />
              </label>
              <label className="ri-field">
                <span>Exclusion criteria</span>
                <textarea
                  className="ri-field__control"
                  value={form.exclusionCriteria}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, exclusionCriteria: e.target.value }))
                  }
                  rows={2}
                />
              </label>
              <label className="ri-field">
                <span>Search strings (one per line)</span>
                <textarea
                  className="ri-field__control"
                  value={form.searchStrings}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, searchStrings: e.target.value }))
                  }
                  rows={3}
                />
              </label>
              <label className="ri-field">
                <span>Databases searched</span>
                <input
                  className="ri-field__control"
                  value={form.databasesSearched}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, databasesSearched: e.target.value }))
                  }
                  placeholder="OpenAlex, Trove, Crossref"
                />
              </label>
              <div className="ri-review-form__dates">
                <label className="ri-field">
                  <span>Date from</span>
                  <input
                    className="ri-field__control"
                    type="date"
                    value={form.dateRangeStart}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, dateRangeStart: e.target.value }))
                    }
                  />
                </label>
                <label className="ri-field">
                  <span>Date to</span>
                  <input
                    className="ri-field__control"
                    type="date"
                    value={form.dateRangeEnd}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, dateRangeEnd: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="ri-field">
                <span>Notes</span>
                <textarea
                  className="ri-field__control"
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  rows={2}
                />
              </label>
              <div className="ri-modal__actions">
                <button type="button" className="ri-btn ri-btn--secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ri-btn ri-btn--primary" disabled={isPending}>
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
