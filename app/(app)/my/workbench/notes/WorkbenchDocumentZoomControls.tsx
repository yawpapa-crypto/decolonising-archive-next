"use client";

export const DOCUMENT_ZOOM_PRESETS = [50, 75, 100, 125, 150, 200] as const;

type Props = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export default function WorkbenchDocumentZoomControls({ zoom, onZoomChange }: Props) {
  function step(delta: number) {
    const next = Math.min(200, Math.max(50, zoom + delta));
    onZoomChange(next);
  }

  return (
    <div
      className="workbench-document-zoom-controls workbench-document-zoom-controls--premium"
      role="group"
      aria-label="Document zoom"
    >
      <span className="workbench-document-zoom-label" aria-hidden="true">
        Zoom
      </span>
      <button
        type="button"
        className="workbench-editor-button workbench-document-zoom-button"
        aria-label="Zoom out"
        title="Zoom out"
        disabled={zoom <= 50}
        onClick={() => step(-10)}
      >
        −
      </button>
      <select
        className="workbench-editor-toolbar-select workbench-document-zoom-select"
        value={zoom}
        aria-label="Document zoom level"
        title="Zoom"
        onChange={(event) => onZoomChange(Number(event.target.value))}
      >
        {DOCUMENT_ZOOM_PRESETS.map((value) => (
          <option key={value} value={value}>
            {value}%
          </option>
        ))}
      </select>
      <button
        type="button"
        className="workbench-editor-button workbench-document-zoom-button"
        aria-label="Zoom in"
        title="Zoom in"
        disabled={zoom >= 200}
        onClick={() => step(10)}
      >
        +
      </button>
      <button
        type="button"
        className="workbench-editor-button workbench-document-zoom-button"
        aria-label="Reset zoom to 100%"
        title="Fit 100%"
        onClick={() => onZoomChange(100)}
      >
        100%
      </button>
    </div>
  );
}
