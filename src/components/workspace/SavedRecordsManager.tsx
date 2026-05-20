import Link from "next/link";
import "@/app/styles/saved-records.css";
import {
  type BookmarkRow,
  type ReadingListItemRow,
  type ReadingListRow,
  workspaceRecordTitle,
} from "@/src/lib/member-workspace";
import { withSavedRecordMemberships } from "@/src/lib/saved-record-normalization";
import { getRecordHref } from "@/src/lib/record-links";
import type { ArchiveRecord } from "@/lib/records";
import SavedRecordsClient, {
  type PreparedSavedRecord,
} from "@/src/components/workspace/SavedRecordsClient";

type SavedRecordsManagerProps = {
  bookmarks: BookmarkRow[];
  readingLists: ReadingListRow[];
  readingListItems: ReadingListItemRow[];
  recordsById: Map<string, ArchiveRecord>;
  redirectTo: string;
  backHref: string;
  backLabel: string;
  showProjectLink?: boolean;
};

export default function SavedRecordsManager({
  bookmarks,
  readingLists,
  readingListItems,
  recordsById,
  redirectTo,
  backHref,
  backLabel,
  showProjectLink = false,
}: SavedRecordsManagerProps) {
  const records: PreparedSavedRecord[] = withSavedRecordMemberships(
    bookmarks,
    readingLists,
    readingListItems,
  ).map((bookmark) => ({
    ...bookmark,
    displayTitle:
      bookmark.record_title || workspaceRecordTitle(recordsById, bookmark.record_id),
    openHref: getRecordHref(bookmark),
  }));

  return (
    <section className="saved-records-page">
      <header className="saved-records-header">
        <div className="saved-records-header-text">
          <p className="saved-records-eyebrow">Saved records</p>
          <h1>Bookmarks</h1>
          <p className="saved-records-intro">
            Search, filter, and group saved books, articles, archive records, media, and
            external sources. Add records to reading lists or workbench projects without
            changing the original source metadata.
          </p>
        </div>
        <div className="saved-records-header-aside">
          <Link href={backHref} className="saved-records-back">
            {backLabel}
          </Link>
        </div>
      </header>

      <SavedRecordsClient
        records={records}
        totalCount={bookmarks.length}
        readingLists={readingLists}
        redirectTo={redirectTo}
        showProjectLink={showProjectLink}
      />
    </section>
  );
}
