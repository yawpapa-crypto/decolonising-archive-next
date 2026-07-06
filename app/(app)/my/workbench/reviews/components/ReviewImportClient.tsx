"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import {
  deduplicateReviewRecords,
  importBibliographicFileToReviewProject,
  importReadingListToReviewProject,
  importSavedCorpusToReviewProject,
  manualAddReviewRecord,
} from "@/lib/workbench-review-actions";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import ReviewProjectShell from "./ReviewProjectShell";
import { formatReviewDate, IMPORT_SOURCES, IMPORT_TARGETS, resultMessage } from "./review-shared";

export default function ReviewImportClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"file" | "history">("file");
  const project = snapshot.activeProject;
  if (!project) return null;
  const projectId = project.id;

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      setMessage(resultMessage(result, success));
      router.refresh();
    });
  }

  function handleFileImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Choose a bibliographic file to import.");
      return;
    }
    startTransition(async () => {
      const content = await file.text();
      const result = await importBibliographicFileToReviewProject({
        projectId: projectId,
        filename: file.name,
        content,
        importTarget: String(formData.get("importTarget") ?? "title_abstract_screening") as
          | "title_abstract_screening"
          | "full_text_review"
          | "extraction",
        sourceLabel: String(formData.get("sourceLabel") ?? ""),
      });
      setMessage(
        result.ok
          ? `Imported ${result.imported} records (${result.duplicates} duplicates skipped).`
          : result.error ?? "Import failed.",
      );
      if (result.ok) form.reset();
      router.refresh();
    });
  }

  function addManualRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    startTransition(async () => {
      const result = await manualAddReviewRecord({
        projectId: projectId,
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

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="import">
      <section className="workbench-review-import workbench-review-page">
        <div className="workbench-review-segmented" role="tablist">
          <button type="button" className={tab === "file" ? "is-active" : undefined} onClick={() => setTab("file")}>
            Import from file
          </button>
          <button type="button" className={tab === "history" ? "is-active" : undefined} onClick={() => setTab("history")}>
            Import history
          </button>
        </div>

        {message ? <p className="workbench-review-flash">{message}</p> : null}

        {tab === "file" ? (
          <div className="workbench-review-grid">
            <section className="workbench-review-card">
              <div className="workbench-review-card-header">
                <h2>Import from file</h2>
                <p>RIS, BibTeX, EndNote XML and CSV bibliographic exports are supported.</p>
              </div>
              <form className="workbench-review-form" onSubmit={handleFileImport}>
                <label>
                  <span>Import into</span>
                  <select name="importTarget" defaultValue="title_abstract_screening">
                    {IMPORT_TARGETS.map((target) => (
                      <option key={target.value} value={target.value}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Source</span>
                  <select name="sourceLabel" defaultValue="">
                    <option value="">Select source (optional)</option>
                    {IMPORT_SOURCES.map((source) => (
                      <option key={source.value} value={source.label}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="is-wide workbench-review-upload">
                  <span>Upload file</span>
                  <input name="file" type="file" accept=".ris,.bib,.bibtex,.xml,.csv,text/plain" required />
                  <small>One file at a time, up to 50MB.</small>
                </label>
                <button className="workbench-review-primary" type="submit" disabled={isPending}>
                  Import file
                </button>
              </form>
            </section>

            <section className="workbench-review-card">
              <div className="workbench-review-card-header">
                <h2>Import from Workbench</h2>
              </div>
              <div className="workbench-review-import-actions">
                <button
                  type="button"
                  className="workbench-review-primary"
                  disabled={isPending || snapshot.savedRecords.length === 0}
                  onClick={() => runAction(() => importSavedCorpusToReviewProject(projectId), "Saved records imported.")}
                >
                  Import saved records
                </button>
                <button
                  type="button"
                  className="workbench-review-ghost"
                  disabled={isPending}
                  onClick={() => runAction(() => deduplicateReviewRecords(projectId), "Duplicates marked.")}
                >
                  Deduplicate records
                </button>
              </div>
              <ul className="workbench-review-source-list">
                {snapshot.readingLists.map((list) => (
                  <li key={list.id}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(
                          () => importReadingListToReviewProject(projectId, list.id),
                          "Reading list imported.",
                        )
                      }
                    >
                      <strong>{list.title}</strong>
                      <span>Import reading list</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="workbench-review-card">
              <div className="workbench-review-card-header">
                <h2>Add citation manually</h2>
              </div>
              <form className="workbench-review-form" onSubmit={addManualRecord}>
                <label className="is-wide">
                  <span>Title</span>
                  <input name="title" required />
                </label>
                <label>
                  <span>Source</span>
                  <input name="source" />
                </label>
                <label>
                  <span>Year</span>
                  <input name="year" />
                </label>
                <label>
                  <span>DOI</span>
                  <input name="doi" />
                </label>
                <label>
                  <span>URL</span>
                  <input name="sourceUrl" />
                </label>
                <button className="workbench-review-primary" type="submit" disabled={isPending}>
                  Add record
                </button>
              </form>
            </section>
          </div>
        ) : (
          <section className="workbench-review-card">
            <div className="workbench-review-card-header">
              <h2>Import history</h2>
            </div>
            {snapshot.imports.length ? (
              <ul className="workbench-review-import-history">
                {snapshot.imports.map((row) => (
                  <li key={row.id} className={row.status === "failed" ? "is-error" : undefined}>
                    <header>
                      <time>{formatReviewDate(row.createdAt)}</time>
                      <strong>{row.filename ?? "Import batch"}</strong>
                    </header>
                    <div className="workbench-review-import-metrics">
                      <span>
                        Added <strong>{row.addedToScreeningCount}</strong>
                      </span>
                      <span>
                        References <strong>{row.referencesCount}</strong>
                      </span>
                      <span>
                        Duplicates <strong>{row.duplicatesCount}</strong>
                      </span>
                      <span>
                        Merged <strong>{row.mergedCount}</strong>
                      </span>
                      <span>
                        Source <strong>{row.sourceLabel ?? "—"}</strong>
                      </span>
                    </div>
                    {row.errorMessage ? <p className="workbench-review-flash is-error">{row.errorMessage}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="workbench-review-empty">
                <strong>No imports yet</strong>
                <p>Import a bibliographic file or saved records to begin screening.</p>
                <Link href={`/my/workbench/reviews/${project.id}/import`} className="workbench-review-primary" onClick={() => setTab("file")}>
                  Import references
                </Link>
              </div>
            )}
          </section>
        )}
      </section>
    </ReviewProjectShell>
  );
}
