// Curator media library — gated to curator + admin.
// Lists all media (latest first) with kind/size/uploader info, plus the
// upload form. Delete is a tiny client-side fetch wrapped in a form.

import PageShell from "@/src/components/layout/PageShell";
import { requireCurator, hasRole } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import {
  MEDIA_BUCKET,
  MEDIA_KIND_COPY,
  formatBytes,
  type MediaKind,
} from "@/src/lib/media";
import Uploader from "./Uploader";
import DeleteButton from "./DeleteButton";

type MediaRow = {
  id: string;
  kind: MediaKind;
  status: "pending" | "ready" | "failed";
  title: string;
  description: string | null;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

function publicUrl(path: string, supabaseUrl: string) {
  // archive-media is a public bucket; this URL is the canonical CDN-served
  // location for the file.
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export default async function CuratorMediaPage() {
  const profile = await requireCurator();
  const isAdmin = hasRole(profile, "admin");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .select(
      "id, kind, status, title, description, file_path, mime_type, size_bytes, uploaded_by, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as MediaRow[];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <PageShell>
      <main className="workspace-page curator-workspace">
        <header className="workspace-header">
          <p className="workspace-eyebrow">Editorial tools</p>
          <div className="workspace-titlebar">
            <h1>Media library</h1>
            <span className={`role-badge role-${profile.role}`}>
              {isAdmin ? "Admin" : "Curator"}
            </span>
          </div>
          <p className="workspace-sub">
            Upload audio, video, PDFs and images for the archive. Files become
            publicly available once they finish uploading. Curator and admin
            access only.
          </p>
        </header>

        {error ? <p className="auth-error">{error.message}</p> : null}

        <section className="workspace-tile workspace-tool">
          <div className="workspace-tile-head">
            <h2>Upload media</h2>
          </div>
          <Uploader />
        </section>

        <section className="workspace-tile workspace-tool">
          <div className="workspace-tile-head">
            <h2>Library ({rows.length})</h2>
          </div>
          {rows.length === 0 ? (
            <p className="workspace-empty">No media uploaded yet.</p>
          ) : (
            <ul className="media-list">
              {rows.map((row) => {
                const url = publicUrl(row.file_path, supabaseUrl);
                return (
                  <li className="media-list-item" key={row.id}>
                    <div className="media-list-meta">
                      <span className={`media-kind media-kind-${row.kind}`}>
                        {MEDIA_KIND_COPY[row.kind].label}
                      </span>
                      <span className={`media-status media-status-${row.status}`}>
                        {row.status}
                      </span>
                    </div>
                    <strong className="media-title">{row.title}</strong>
                    {row.description ? (
                      <p className="media-desc">{row.description}</p>
                    ) : null}
                    <div className="media-list-meta">
                      <span>{row.mime_type}</span>
                      <span>·</span>
                      <span>{formatBytes(row.size_bytes)}</span>
                    </div>
                    <div className="media-list-actions">
                      {row.status === "ready" ? (
                        <a
                          className="workspace-link"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open file ↗
                        </a>
                      ) : (
                        <span className="workspace-link workspace-link-muted">
                          Awaiting upload
                        </span>
                      )}
                      <DeleteButton id={row.id} title={row.title} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </PageShell>
  );
}
