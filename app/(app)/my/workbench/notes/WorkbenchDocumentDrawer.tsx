"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DocumentSidebarTab } from "./WorkbenchDocumentTopBar";

type Props = {
  open: boolean;
  pinned: boolean;
  tab: DocumentSidebarTab;
  onTabChange: (tab: DocumentSidebarTab) => void;
  onTogglePin: () => void;
  onClose: () => void;
  formatPanel: ReactNode;
  documentPanel: ReactNode;
};

export default function WorkbenchDocumentDrawer({
  open,
  pinned,
  tab,
  onTabChange,
  onTogglePin,
  onClose,
  formatPanel,
  documentPanel,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      {!pinned ? (
        <div
          role="presentation"
          className="workbench-pages-drawer-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`workbench-pages-drawer${pinned ? " is-pinned" : " is-overlay"}`}
        aria-label="Format and document settings"
      >
        <div className="workbench-pages-drawer__sheet-handle" aria-hidden="true" />
        <header className="workbench-pages-drawer__header">
          <div
            className="workbench-pages-drawer__tabs"
            role="tablist"
            aria-label="Sidebar panels"
          >
            <button
              type="button"
              role="tab"
              className={`workbench-pages-drawer__tab${tab === "format" ? " is-active" : ""}`}
              aria-selected={tab === "format"}
              onClick={() => onTabChange("format")}
            >
              Format
            </button>
            <button
              type="button"
              role="tab"
              className={`workbench-pages-drawer__tab${tab === "document" ? " is-active" : ""}`}
              aria-selected={tab === "document"}
              onClick={() => onTabChange("document")}
            >
              Document
            </button>
          </div>
          <div className="workbench-pages-drawer__actions">
            <button
              type="button"
              className={`workbench-pages-drawer__icon-btn workbench-pages-drawer__lock-btn${pinned ? " is-active" : ""}`}
              onClick={onTogglePin}
              aria-pressed={pinned}
              aria-label={
                pinned
                  ? "Unlock panel — tap the document to dismiss"
                  : "Lock panel — keep open while editing"
              }
              title={pinned ? "Unlock" : "Lock open"}
            >
              <span className="workbench-pages-drawer__icon" aria-hidden>
                {pinned ? "▣" : "▢"}
              </span>
              <span className="workbench-pages-drawer__lock-label">
                {pinned ? "Locked" : "Lock"}
              </span>
            </button>
            <button
              type="button"
              className="workbench-pages-drawer__icon-btn"
              onClick={onClose}
              aria-label="Close panel"
              title="Close"
            >
              ×
            </button>
          </div>
        </header>
        <div className="workbench-pages-drawer__body">
          <div
            className={`workbench-pages-drawer__pane${tab === "format" ? " is-active" : ""}`}
          >
            {formatPanel}
          </div>
          <div
            className={`workbench-pages-drawer__pane${tab === "document" ? " is-active" : ""}`}
          >
            {documentPanel}
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
}
