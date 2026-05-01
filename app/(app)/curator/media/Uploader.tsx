"use client";

// Curator upload form. Three-step direct-upload flow:
//   1. POST /api/curator/media → server validates + returns a signed upload URL
//   2. Browser uploads directly to Supabase Storage via uploadToSignedUrl
//   3. PATCH /api/curator/media → server confirms file exists, marks `ready`
//
// On validation failure we show the server's message inline. The UI also
// validates client-side first so users get instant feedback before a request
// is sent.

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import {
  MEDIA_BUCKET,
  MEDIA_KIND_COPY,
  MEDIA_KINDS,
  MEDIA_LIMITS,
  MEDIA_MIME_ALLOW,
  formatBytes,
  type MediaKind,
} from "@/src/lib/media";

type UploadState =
  | { phase: "idle" }
  | { phase: "validating" }
  | { phase: "signing" }
  | { phase: "uploading"; progress: number | null }
  | { phase: "finalizing" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export default function Uploader() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [kind, setKind] = useState<MediaKind>("image");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setState({ phase: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ phase: "validating" });

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setState({ phase: "error", message: "Pick a file first." });
      return;
    }
    if (!title.trim()) {
      setState({ phase: "error", message: "Add a title." });
      return;
    }

    // Client-side validation for instant feedback (the server validates again).
    const allowedMime = MEDIA_MIME_ALLOW[kind];
    if (!allowedMime.includes(file.type)) {
      setState({
        phase: "error",
        message: `${MEDIA_KIND_COPY[kind].label} must be one of: ${MEDIA_KIND_COPY[kind].mimeHint}.`,
      });
      return;
    }
    if (file.size > MEDIA_LIMITS[kind]) {
      setState({
        phase: "error",
        message: `File is ${formatBytes(file.size)}. ${MEDIA_KIND_COPY[kind].label} files can be up to ${formatBytes(MEDIA_LIMITS[kind])}.`,
      });
      return;
    }

    setState({ phase: "signing" });

    let signRes: Response;
    try {
      signRes = await fetch("/api/curator/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          description: description.trim(),
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
      return;
    }

    if (!signRes.ok) {
      const data = await signRes.json().catch(() => ({}));
      setState({
        phase: "error",
        message: data.error ?? `Server error (${signRes.status}).`,
      });
      return;
    }

    const sign = (await signRes.json()) as {
      mediaId: string;
      bucket: string;
      path: string;
      token: string;
    };

    setState({ phase: "uploading", progress: null });

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(sign.bucket || MEDIA_BUCKET)
      .uploadToSignedUrl(sign.path, sign.token, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setState({ phase: "error", message: uploadError.message });
      return;
    }

    setState({ phase: "finalizing" });

    const finalizeRes = await fetch("/api/curator/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sign.mediaId }),
    });

    if (!finalizeRes.ok) {
      const data = await finalizeRes.json().catch(() => ({}));
      setState({
        phase: "error",
        message: data.error ?? "Could not finalise the upload.",
      });
      return;
    }

    setState({ phase: "done" });
    reset();
    startTransition(() => router.refresh());
  }

  const busy =
    state.phase === "validating" ||
    state.phase === "signing" ||
    state.phase === "uploading" ||
    state.phase === "finalizing";

  const copy = MEDIA_KIND_COPY[kind];

  return (
    <form onSubmit={handleSubmit} className="media-uploader">
      <div className="media-uploader-row">
        <label className="media-field">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as MediaKind);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            disabled={busy}
          >
            {MEDIA_KINDS.map((k) => (
              <option key={k} value={k}>
                {MEDIA_KIND_COPY[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="media-field media-field-grow">
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Field recording, Accra 1972"
            maxLength={200}
            required
            disabled={busy}
          />
        </label>
      </div>

      <label className="media-field">
        <span>Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provenance, rights, original date — anything researchers should know."
          rows={3}
          disabled={busy}
        />
      </label>

      <label className="media-field">
        <span>File</span>
        <input
          ref={fileInputRef}
          type="file"
          accept={copy.accept}
          required
          disabled={busy}
        />
        <small className="media-field-hint">
          {copy.mimeHint} · {copy.sizeHint}
        </small>
      </label>

      <div className="media-uploader-footer">
        <button type="submit" className="workspace-cta" disabled={busy}>
          {state.phase === "signing" && "Preparing upload…"}
          {state.phase === "uploading" && "Uploading…"}
          {state.phase === "finalizing" && "Finalising…"}
          {state.phase === "validating" && "Checking…"}
          {(state.phase === "idle" ||
            state.phase === "done" ||
            state.phase === "error") &&
            "Upload"}
        </button>
        {state.phase === "error" && (
          <p className="auth-error" role="alert">
            {state.message}
          </p>
        )}
        {state.phase === "done" && (
          <p className="auth-notice">Upload saved.</p>
        )}
      </div>
    </form>
  );
}
