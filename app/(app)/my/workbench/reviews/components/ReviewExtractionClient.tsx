"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExtractionField, upsertExtraction } from "@/lib/workbench-review-actions";
import type { WorkbenchReviewField, WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import ReviewProjectShell from "./ReviewProjectShell";
import { resultMessage, statusLabel } from "./review-shared";

function fieldKeyFromName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "field"
  );
}

export default function ReviewExtractionClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const project = snapshot.activeProject;
  const included = snapshot.screenings.filter((record) => record.status === "final_included");
  const firstRecordId = included[0]?.recordId ?? snapshot.screenings[0]?.recordId ?? "";
  const [selectedRecordId, setSelectedRecordId] = useState(firstRecordId);

  const selectedRecord =
    snapshot.screenings.find((record) => record.recordId === selectedRecordId) ?? included[0] ?? null;

  const extractionValueByFieldAndRecord = useMemo(() => {
    const map = new Map<string, string>();
    snapshot.extractions.forEach((row) => {
      const fieldId = typeof row.field_id === "string" ? row.field_id : "";
      const recordId = typeof row.record_id === "string" ? row.record_id : "";
      if (!fieldId || !recordId) return;
      const value = row.value;
      map.set(`${fieldId}:${recordId}`, typeof value === "string" ? value : JSON.stringify(value ?? ""));
    });
    return map;
  }, [snapshot.extractions]);

  if (!project) return null;
  const projectId = project.id;

  function addExtractionField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "");
    startTransition(async () => {
      const result = await createExtractionField(projectId, {
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
    if (!selectedRecord) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await upsertExtraction(
        projectId,
        field.id,
        selectedRecord.recordId,
        String(form.get("value") ?? ""),
      );
      setMessage(resultMessage(result, "Extraction value saved."));
      router.refresh();
    });
  }

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="extraction">
      <section className="workbench-review-extraction workbench-review-page">
        {message ? <p className="workbench-review-flash">{message}</p> : null}

        <div className="workbench-review-card">
          <div className="workbench-review-card-header">
            <div>
              <h2>Data extraction</h2>
              <p>
                {included.length} included studies · {snapshot.fields.length} fields ·{" "}
                {snapshot.extractions.length} values saved
              </p>
            </div>
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
                </select>
              </label>
              <label className="workbench-review-checkbox">
                <input name="required" type="checkbox" />
                <span>Required</span>
              </label>
              <button className="workbench-review-primary" type="submit" disabled={isPending}>
                Add field
              </button>
            </form>

            <div className="workbench-review-record-picker">
              <label>
                <span>Study</span>
                <select value={selectedRecord?.recordId ?? ""} onChange={(event) => setSelectedRecordId(event.target.value)}>
                  {(included.length ? included : snapshot.screenings).map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {record.title}
                    </option>
                  ))}
                </select>
              </label>
              <p>{selectedRecord ? statusLabel(selectedRecord.status) : "No study selected"}</p>
            </div>
          </div>

          <div className="workbench-review-extraction-table">
            {snapshot.fields.map((field) => (
              <form key={field.id} onSubmit={(event) => saveExtraction(event, field)}>
                <div>
                  <strong>{field.name}</strong>
                  <span>
                    {field.fieldType}
                    {field.required ? " · required" : ""}
                  </span>
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
              <div className="workbench-review-empty">
                <strong>No extraction fields</strong>
                <p>Add fields for methods, findings, population, region and relevance.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </ReviewProjectShell>
  );
}
