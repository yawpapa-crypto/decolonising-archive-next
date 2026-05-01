"use client";

// Confirm + delete a media row + its underlying storage object.
// Uses a fetch DELETE rather than a server action so the route handler
// can do the storage cleanup transactionally.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${title}"? The file will be removed from storage. This can't be undone.`
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/curator/media?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Delete failed (${res.status}).`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="workspace-link workspace-signout"
        onClick={handleDelete}
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
    </>
  );
}
