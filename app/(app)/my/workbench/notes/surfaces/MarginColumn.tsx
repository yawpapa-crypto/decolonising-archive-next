"use client";

import type { ReactNode } from "react";
import type { NoteHeading } from "@/lib/workbench-note-headings";
import type { LinkedRecordView } from "../WorkbenchNotesLinkedRecords";

type CitationPreview = {
  id: string;
  label: string;
};

type MarginColumnProps = {
  headings: NoteHeading[];
  onSelectHeading: (heading: NoteHeading) => void;
  linkedRecords: LinkedRecordView[];
  citations: CitationPreview[];
  trailSummary: string;
};

function Pane({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="workbench-margin-pane" open={defaultOpen}>
      <summary className="workbench-margin-pane__summary">
        <span>{title}</span>
        <span className="workbench-margin-pane__count">{count}</span>
      </summary>
      <div className="workbench-margin-pane__body">{children}</div>
    </details>
  );
}

export function MarginColumn({
  headings,
  onSelectHeading,
  linkedRecords,
  citations,
  trailSummary,
}: MarginColumnProps) {
  const annotationCount = headings.length;
  const provenanceCount = linkedRecords.length + citations.length;

  return (
    <aside className="workbench-margin-column" aria-label="Margin instruments">
      <Pane title="Annotations" count={annotationCount} defaultOpen>
        {headings.length ? (
          <nav aria-label="Document outline">
            <ul className="workbench-margin-outline-list">
              {headings.map((heading) => (
                <li
                  key={heading.id}
                  className="workbench-margin-outline-item"
                  style={{ paddingLeft: `${(heading.level - 1) * 10}px` }}
                >
                  <button type="button" onClick={() => onSelectHeading(heading)}>
                    {heading.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <p className="workbench-margin-pane__empty">
            Headings and marginalia will gather here as you structure the folio.
          </p>
        )}
      </Pane>

      <Pane title="Provenance" count={provenanceCount} defaultOpen>
        {linkedRecords.length ? (
          <ul className="workbench-margin-record-list">
            {linkedRecords.map((record) => (
              <li key={record.record_id}>
                <span>{record.title}</span>
                {record.source_type ? (
                  <span className="workbench-margin-pane__empty"> · {record.source_type}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {citations.length ? (
          <ul className="workbench-margin-citation-list">
            {citations.map((citation) => (
              <li key={citation.id}>{citation.label}</li>
            ))}
          </ul>
        ) : null}
        {!linkedRecords.length && !citations.length ? (
          <p className="workbench-margin-pane__empty">
            Archive links and citations appear in this column.
          </p>
        ) : null}
      </Pane>

      <Pane title="Trail" count={0}>
        <p className="workbench-margin-pane__empty">{trailSummary}</p>
      </Pane>
    </aside>
  );
}
