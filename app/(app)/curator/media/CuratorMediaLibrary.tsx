"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MediaLink = {
  id: string;
  media_id: string;
  target_type: string;
  target_id: string;
  relation_type: string;
  caption?: string | null;
};

type MediaItem = {
  id: string;
  title: string;
  description?: string | null;
  alt_text?: string | null;
  credit?: string | null;
  rights_note?: string | null;
  media_type?: string | null;
  file_name: string;
  file_path: string;
  public_url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
  media_links?: MediaLink[];
};

type CuratorMediaLibraryProps = {
  mediaItems: MediaItem[];
};

function mediaBadge(item: MediaItem) {
  if (item.mime_type?.startsWith("image/")) return "IMAGE";
  if (item.mime_type?.includes("pdf")) return "PDF";
  if (item.mime_type?.startsWith("audio/")) return "AUDIO";
  if (item.mime_type?.startsWith("video/")) return "VIDEO";
  return (item.media_type || "FILE").toUpperCase();
}

function isCoverMedia(links: MediaLink[] | undefined) {
  return links?.some((l) => l.relation_type === "cover") ?? false;
}

function usageMix(links: MediaLink[] | undefined) {
  if (!links?.length) return [];
  const counts: Record<string, number> = {};
  for (const l of links) {
    const k = l.target_type || "other";
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts).map(([type, n]) => ({ type, n }));
}

