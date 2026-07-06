"use client";

import type { WorkbenchCitationSource, WorkbenchLinkableRecord } from "@/lib/workbench-data";

export type WorkbenchCanvasArchiveMenuProps = {
  open: boolean;
  linkableRecords: WorkbenchLinkableRecord[];
  bookmarkSources: WorkbenchCitationSource[];
  readingListSources: WorkbenchCitationSource[];
  citationSources: WorkbenchCitationSource[];
  onClose: () => void;
  onAddRecord: (record: WorkbenchLinkableRecord) => void;
  onAddCitationSource: (
    source: WorkbenchCitationSource,
    origin: "archive" | "bookmark" | "reading_list",
  ) => void;
};

export function WorkbenchCanvasArchiveMenu({
  open,
  linkableRecords,
  bookmarkSources,
  readingListSources,
  citationSources,
  onClose,
  onAddRecord,
  onAddCitationSource,
}: WorkbenchCanvasArchiveMenuProps) {
  if (!open) return null;

  const hasArchive = linkableRecords.length > 0;
  const hasBookmarks = bookmarkSources.length > 0;
  const hasReading = readingListSources.length > 0;
  const hasCitations = citationSources.length > 0;

  return (
    <>
      <div
        className="workbench-research-canvas-menu-backdrop"
        role="presentation"
        onClick={onClose}
      />
      <div className="workbench-research-canvas-menu" role="dialog" aria-label="Add from archive">
        <header className="workbench-research-canvas-menu__head">
          <h2>Add from archive</h2>
          <button
            type="button"
            className="workbench-research-canvas-menu__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="workbench-research-canvas-menu__body">
          <section className="workbench-research-canvas-menu__section">
            <h3>Linked records</h3>
            {hasArchive ? (
              <ul className="workbench-research-canvas-menu__list">
                {linkableRecords.slice(0, 24).map((record) => (
                  <li key={record.record_id}>
                    <button type="button" onClick={() => onAddRecord(record)}>
                      <span className="workbench-research-canvas-menu__item-title">
                        {record.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="workbench-research-canvas-menu__empty">
                No saved records available for this note.
              </p>
            )}
          </section>

          {hasBookmarks ? (
            <section className="workbench-research-canvas-menu__section">
              <h3>Bookmarks</h3>
              <ul className="workbench-research-canvas-menu__list">
                {bookmarkSources.slice(0, 12).map((source) => (
                  <li key={source.id}>
                    <button type="button" onClick={() => onAddCitationSource(source, "bookmark")}>
                      <span className="workbench-research-canvas-menu__item-title">
                        {source.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasReading ? (
            <section className="workbench-research-canvas-menu__section">
              <h3>Reading list</h3>
              <ul className="workbench-research-canvas-menu__list">
                {readingListSources.slice(0, 12).map((source) => (
                  <li key={source.id}>
                    <button
                      type="button"
                      onClick={() => onAddCitationSource(source, "reading_list")}
                    >
                      <span className="workbench-research-canvas-menu__item-title">
                        {source.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasCitations ? (
            <section className="workbench-research-canvas-menu__section">
              <h3>Citation library</h3>
              <ul className="workbench-research-canvas-menu__list">
                {citationSources.slice(0, 12).map((source) => (
                  <li key={`cite-${source.id}`}>
                    <button type="button" onClick={() => onAddCitationSource(source, "archive")}>
                      <span className="workbench-research-canvas-menu__item-title">
                        {source.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
