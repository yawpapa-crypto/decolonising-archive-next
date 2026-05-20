"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addBookmarkToReadingList,
  deleteBookmark,
  moveBookmarkToReadingList,
  updateBookmark,
} from "@/app/(app)/workspace/actions";
import ConfirmSubmitButton from "@/app/(app)/workspace/ConfirmSubmitButton";
import PendingSubmitButton from "@/src/components/ui/PendingSubmitButton";
import type { ReadingListRow } from "@/src/lib/member-workspace";
import {
  filterSavedRecords,
  groupSavedRecords,
  GROUP_OPTIONS,
  searchSavedRecords,
  sortSavedRecords,
  SORT_OPTIONS,
  SOURCE_FILTERS,
  TYPE_FILTERS,
  type SavedRecordGroupMode,
  type SavedRecordSort,
  type SavedRecordSourceFilter,
  type SavedRecordTypeFilter,
  type SavedRecordWithLists,
} from "@/src/lib/saved-record-normalization";
import { isExternalHref } from "@/src/lib/record-links";

export type PreparedSavedRecord = SavedRecordWithLists & {
  displayTitle: string;
  openHref: string | null;
};

type ViewMode = "cards" | "list" | "compact" | "table";

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; short: string }> = [
  { value: "cards", label: "Cards", short: "Cards" },
  { value: "list", label: "List", short: "List" },
  { value: "compact", label: "Compact", short: "Compact" },
  { value: "table", label: "Table", short: "Table" },
];

const VIEW_STORAGE_KEY = "saved-records-view-mode";

type SavedRecordsClientProps = {
  records: PreparedSavedRecord[];
  totalCount: number;
  readingLists: ReadingListRow[];
  redirectTo: string;
  showProjectLink?: boolean;
};

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function validViewMode(value: string | null): ViewMode {
  return VIEW_OPTIONS.some((option) => option.value === value)
    ? (value as ViewMode)
    : "cards";
}

