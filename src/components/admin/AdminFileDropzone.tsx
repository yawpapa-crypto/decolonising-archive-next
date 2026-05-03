"use client";

import type { DragEvent, ReactNode } from "react";
import { useCallback, useId, useState } from "react";
import { Upload } from "lucide-react";

type AdminFileDropzoneProps = {
  label?: string;
  hint?: string;
  accept?: string;
  children?: ReactNode;
};

export default function AdminFileDropzone({
  label = "Drop files here",
  hint = "or click to browse — preview only in the browser for this demo.",
  accept,
}: AdminFileDropzoneProps) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer?.files;
    if (!list?.length) return;
    setFiles(Array.from(list).map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`));
  }, []);

  return (
    <div className="admin-dropzone-wrap">
      <label
        htmlFor={inputId}
        className={`admin-dropzone ${dragOver ? "is-dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <Upload size={28} strokeWidth={1.5} className="admin-dropzone-icon" aria-hidden />
        <span className="admin-dropzone-label">{label}</span>
        <span className="admin-dropzone-hint">{hint}</span>
        <input
          id={inputId}
          type="file"
          className="admin-dropzone-input"
          multiple
          accept={accept}
          onChange={(e) => {
            const list = e.target.files;
            if (!list?.length) return;
            setFiles(Array.from(list).map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`));
          }}
        />
      </label>
      {files.length ? (
        <ul className="admin-dropzone-list">
          {files.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
