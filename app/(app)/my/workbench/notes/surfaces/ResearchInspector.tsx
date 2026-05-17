"use client";

import { useState } from "react";
import type { NoteHeading } from "@/lib/workbench-note-headings";
import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import type { LinkedRecordView } from "../WorkbenchNotesLinkedRecords";

type CitationPreview = {
  id: string;
  label: string;
  endnote?: string;
};

type InspectorTab = "outline" | "sources" | "citations" | "tasks";

type ResearchInspectorProps = {
  headings: NoteHeading[];
  onSelectHeading: (heading: NoteHeading) => void;
  linkedRecords: LinkedRecordView[];
  linkableRecords: WorkbenchLinkableRecord[];
  citations: CitationPreview[];
  onOpenCitation: () => void;
  onCiteRecord?: (recordId: string) => void;
  onOpenRecord?: (recordId: string) => void;
  onClose?: () => void;
};

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "outline", label: "Outline" },
  { id: "sources", label: "Sources" },
  { id: "citations", label: "Citations" },
  { id: "tasks", label: "Tasks" },
];

function sourceTypeLabel(type: string | null | undefined) {
  if (!type) return "Archive record";
  return type.replace(/_/g, " ");
}

type InspectorCardProps = {
  title: string;
  meta: string;
  typeLabel: string;
  onOpen?: () => void;
  onCite: () => void;
};

function ResearchInspectorCard({ title, meta, typeLabel, onOpen, onCite }: InspectorCardProps) {
  return (
    <article className="workbench-inspector-source-card">
      <div className="workbench-inspector-source-card__header">
        <h3>{title}</h3>
        <span className="workbench-inspector-source-card__tag">{typeLabel}</span>
      </div>
      <p className="workbench-inspector-source-card__meta">{meta}</p>
      <div className="workbench-inspector-source-card__actions">
        <button type="button" disabled={!onOpen} onClick={onOpen}>
          Open
        </button>
        <button type="button" className="is-cite" onClick={onCite}>
          Cite
        </button>
      </div>
    </article>
  );
}

export function ResearchInspector({
  headings,
  onSelectHeading,
  linkedRecords,
  linkableRecords,
  citations,
  onOpenCitation,
  onCiteRecord,
  onOpenRecord,
  onClose,
}: ResearchInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("sources");

  const linkedRecordIds = new Set(linkedRecords.map((record) => record.record_id));
  const linkedSourceCards = linkableRecords.filter((record) => linkedRecordIds.has(record.record_id));
  const sourceCards = (linkedSourceCards.length ? linkedSourceCards : linkableRecords).slice(0, 12);

  const renderCite = (recordId?: string) => {
    if (recordId && onCiteRecord) {
      onCiteRecord(recordId);
      return;
    }
    onOpenCitation();
  };

  return (
    <aside className="workbench-research-inspector" aria-label="Research Inspector">
      <header className="workbench-research-inspector__header">
        <div>
          <p className="workbench-research-inspector__eyebrow">Archive context</p>
          <h2>Research Inspector</h2>
        </div>
        {onClose ? (
          <button
            type="button"
            className="workbench-research-inspector__close"
            onClick={onClose}
            aria-label="Close Research Inspector"
          >
            Close
          </button>
        ) : null}
      </header>

      <div className="workbench-research-inspector__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`workbench-research-inspector__tab${activeTab === tab.id ? " is-active" : ""}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="workbench-research-inspector__body">
        {activeTab === "outline" ? (
          <div className="workbench-research-inspector__panel" role="tabpanel">
            {headings.length ? (
              <ul className="workbench-research-inspector__outline">
                {headings.map((heading) => (
                  <li
                    key={heading.id}
                    style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                  >
                    <button type="button" onClick={() => onSelectHeading(heading)}>
                      {heading.text}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="workbench-research-inspector__empty">
                Headings in your note appear here for quick navigation.
              </p>
            )}
          </div>
        ) : null}

        {activeTab === "sources" ? (
          <div className="workbench-research-inspector__panel" role="tabpanel">
            {sourceCards.length ? (
              <div className="workbench-research-inspector__sources">
                {sourceCards.map((record) => (
                  <ResearchInspectorCard
                    key={record.record_id}
                    title={record.title}
                    meta={record.source_type ? sourceTypeLabel(record.source_type) : "Archive source"}
                    typeLabel={sourceTypeLabel(record.source_type)}
                    onOpen={onOpenRecord ? () => onOpenRecord(record.record_id) : undefined}
                    onCite={() => renderCite(record.record_id)}
                  />
                ))}
              </div>
            ) : (
              <p className="workbench-research-inspector__empty">No archive sources available yet.</p>
            )}
            {linkedRecords.length ? (
              <p className="workbench-research-inspector__linked-count">
                {linkedRecords.length} linked to this note
              </p>
            ) : null}
          </div>
        ) : null}

        {activeTab === "citations" ? (
          <div className="workbench-research-inspector__panel" role="tabpanel">
            <label className="workbench-research-inspector__field-label">
              Citation style
              <select className="workbench-research-inspector__style-select" defaultValue="apa7">
                <option value="apa7">APA 7</option>
                <option value="chicago-notes">Chicago Notes</option>
                <option value="chicago-author">Chicago Author-Date</option>
                <option value="harvard">Harvard</option>
                <option value="mla">MLA</option>
              </select>
            </label>
            {sourceCards.length || citations.length ? (
              <div className="workbench-research-inspector__sources">
                {sourceCards.map((record) => (
                  <ResearchInspectorCard
                    key={`cite-source-${record.record_id}`}
                    title={record.title}
                    meta={record.source_type ? sourceTypeLabel(record.source_type) : "Archive source"}
                    typeLabel={sourceTypeLabel(record.source_type)}
                    onOpen={onOpenRecord ? () => onOpenRecord(record.record_id) : undefined}
                    onCite={() => renderCite(record.record_id)}
                  />
                ))}
                {citations.map((citation) => (
                  <ResearchInspectorCard
                    key={`cite-preview-${citation.id}`}
                    title={citation.label || citation.endnote || "Citation preview"}
                    meta={citation.endnote ? "Endnote preview" : "In-text citation preview"}
                    typeLabel="Citation"
                    onOpen={undefined}
                    onCite={() => renderCite(undefined)}
                  />
                ))}
              </div>
            ) : (
              <p className="workbench-research-inspector__empty">
                Citations you insert appear here.
              </p>
            )}
            <button
              type="button"
              className="workbench-research-inspector__btn workbench-research-inspector__btn--cite"
              onClick={onOpenCitation}
            >
              Insert citation
            </button>
          </div>
        ) : null}

        {activeTab === "tasks" ? (
          <div className="workbench-research-inspector__panel" role="tabpanel">
            <p className="workbench-research-inspector__empty">
              Task links from your project will appear here in a later release.
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
