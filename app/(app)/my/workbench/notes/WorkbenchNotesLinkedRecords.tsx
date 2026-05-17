"use client";

import { useMemo, useState } from "react";
import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import { linkNoteRecord, unlinkNoteRecord } from "@/lib/workbench-note-actions";

export type LinkedRecordView = {
  record_id: string;
  title: string;
  source_type: string | null;
};

type Props = {
  noteId: string;
  canEdit: boolean;
  linkedRecords: LinkedRecordView[];
  linkableRecords: WorkbenchLinkableRecord[];
  onLinksChange: (recordIds: string[]) => void;
  onInsertBlock: (record: LinkedRecordView) => void;
  onError?: (message: string) => void;
};

export default function WorkbenchNotesLinkedRecords({
  noteId,
  canEdit,
  linkedRecords,
  linkableRecords,
  onLinksChange,
  onInsertBlock,
  onError,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);

  const linkedIds = useMemo(() => new Set(linkedRecords.map((r) => r.record_id)), [linkedRecords]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return linkableRecords
      .filter((r) => !linkedIds.has(r.record_id))
      .filter((r) => {
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          r.record_id.toLowerCase().includes(q) ||
          (r.source_type?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 24);
  }, [linkableRecords, linkedIds, query]);

  async function handleLink(recordId: string) {
    setPending(true);
    const result = await linkNoteRecord({ noteId, recordId });
    setPending(false);
    if (!result.ok) {
      onError?.(result.error || "Could not link record.");
      return;
    }
    onLinksChange([...linkedRecords.map((r) => r.record_id), recordId]);
    setQuery("");
    setOpen(false);
  }

  async function handleUnlink(recordId: string) {
    setPending(true);
    const result = await unlinkNoteRecord({ noteId, recordId });
    setPending(false);
    if (!result.ok) {
      onError?.(result.error || "Could not unlink record.");
      return;
    }
    onLinksChange(linkedRecords.filter((r) => r.record_id !== recordId).map((r) => r.record_id));
  }

  return (
    <div className="workbench-linked-records-panel">
      <div className="workbench-linked-records-panel__header">
        <strong>Linked records</strong>
        {canEdit ? (
          <button
            type="button"
            className="workbench-button workbench-button-secondary"
            onClick={() => setOpen((v) => !v)}
            disabled={pending}
          >
            Link record
          </button>
        ) : null}
      </div>

      {linkedRecords.length ? (
        <ul className="workbench-linked-records-panel__list">
          {linkedRecords.map((record) => (
            <li key={record.record_id} className="workbench-linked-record-chip">
              <div>
                <strong>{record.title}</strong>
                {record.source_type ? <span>{record.source_type}</span> : null}
              </div>
              {canEdit ? (
                <div className="workbench-linked-record-chip__actions">
                  <button
                    type="button"
                    className="workbench-editor-button"
                    onClick={() => onInsertBlock(record)}
                  >
                    Insert block
                  </button>
                  <button
                    type="button"
                    className="workbench-editor-button"
                    onClick={() => void handleUnlink(record.record_id)}
                    disabled={pending}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="workbench-muted">No linked records yet.</p>
      )}

      {open ? (
        <div className="workbench-link-record-modal" role="dialog" aria-label="Link archive record">
          <input
            type="search"
            className="workbench-note-search"
            placeholder="Search records..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length ? (
            <ul>
              {filtered.map((record) => (
                <li key={record.record_id}>
                  <div>
                    <strong>{record.title}</strong>
                    {record.source_type ? <span>{record.source_type}</span> : null}
                  </div>
                  <button
                    type="button"
                    className="workbench-button workbench-button-primary"
                    disabled={pending}
                    onClick={() => void handleLink(record.record_id)}
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="workbench-muted">
              {linkableRecords.length
                ? "No records match this search."
                : "No project records available. Add records to a project first."}
            </p>
          )}
          <button
            type="button"
            className="workbench-button workbench-button-secondary"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
