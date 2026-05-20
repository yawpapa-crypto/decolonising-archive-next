import PageShell from "@/src/components/layout/PageShell";
import { getMemberWorkspaceData } from "@/src/lib/member-workspace";
import SavedRecordsManager from "@/src/components/workspace/SavedRecordsManager";

type MyBookmarksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MyBookmarksPage({ searchParams }: MyBookmarksPageProps) {
  const params = await searchParams;
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
            redirectTo="/my/bookmarks"
            backHref="/workspace"
            backLabel="Back to workspace"
            searchParams={params}
          />
        </main>
      </div>
    </PageShell>
  );
}
