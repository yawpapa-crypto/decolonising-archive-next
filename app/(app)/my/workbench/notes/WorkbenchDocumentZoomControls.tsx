"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import {
  clampDocumentZoom,
  getDocumentViewportProfile,
  getDocumentZoomPresets,
} from "./document-mobile";
import WorkbenchIconTip from "./WorkbenchIconTip";

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
      <WorkbenchIconTip tip="Fit" info="Matches screen width">
        <span
          className="workbench-document-zoom-controls workbench-document-zoom-controls--mobile-fit"
          aria-label="Fit — matches screen width"
        >
          <Maximize2 size={15} strokeWidth={1.75} aria-hidden />
        </span>
      </WorkbenchIconTip>
    );
  }

  const presets = getDocumentZoomPresets(profile);
  const maxZoom = profile.maxDocumentZoom;
  const currentZoom = Math.min(zoom, maxZoom);

  function step(delta: number) {
    onZoomChange(clampDocumentZoom(zoom + delta, profile));
  }

  return (
    <div
      className="workbench-document-zoom-controls workbench-document-zoom-controls--premium workbench-document-zoom-controls--icons"
      role="group"
      aria-label="Document zoom"
    >
      <WorkbenchIconTip tip="Zoom out" info="Smaller text">
        <button
          type="button"
          className="workbench-document-top-bar__icon-btn workbench-document-zoom-button"
          aria-label="Zoom out — smaller text"
          disabled={zoom <= 50}
          onClick={() => step(-10)}
        >
          <Minus size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </WorkbenchIconTip>
      <WorkbenchIconTip tip="Zoom" info={`Currently ${currentZoom}%`}>
        <select
          className="workbench-document-zoom-select workbench-document-zoom-select--compact"
          value={currentZoom}
          aria-label={`Zoom — currently ${currentZoom}%`}
          onChange={(event) => onZoomChange(clampDocumentZoom(Number(event.target.value), profile))}
        >
          {presets.map((value) => (
            <option key={value} value={value}>
              {value}%
            </option>
          ))}
        </select>
      </WorkbenchIconTip>
      <WorkbenchIconTip tip="Zoom in" info="Larger text">
        <button
          type="button"
          className="workbench-document-top-bar__icon-btn workbench-document-zoom-button"
          aria-label="Zoom in — larger text"
          disabled={zoom >= maxZoom}
          onClick={() => step(10)}
        >
          <Plus size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </WorkbenchIconTip>
      <WorkbenchIconTip tip="Fit width" info="Reset to 100%">
        <button
          type="button"
          className="workbench-document-top-bar__icon-btn workbench-document-zoom-button"
          aria-label="Fit width — reset to 100%"
          onClick={() => onZoomChange(100)}
        >
          <Maximize2 size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </WorkbenchIconTip>
    </div>
  );
}
