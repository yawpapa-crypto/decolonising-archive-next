"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deletePathway,
  updatePathway,
  type CuratorActionResult,
} from "./actions";

export type CuratorPathwayDTO = {
  id: string;
  title: string;
  theme: string;
  description: string | null;
  status: string;
  updated_at: string | null;
};

const STATUSES = ["draft", "review", "published", "archived"] as const;

function dirty(a: CuratorPathwayDTO, b: CuratorPathwayDTO) {
  return (
    a.title !== b.title ||
    a.theme !== b.theme ||
    (a.description ?? "") !== (b.description ?? "") ||
    a.status !== b.status
  );
}

export default function CuratorPathwayEditor({
  pathway,
  pathwayLinkBase,
}: {
  pathway: CuratorPathwayDTO;
  /** Origin for placeholder pathway URLs, e.g. https://example.org */
  pathwayLinkBase: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(pathway);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isDirty = useMemo(() => dirty(draft, pathway), [draft, pathway]);

  const placeholderLink = `${pathwayLinkBase.replace(/\/$/, "")}/pathways/${pathway.id}`;

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
      updatePathway({
        id: draft.id,
        title: draft.title,
        theme: draft.theme,
        description: draft.description,
        status: draft.status,
      }),
    );
  }

  function handleDiscard() {
    setFlash(null);
    setDraft(pathway);
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this pathway? This cannot be undone.",
      )
    ) {
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const res = await deletePathway(draft.id);
      if (res.ok) {
        setFlash({ kind: "ok", text: "Deleted." });
        router.refresh();
      } else {
        setFlash({ kind: "err", text: res.error });
      }
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(placeholderLink);
      setFlash({ kind: "ok", text: "Placeholder link copied." });
    } catch {
      setFlash({
        kind: "err",
        text: "Could not copy. Select the URL manually.",
      });
    }
  }

  const formattedUpdated =
    pathway.updated_at &&
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(pathway.updated_at));

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
        <p className="curator-pathway-link-block">
          <span className="curator-pathway-link-label">Pathway link (placeholder route)</span>
          <code className="curator-pathway-link-url">{placeholderLink}</code>
          <button
            type="button"
            className="curator-secondary-button curator-pathway-copy"
            onClick={copyLink}
            disabled={pending}
          >
            Copy link
          </button>
        </p>
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
          <span>Theme</span>
          <input
            value={draft.theme}
            onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
            disabled={pending}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            rows={4}
            value={draft.description ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value || null })
            }
            disabled={pending}
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
          disabled={
            pending ||
            !draft.title.trim() ||
            !draft.theme.trim() ||
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
