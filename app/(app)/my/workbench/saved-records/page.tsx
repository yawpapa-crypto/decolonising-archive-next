import { getMemberWorkspaceData } from "@/src/lib/member-workspace";
import SavedRecordsManager from "@/src/components/workspace/SavedRecordsManager";

const REDIRECT = "/my/workbench/saved-records";

export default async function WorkbenchSavedRecordsPage() {
  const { bookmarks, recordsById, readingLists, readingListItems } =
    await getMemberWorkspaceData("/my/workbench/saved-records");

  return (
    <SavedRecordsManager
      bookmarks={bookmarks}
      readingLists={readingLists}
      readingListItems={readingListItems}
      recordsById={recordsById}
      redirectTo={REDIRECT}
      backHref="/my/workbench"
      backLabel="Back to overview"
      showProjectLink
    />
  );
}
