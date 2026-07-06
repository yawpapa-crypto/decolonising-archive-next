"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDossier,
  updateDossier,
  type CuratorActionResult,
} from "./actions";

export type CuratorDossierDTO = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  status: string;
  updated_at: string | null;
};

const STATUSES = ["draft", "review", "published", "archived"] as const;

function dirty(a: CuratorDossierDTO, b: CuratorDossierDTO) {
  return (
    a.title !== b.title ||
    (a.summary ?? "") !== (b.summary ?? "") ||
    (a.body ?? "") !== (b.body ?? "") ||
    a.status !== b.status
  );
}

export default function CuratorDossierEditor({ dossier }: { dossier: CuratorDossierDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(dossier);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isDirty = useMemo(() => dirty(draft, dossier), [draft, dossier]);

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
      updateDossier({
        id: draft.id,
        title: draft.title,
        summary: draft.summary,
        body: draft.body,
        status: draft.status,
      }),
    );
  }

  function handleDiscard() {
    setFlash(null);
    setDraft(dossier);
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this dossier? This cannot be undone.",
      )
    ) {
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const res = await deleteDossier(draft.id);
      if (res.ok) {
        setFlash({ kind: "ok", text: "Deleted." });
        router.refresh();
      } else {
        setFlash({ kind: "err", text: res.error });
      }
    });
  }

  const formattedUpdated =
    dossier.updated_at &&
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dossier.updated_at));

  return (
    <article className="curator-editor-card">
      <header className="curator-editor-header">
        <div className="curator-editor-title-row">
          <h3 className="curator-editor-heading">{draft.title}</h3>
          <span className={`curator-status-badge is-${draft.status}`}>
            {draft.status}
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
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            disabled={pending}
          />
        </label>
        <label>
          <span>Summary</span>
          <textarea
            rows={3}
            value={draft.summary ?? ""}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value || null })}
            disabled={pending}
          />
        </label>
        <label>
          <span>Essay / body</span>
          <textarea
            rows={6}
            value={draft.body ?? ""}
            onChange={(e) => setDraft({ ...draft, body: e.target.value || null })}
            disabled={pending}
            placeholder="Long-form narrative"
          />
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
          disabled={pending || !draft.title.trim() || !isDirty}
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