function LinkMediaForm({
  mediaId,
  mode,
  onDone,
}: {
  mediaId: string;
  mode: "cover" | "attachment";
  onDone: () => void;
}) {
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submitLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const targetType = String(formData.get("target_type") || "");
    const targetId = String(formData.get("target_id") || "");
    const caption = String(formData.get("caption") || "");
    const relationType =
      mode === "cover" ? "cover" : String(formData.get("relation_type") || "attachment");

    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/curator/media-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaId,
          targetType,
          targetId,
          relationType,
          caption,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not link media");
      }

      setStatus(mode === "cover" ? "Cover saved." : "Media attached.");
      window.setTimeout(() => {
        onDone();
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Link media failed:", error);
      setStatus("Could not save media link.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="curator-media-link-form" onSubmit={submitLink}>
      <label>
        <span>Target type</span>
        <select name="target_type" defaultValue={mode === "cover" ? "dossier" : "record"}>
          <option value="record">Record</option>
          <option value="dossier">Dossier</option>
          <option value="collection">Collection</option>
          <option value="pathway">Pathway</option>
          <option value="featured_record">Featured record</option>
          <option value="archive_note">Archive note</option>
        </select>
      </label>

      <label>
        <span>Target ID</span>
        <input name="target_id" placeholder="Record, collection, dossier, or pathway ID" required />
      </label>

      {mode === "attachment" ? (
        <label>
          <span>Relation</span>
          <select name="relation_type" defaultValue="attachment">
            <option value="attachment">Attachment</option>
            <option value="gallery">Gallery</option>
            <option value="reference">Reference</option>
          </select>
        </label>
      ) : null}

      <label>
        <span>Caption</span>
        <input name="caption" placeholder="Optional caption or cover note" />
      </label>

      <button type="submit" className="workspace-cta" disabled={isSaving}>
        {isSaving ? "Saving..." : mode === "cover" ? "Use as cover" : "Attach media"}
      </button>

      {status ? <p className="workspace-empty">{status}</p> : null}
    </form>
  );
}

export default function CuratorMediaLibrary({
  mediaItems,
}: CuratorMediaLibraryProps) {
  const [activeForm, setActiveForm] = useState<{
    mediaId: string;
    mode: "cover" | "attachment";
  } | null>(null);
  const [filter, setFilter] = useState("");
  const skipUrlDebounce = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilter(params.get("q") ?? "");
  }, []);

  useEffect(() => {
    if (skipUrlDebounce.current) {
      skipUrlDebounce.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (filter.trim()) url.searchParams.set("q", filter.trim());
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }, 280);
    return () => window.clearTimeout(t);
  }, [filter]);

  const visibleItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return mediaItems;
    return mediaItems.filter((item) => {
      const blob = [
        item.title,
        item.description,
        item.file_name,
        item.credit,
        item.rights_note,
        item.mime_type,
        item.media_type,
        ...(item.media_links?.map((l) => `${l.target_type} ${l.target_id} ${l.caption ?? ""}`) ??
          []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [mediaItems, filter]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Media URL copied.");
    } catch (error) {
      console.error("Copy media URL failed:", error);
      window.alert("Could not copy media URL.");
    }
  };

  const deleteMedia = async (id: string) => {
    if (!window.confirm("Delete this media item? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/curator/media/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Delete failed");
      }

      window.location.reload();
    } catch (error) {
      console.error("Delete media failed:", error);
      window.alert("Could not delete media.");
    }
  };

  return (
    <section className="workspace-tile curator-media-library">
      <div className="workspace-tile-head curator-media-library-head">
        <div>
          <p className="workspace-eyebrow">Library</p>
          <h2>Uploaded media</h2>
        </div>
        <label className="curator-media-filter">
          <span className="admin-sr-only">Filter media</span>
          <input
            type="search"
            className="admin-search"
            placeholder="Filter by title, file, links…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter media library"
          />
        </label>
      </div>

      {mediaItems.length ? (
        <div className="curator-media-grid">
          {visibleItems.length ? (
            visibleItems.map((item) => (
            <article className="curator-media-card" key={item.id}>
              <div className="curator-media-preview">
                {isCoverMedia(item.media_links) ? (
                  <span className="curator-media-cover-ribbon">Cover</span>
                ) : null}
                {item.mime_type?.startsWith("image/") && item.public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.public_url} alt={item.alt_text || item.title} />
                ) : (
                  <div className="curator-media-file">{mediaBadge(item)}</div>
                )}
              </div>

              <div className="curator-media-body">
                <div className="curator-media-card-head">
                  <h3>{item.title}</h3>
                  <span>{mediaBadge(item)}</span>
                </div>

                {item.description ? <p>{item.description}</p> : null}
                {item.credit ? <p className="curator-media-meta">Credit: {item.credit}</p> : null}
                {item.rights_note ? (
                  <p className="curator-media-meta">Rights: {item.rights_note}</p>
                ) : null}
                <p className="curator-media-meta">{item.file_name}</p>

                {usageMix(item.media_links).length ? (
                  <div
                    className="curator-media-usage-mix"
                    role="img"
                    aria-label={`Linked targets: ${item.media_links?.map((l) => l.target_type).join(", ")}`}
                  >
                    {usageMix(item.media_links).map((seg) => (
                      <span
                        key={seg.type}
                        className={`curator-media-usage-seg is-${seg.type}`}
                        style={{ flexGrow: seg.n, flexShrink: 1, flexBasis: 0 }}
                        title={`${seg.type}: ${seg.n}`}
                      />
                    ))}
                  </div>
                ) : null}

                {item.media_links?.length ? (
                  <div className="curator-media-used-in">
                    <strong>Used in</strong>
                    <ul className="curator-used-in-list">
                      {item.media_links.map((link) => (
                        <li key={link.id}>
                          <span className="curator-used-in-pill">{link.relation_type}</span>
                          <span className="curator-used-in-target">
                            <span className="curator-used-in-type">{link.target_type}</span>
                            <code className="curator-used-in-id">{link.target_id}</code>
                          </span>
                          {link.caption ? (
                            <span className="curator-used-in-caption">{link.caption}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="curator-media-actions">
                  {item.public_url ? (
                    <>
                      <a href={item.public_url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                      <button type="button" onClick={() => copyUrl(item.public_url || "")}>
                        Copy URL
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setActiveForm({ mediaId: item.id, mode: "attachment" })}
                  >
                    Attach to record
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveForm({ mediaId: item.id, mode: "cover" })}
                  >
                    Use as cover
                  </button>

                  <button
                    type="button"
                    className="workspace-link-danger"
                    onClick={() => deleteMedia(item.id)}
                  >
                    Delete
                  </button>
                </div>

                {activeForm?.mediaId === item.id ? (
                  <div className="curator-media-link-panel">
                    <div className="workspace-tile-head">
                      <div>
                        <p className="workspace-eyebrow">
                          {activeForm.mode === "cover" ? "Cover image" : "Media attachment"}
                        </p>
                        <h4>
                          {activeForm.mode === "cover"
                            ? "Use this media as a cover"
                            : "Attach this media"}
                        </h4>
                      </div>
                      <button
                        type="button"
                        className="workspace-link"
                        onClick={() => setActiveForm(null)}
                      >
                        Close
                      </button>
                    </div>

                    <LinkMediaForm
                      mediaId={item.id}
                      mode={activeForm.mode}
                      onDone={() => setActiveForm(null)}
                    />
                  </div>
                ) : null}
              </div>
            </article>
            ))
          ) : (
            <p className="workspace-empty curator-media-filter-empty">
              No media matches &quot;{filter.trim()}&quot;.{" "}
              <button type="button" className="workspace-link" onClick={() => setFilter("")}>
                Clear filter
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="workspace-empty workspace-empty-guidance curator-media-empty">
          <p className="curator-empty-title">No media in the library</p>
          <p>
            Upload images, documents, audio, or video, then attach them to records or set
            a dossier cover. Files appear here with previews and “used in” links once
            connected.
          </p>
        </div>
      )}
    </section>
  );
}
