"use client";

import { useEffect, useState } from "react";

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CuratorMediaUploadForm() {
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    type: string;
    size: number;
    isImage: boolean;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    if (!file) {
      setFileMeta(null);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const nextPreviewUrl = isImage ? URL.createObjectURL(file) : "";

    setPreviewUrl(nextPreviewUrl);
    setFileMeta({
      name: file.name,
      type: file.type || "Unknown file type",
      size: file.size,
      isImage,
    });
  };

  const uploadMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsUploading(true);
    setStatus("");

    try {
      const response = await fetch("/api/curator/media", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setStatus("Media uploaded.");
      form.reset();

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setFileMeta(null);

      window.location.reload();
    } catch (error) {
      console.error("Media upload failed:", error);
      setStatus("Could not upload media.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="workspace-tile curator-media-upload">
      <div className="workspace-tile-head">
        <div>
          <p className="workspace-eyebrow">Upload</p>
          <h2>Add media</h2>
        </div>
      </div>

      <form className="workspace-form workspace-form-compact" onSubmit={uploadMedia}>
        <label>
          <span>Title</span>
          <input name="title" placeholder="Image, PDF, or media title" required />
        </label>

        <label>
          <span>Description</span>
          <textarea
            name="description"
            placeholder="Brief description or curatorial note"
            rows={4}
          />
        </label>

        <label>
          <span>Alt text</span>
          <textarea
            name="alt_text"
            placeholder="Describe the image for accessibility"
            rows={3}
          />
        </label>

        <label>
          <span>Credit / source</span>
          <input name="credit" placeholder="Photographer, archive, collection, or rights holder" />
        </label>

        <label>
          <span>Rights note</span>
          <textarea
            name="rights_note"
            placeholder="Usage permissions, copyright status, takedown note, or cultural care note"
            rows={3}
          />
        </label>

        <label>
          <span>Media type</span>
          <select name="media_type" defaultValue="image">
            <option value="image">Image</option>
            <option value="document">Document</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          <span>File</span>
          <input
            name="file"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*"
            onChange={handleFileChange}
            required
          />
        </label>

        {fileMeta ? (
          <div className="curator-upload-preview">
            {fileMeta.isImage && previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Selected media preview" />
            ) : (
              <div className="curator-upload-file-preview">
                <strong>{fileMeta.name}</strong>
                <span>{fileMeta.type}</span>
                <span>{formatFileSize(fileMeta.size)}</span>
              </div>
            )}
          </div>
        ) : null}

        <button className="workspace-cta" type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload media"}
        </button>

        {status ? <p className="workspace-empty">{status}</p> : null}
      </form>
    </section>
  );
}
