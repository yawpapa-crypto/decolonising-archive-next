"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteArchiveNote,
  updateArchiveNote,
  type CuratorActionResult,
} from "./actions";

export type CuratorArchiveNoteDTO = {
  id: string;
  record_id: string | null;
  title: string;
  note: string;
  note_type: string;
  status: string;
  updated_at: string | null;
};

const NOTE_TYPES = [
  "context",
  "provenance",
  "rights",
  "warning",
  "citation",
  "correction",
] as const;

const STATUSES = ["draft", "review", "published", "archived"] as const;

function dirty(a: CuratorArchiveNoteDTO, b: CuratorArchiveNoteDTO) {
  return (
    (a.record_id ?? "") !== (b.record_id ?? "") ||
    a.title !== b.title ||
    a.note !== b.note ||
    a.note_type !== b.note_type ||
    a.status !== b.status
  );
}

export default function CuratorArchiveNoteEditor({
  note,
}: {
  note: CuratorArchiveNoteDTO;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(note);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isDirty = useMemo(() => dirty(draft, note), [draft, note]);

  function runAction(fn: () => Promise<CuratorActionResult>) {
    setFlash(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setFlash({ kind: "ok", text: "Saved." });
        router.refresh();
      } else {
        setFlash({ kind: "err", text: res.error });
      }
    });
  }

  function handleSave() {
    runAction(() =>
      updateArchiveNote({
        id: draft.id,
        record_id: draft.record_id?.trim() ? draft.record_id.trim() : null,
        title: draft.title,
        note: draft.note,
        note_type: draft.note_type,
        status: draft.status,
      }),
    );
  }

  function handleDiscard() {
    setFlash(null);
    setDraft(note);
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this archive note? This cannot be undone.",
      )
    ) {
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const res = await deleteArchiveNote(draft.id);
      if (res.ok) {
        setFlash({ kind: "ok", text: "Deleted." });
        router.refresh();
      } else {
        setFlash({ kind: "err", text: res.error });
      }
    });
  }

  const formattedUpdated =
    note.updated_at &&
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(note.updated_at));

  return (
    <article className="curator-editor-card">
      <header className="curator-editor-header">
        <div className="curator-editor-title-row">
          <h3 className="curator-editor-heading">{draft.title}</h3>
          <span className={`curator-status-badge is-${draft.status}`}>
            {draft.status}
          </span>
          <span className="curator-status-badge note-type">{draft.note_type}</span>
          {isDirty ? (
            <span className="curator-unsaved-badge">Unsaved changes</span>
          ) : null}
        </div>
        {formattedUpdated ? (
          <p className="curator-editor-meta">Updated {formattedUpdated}</p>
        ) : null}
      </header>

      <div className="curator-editor-form">
        <label>
          <span>Record ID</span>
          <input
            value={draft.record_id ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                record_id: e.target.value.trim() ? e.target.value.trim() : null,
              })
            }
            disabled={pending}
            placeholder="Leave empty for a general note"
          />
        </label>
        <label>
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            disabled={pending}
          />
        </label>
        <label>
          <span>Note body</span>
          <textarea
            rows={5}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            disabled={pending}
          />
        </label>
        <label>
          <span>Note type</span>
          <select
            value={draft.note_type}
            onChange={(e) => setDraft({ ...draft, note_type: e.target.value })}
            disabled={pending}
          >
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            disabled={pending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="curator-editor-actions">
        <button
          type="button"
          className="workspace-cta"
          disabled={pending || !draft.title.trim() || !draft.note.trim() || !isDirty}
          onClick={handleSave}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="curator-secondary-button"
          disabled={pending || !isDirty}
          onClick={handleDiscard}
        >
          Discard
        </button>
        <button
          type="button"
          className="curator-danger-button"
          disabled={pending}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      {flash ? (
        <p className={flash.kind === "ok" ? "auth-notice" : "auth-error"} role="status">
          {flash.text}
        </p>
      ) : null}
    </article>
  );
}
