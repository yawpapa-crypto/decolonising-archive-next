"use client";

import type { ReactNode } from "react";
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
  if (!open) return null;

  return (
    <>
      {!pinned ? (
        <button
          type="button"
          className="workbench-pages-drawer-backdrop"
          aria-label="Close format panel"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`workbench-pages-drawer${pinned ? " is-pinned" : " is-overlay"}`}
        aria-label="Format and document settings"
      >
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
              className={`workbench-pages-drawer__icon-btn${pinned ? " is-active" : ""}`}
              onClick={onTogglePin}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin panel" : "Pin panel to side"}
              title={pinned ? "Unpin panel" : "Pin panel to side"}
            >
              <span className="workbench-pages-drawer__icon" aria-hidden>
                {pinned ? "▣" : "▢"}
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
    </>
  );
}
