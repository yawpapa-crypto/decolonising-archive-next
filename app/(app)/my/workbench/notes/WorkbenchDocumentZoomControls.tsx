"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import {
  clampDocumentZoom,
  getDocumentViewportProfile,
  getDocumentZoomPresets,
} from "./document-mobile";

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

type Props = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export default function WorkbenchDocumentZoomControls({ zoom, onZoomChange }: Props) {
  const [profile, setProfile] = useState(() =>
    typeof window !== "undefined"
      ? getDocumentViewportProfile()
      : getDocumentViewportProfile(1280, 800),
  );

  useEffect(() => {
    const sync = () => setProfile(getDocumentViewportProfile());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const clamped = clampDocumentZoom(zoom, profile);
    if (clamped !== zoom) onZoomChange(clamped);
  }, [profile, zoom, onZoomChange]);

  if (profile.isPhone) {
    return (
      <div className="workbench-document-taskbar-zoom" role="group" aria-label="Document zoom">
        <button
          type="button"
          className="workbench-document-taskbar-button workbench-document-zoom-button"
          aria-label="Fit to width"
          data-tooltip="Fit"
          onClick={() => onZoomChange(100)}
        >
          <Maximize2 size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
      </div>
    );
  }

  const presets = getDocumentZoomPresets(profile);
  const maxZoom = profile.maxDocumentZoom;
  const currentZoom = Math.min(zoom, maxZoom);

  function step(delta: number) {
    onZoomChange(clampDocumentZoom(zoom + delta, profile));
  }

  return (
    <div className="workbench-document-taskbar-zoom" role="group" aria-label="Document zoom">
      <button
        type="button"
        className="workbench-document-taskbar-button workbench-document-zoom-button"
        aria-label="Zoom out"
        data-tooltip="Zoom out"
        disabled={zoom <= 50}
        onClick={() => step(-10)}
      >
        <Minus size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
      </button>
      <select
        className="workbench-document-taskbar-zoom-value workbench-document-zoom-select workbench-document-zoom-select--compact"
        value={currentZoom}
        aria-label={`Zoom ${currentZoom}%`}
        onChange={(event) => onZoomChange(clampDocumentZoom(Number(event.target.value), profile))}
      >
        {presets.map((value) => (
          <option key={value} value={value}>
            {value}%
          </option>
        ))}
      </select>
      <button
        type="button"
        className="workbench-document-taskbar-button workbench-document-zoom-button"
        aria-label="Zoom in"
        data-tooltip="Zoom in"
        disabled={zoom >= maxZoom}
        onClick={() => step(10)}
      >
        <Plus size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
      </button>
      <button
        type="button"
        className="workbench-document-taskbar-button workbench-document-zoom-button"
        aria-label="Fit width"
        data-tooltip="Fit width"
        onClick={() => onZoomChange(100)}
      >
        <Maximize2 size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
      </button>
    </div>
  );
}
