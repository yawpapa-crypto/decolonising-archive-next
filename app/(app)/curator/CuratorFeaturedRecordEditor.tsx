"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFeaturedRecord,
  updateFeaturedRecord,
  type CuratorActionResult,
} from "./actions";

export type CuratorFeaturedRecordDTO = {
  id: string;
  record_id: string;
  reason: string | null;
  placement: string;
  editorial_status: string;
  is_active: boolean;
  updated_at: string | null;
};

export type RecordOption = { id: string; title: string };

const PLACEMENTS = ["homepage", "library", "pathway"] as const;
const SLOT_STATUSES = ["active", "inactive", "archived"] as const;

function dirty(a: CuratorFeaturedRecordDTO, b: CuratorFeaturedRecordDTO) {
  return (
    a.record_id !== b.record_id ||
    a.placement !== b.placement ||
    (a.reason ?? "") !== (b.reason ?? "") ||
    a.editorial_status !== b.editorial_status
  );
}

export default function CuratorFeaturedRecordEditor({
  item,
  records,
}: {
  item: CuratorFeaturedRecordDTO;
  records: RecordOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(item);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isDirty = useMemo(() => dirty(draft, item), [draft, item]);

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
      updateFeaturedRecord({
        id: draft.id,
        record_id: draft.record_id,
        placement: draft.placement,
        reason: draft.reason,
        editorial_status: draft.editorial_status,
      }),
    );
  }

  function handleDiscard() {
    setFlash(null);
    setDraft(item);
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this featured record? This cannot be undone.",
      )
    ) {
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const res = await deleteFeaturedRecord(draft.id);
      if (res.ok) {
        setFlash({ kind: "ok", text: "Deleted." });
        router.refresh();
      } else {
        setFlash({ kind: "err", text: res.error });
      }
    });
  }

  const formattedUpdated =
    item.updated_at &&
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(item.updated_at));

  const recordLabel =
    records.find((r) => r.id === draft.record_id)?.title ?? draft.record_id;

  return (
    <article className="curator-editor-card">
      <header className="curator-editor-header">
        <div className="curator-editor-title-row">
          <h3 className="curator-editor-heading">{recordLabel}</h3>
          <span className={`curator-status-badge is-${draft.editorial_status}`}>
            {draft.editorial_status}
          </span>
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
            value={draft.record_id}
            onChange={(e) => setDraft({ ...draft, record_id: e.target.value })}
            disabled={pending}
            placeholder="Record identifier"
          />
        </label>
        <label>
          <span>Placement</span>
          <select
            value={draft.placement}
            onChange={(e) => setDraft({ ...draft, placement: e.target.value })}
            disabled={pending}
          >
            {PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Reason / note</span>
          <textarea
            rows={3}
            value={draft.reason ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, reason: e.target.value || null })
            }
            disabled={pending}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={draft.editorial_status}
            onChange={(e) =>
              setDraft({ ...draft, editorial_status: e.target.value })
            }
            disabled={pending}
          >
            {SLOT_STATUSES.map((s) => (
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
          disabled={
            pending ||
            !draft.record_id.trim() ||
            !isDirty
          }
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
