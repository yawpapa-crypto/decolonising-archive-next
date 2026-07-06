import PageShell from "@/src/components/layout/PageShell";
import { getMemberWorkspaceData } from "@/src/lib/member-workspace";
import SavedRecordsManager from "@/src/components/workspace/SavedRecordsManager";

const REDIRECT = "/my/bookmarks";

export default async function MyBookmarksPage() {
  const { bookmarks, recordsById, readingLists, readingListItems } =
    await getMemberWorkspaceData("/my/bookmarks");

  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--member">
        <main className="workspace-page dashboard-canvas admin-dashboard">
          <SavedRecordsManager
            bookmarks={bookmarks}
            readingLists={readingLists}
            readingListItems={readingListItems}
            recordsById={recordsById}
            redirectTo={REDIRECT}
            backHref="/workspace"
            backLabel="Back to workspace"
          />
        </main>
      </div>
    </PageShell>
  );
}