function SavedRecordActions({
  bookmark,
  redirectTo,
  showProjectLink,
  compact = false,
}: {
  bookmark: PreparedSavedRecord;
  redirectTo: string;
  showProjectLink?: boolean;
  compact?: boolean;
}) {
  const openHref = bookmark.openHref;

  return (
    <div className="saved-record-actions">
      {openHref ? (
        <a
          href={openHref}
          className="saved-record-action saved-record-action-primary"
          {...(isExternalHref(openHref)
            ? {
                target: "_blank",
                rel: "noopener noreferrer",
                "aria-label": "Open record in new tab",
              }
            : {})}
        >
          {compact ? "Open" : "Open record"}
        </a>
      ) : (
        <span className="saved-record-action saved-record-action-disabled" aria-disabled>
          Unavailable
        </span>
      )}

      {showProjectLink ? (
        <Link href="/my/workbench/projects" className="saved-record-action">
          {compact ? "Project" : "Add to project"}
        </Link>
      ) : null}

      <form action={deleteBookmark}>
        <input type="hidden" name="id" value={bookmark.id} />
        <input type="hidden" name="confirm" value="yes" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <ConfirmSubmitButton
          className="saved-record-action saved-record-action-danger"
          message="Remove this bookmark?"
          pendingLabel="Removing…"
        >
          {compact ? "×" : "Remove"}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function SavedRecordSecondary({
  bookmark,
  redirectTo,
  readingLists,
}: {
  bookmark: PreparedSavedRecord;
  redirectTo: string;
  readingLists: ReadingListRow[];
}) {
  const title = bookmark.displayTitle;
  const availableLists = readingLists.filter(
    (list) => !bookmark.listMemberships.some((memberList) => memberList.id === list.id),
  );
  const noteFieldId = `saved-record-note-${redirectTo.replace(/\W+/g, "-")}-${bookmark.id}`;

  return (
    <div className="saved-record-expand-body">
      {bookmark.listMemberships.length ? (
        <div className="saved-record-list-membership">
          <span>In reading lists</span>
          <div>
            {bookmark.listMemberships.map((list) => (
              <Link href={`/my/lists#list-${list.id}`} key={list.id}>
                {list.title}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="saved-record-list-membership saved-record-list-membership-empty">
          Not in a reading list yet.
        </p>
      )}

      <form action={updateBookmark} className="saved-record-note-form">
        <input type="hidden" name="id" value={bookmark.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <label className="saved-record-note-label" htmlFor={noteFieldId}>
          Private note
        </label>
        <input
          id={noteFieldId}
          type="text"
          name="note"
          placeholder="Add a short note"
          defaultValue={bookmark.note ?? ""}
          className="saved-record-note-input"
        />
        <PendingSubmitButton className="saved-record-note-save" pendingLabel="Saving…">
          Save note
        </PendingSubmitButton>
      </form>

      {readingLists.length ? (
        <div className="saved-record-reading-list-actions">
          <form action={addBookmarkToReadingList}>
            <input type="hidden" name="bookmark_id" value={bookmark.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <select name="reading_list_id" aria-label={`Add ${title} to reading list`}>
              {availableLists.length ? (
                availableLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))
              ) : (
                <option value="">Already in all lists</option>
              )}
            </select>
            <PendingSubmitButton
              className="saved-record-action saved-record-action-primary"
              pendingLabel="Adding…"
              disabled={!availableLists.length}
            >
              Add to reading list
            </PendingSubmitButton>
          </form>
          <form action={moveBookmarkToReadingList}>
            <input type="hidden" name="bookmark_id" value={bookmark.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <select name="reading_list_id" aria-label={`Move ${title} to reading list`}>
              {readingLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
            <ConfirmSubmitButton
              className="saved-record-action"
              message="Move this bookmark into the selected reading list? It will be removed from saved records."
              pendingLabel="Moving…"
            >
              Move to reading list
            </ConfirmSubmitButton>
          </form>
        </div>
      ) : (
        <Link href="/my/lists" className="saved-record-action">
          Create reading list
        </Link>
      )}
    </div>
  );
}

function SavedRecordCard({
  bookmark,
  redirectTo,
  readingLists,
  showProjectLink,
  viewMode,
}: {
  bookmark: PreparedSavedRecord;
  redirectTo: string;
  readingLists: ReadingListRow[];
  showProjectLink?: boolean;
  viewMode: ViewMode;
}) {
  const showExpand = viewMode === "list";

  return (
    <article className="saved-record-card" data-saved-record-card>
      <div className="saved-record-card-top">
        <div>
          <h2 className="saved-record-title">{bookmark.displayTitle}</h2>
          <div className="saved-record-badges" aria-label="Record metadata">
            <span>{bookmark.normalized.sourceLabel}</span>
            <span>{bookmark.normalized.typeLabel}</span>
            {bookmark.normalized.isOpenAccess ? <span>Open access</span> : null}
          </div>
        </div>
        <time className="saved-record-date" dateTime={bookmark.created_at ?? undefined}>
          {formatSavedDate(bookmark.created_at)}
        </time>
      </div>

      <dl className="saved-record-meta">
        {bookmark.normalized.authorLabel ? (
          <>
            <dt>Creator</dt>
            <dd>{bookmark.normalized.authorLabel}</dd>
          </>
        ) : null}
        {bookmark.normalized.year ? (
          <>
            <dt>Year</dt>
            <dd>{bookmark.normalized.year}</dd>
          </>
        ) : null}
        {bookmark.normalized.citedByCount !== null ? (
          <>
            <dt>Citations</dt>
            <dd>{bookmark.normalized.citedByCount}</dd>
          </>
        ) : null}
      </dl>

      {viewMode === "cards" ? (
        <SavedRecordSecondary
          bookmark={bookmark}
          redirectTo={redirectTo}
          readingLists={readingLists}
        />
      ) : (
        <details className="saved-record-expand">
          {showExpand ? <summary>Notes &amp; lists</summary> : null}
          <SavedRecordSecondary
            bookmark={bookmark}
            redirectTo={redirectTo}
            readingLists={readingLists}
          />
        </details>
      )}

      <SavedRecordActions
        bookmark={bookmark}
        redirectTo={redirectTo}
        showProjectLink={showProjectLink}
        compact={viewMode === "compact"}
      />
    </article>
  );
}

function SavedRecordsTable({
  records,
  redirectTo,
  showProjectLink,
}: {
  records: PreparedSavedRecord[];
  redirectTo: string;
  showProjectLink?: boolean;
}) {
  return (
    <div className="saved-records-table-wrap">
      <table className="saved-records-table">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Type</th>
            <th scope="col">Source</th>
            <th scope="col">Year</th>
            <th scope="col">Saved</th>
            <th scope="col">Lists</th>
            <th scope="col" className="saved-records-table-actions-col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((bookmark) => (
            <tr key={bookmark.id}>
              <td>
                <div className="saved-records-table-title">{bookmark.displayTitle}</div>
                {bookmark.note ? (
                  <p className="saved-records-table-note">{bookmark.note}</p>
                ) : null}
              </td>
              <td>{bookmark.normalized.typeLabel}</td>
              <td>{bookmark.normalized.sourceLabel}</td>
              <td>{bookmark.normalized.year ?? "—"}</td>
              <td>{formatSavedDate(bookmark.created_at)}</td>
              <td>
                {bookmark.listMemberships.length
                  ? bookmark.listMemberships.map((list) => list.title).join(", ")
                  : "—"}
              </td>
              <td>
                <div className="saved-records-table-actions">
                  <SavedRecordActions
                    bookmark={bookmark}
                    redirectTo={redirectTo}
                    showProjectLink={showProjectLink}
                    compact
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SavedRecordsResults({
  records,
  viewMode,
  redirectTo,
  readingLists,
  showProjectLink,
}: {
  records: PreparedSavedRecord[];
  viewMode: ViewMode;
  redirectTo: string;
  readingLists: ReadingListRow[];
  showProjectLink?: boolean;
}) {
  if (viewMode === "table") {
    return (
      <SavedRecordsTable
        records={records}
        redirectTo={redirectTo}
        showProjectLink={showProjectLink}
      />
    );
  }

  return (
    <div className={`saved-records-results saved-records-results--${viewMode}`}>
      {records.map((bookmark) => (
        <SavedRecordCard
          key={bookmark.id}
          bookmark={bookmark}
          redirectTo={redirectTo}
          readingLists={readingLists}
          showProjectLink={showProjectLink}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}

export default function SavedRecordsClient({
  records,
  totalCount,
  readingLists,
  redirectTo,
  showProjectLink = false,
}: SavedRecordsClientProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SavedRecordTypeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SavedRecordSourceFilter>("all");
  const [sortMode, setSortMode] = useState<SavedRecordSort>("recent");
  const [groupMode, setGroupMode] = useState<SavedRecordGroupMode>("none");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  useEffect(() => {
    setViewMode(validViewMode(window.localStorage.getItem(VIEW_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const visibleRecords = useMemo((): PreparedSavedRecord[] => {
    const filtered = filterSavedRecords(records, typeFilter, sourceFilter);
    const searched = searchSavedRecords(filtered, query);
    return sortSavedRecords(searched, sortMode) as PreparedSavedRecord[];
  }, [records, typeFilter, sourceFilter, query, sortMode]);

  const groups = useMemo(
    () =>
      groupSavedRecords(visibleRecords, groupMode, readingLists).map((group) => ({
        ...group,
        records: group.records as PreparedSavedRecord[],
      })),
    [visibleRecords, groupMode, readingLists],
  );

  const hasActiveFilters =
    query.trim().length > 0 ||
    typeFilter !== "all" ||
    sourceFilter !== "all" ||
    sortMode !== "recent" ||
    groupMode !== "none";

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setSourceFilter("all");
    setSortMode("recent");
    setGroupMode("none");
  }

  return (
    <>
      <section className="saved-records-controls" aria-label="Organise saved records">
        <div className="saved-records-controls-top">
          <div>
            <p className="saved-records-controls-eyebrow">Find and organise</p>
            <h2 className="saved-records-controls-title">Search, filter, and view</h2>
          </div>
          {hasActiveFilters ? (
            <button type="button" className="saved-records-reset" onClick={resetFilters}>
              Reset filters
            </button>
          ) : null}
        </div>

        <div className="saved-records-toolbar-row">
          <label className="saved-records-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, creator, source, type, or note…"
              aria-label="Search saved records"
            />
          </label>

          <div className="saved-records-view-toggle">
            <span className="saved-records-view-toggle-label">View as</span>
            <div
              className="saved-records-view-toggle-group"
              role="group"
              aria-label="Choose layout"
            >
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={option.value === viewMode ? "is-active" : undefined}
                  aria-pressed={option.value === viewMode}
                  onClick={() => setViewMode(option.value)}
                  title={`${option.label} view`}
                >
                  {option.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="saved-records-filter-tabs" role="tablist" aria-label="Record type filters">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={filter.value === typeFilter}
              className={filter.value === typeFilter ? "is-active" : undefined}
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="saved-records-select-row">
          <label>
            <span>Source</span>
            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value as SavedRecordSourceFilter)
              }
            >
              {SOURCE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SavedRecordSort)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Group by</span>
            <select
              value={groupMode}
              onChange={(event) => setGroupMode(event.target.value as SavedRecordGroupMode)}
            >
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="saved-records-count" aria-live="polite">
          Showing {visibleRecords.length} of {totalCount} saved{" "}
          {totalCount === 1 ? "record" : "records"}
          {groupMode !== "none" && visibleRecords.length
            ? ` · ${groups.length} ${groups.length === 1 ? "group" : "groups"}`
            : ""}
          {" · "}
          {VIEW_OPTIONS.find((option) => option.value === viewMode)?.label} view.
        </p>
      </section>

      {visibleRecords.length ? (
        groupMode === "none" ? (
          <SavedRecordsResults
            records={visibleRecords}
            viewMode={viewMode}
            redirectTo={redirectTo}
            readingLists={readingLists}
            showProjectLink={showProjectLink}
          />
        ) : (
          <div className="saved-records-groups">
            {groups.map((group) => (
              <section className="saved-records-group" key={group.key}>
                <header className="saved-records-group-header">
                  <h2>{group.label}</h2>
                  <span className="saved-records-group-count">
                    {group.records.length}{" "}
                    {group.records.length === 1 ? "record" : "records"}
                  </span>
                </header>
                <SavedRecordsResults
                  records={group.records}
                  viewMode={viewMode}
                  redirectTo={redirectTo}
                  readingLists={readingLists}
                  showProjectLink={showProjectLink}
                />
              </section>
            ))}
          </div>
        )
      ) : totalCount ? (
        <article className="saved-records-empty empty-state" role="status">
          <h2 className="saved-records-empty-title">No saved records match</h2>
          <p className="saved-records-empty-copy">
            Try a different search term, type filter, or source.
          </p>
          <button type="button" className="saved-records-empty-cta" onClick={resetFilters}>
            Clear filters
          </button>
        </article>
      ) : (
        <article className="saved-records-empty empty-state" role="status">
          <h2 className="saved-records-empty-title">No bookmarks yet</h2>
          <p className="saved-records-empty-copy">
            Save records from the library to keep them here for quick return and note-taking.
          </p>
          <a href="/library" className="saved-records-empty-cta">
            Browse library
          </a>
        </article>
      )}
    </>
  );
}
