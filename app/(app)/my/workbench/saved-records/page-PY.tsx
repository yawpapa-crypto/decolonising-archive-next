import { getMemberWorkspaceData } from "@/src/lib/member-workspace";
import SavedRecordsManager from "@/src/components/workspace/SavedRecordsManager";

const REDIRECT = "/my/workbench/saved-records";

type WorkbenchSavedRecordsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkbenchSavedRecordsPage({
  searchParams,
}: WorkbenchSavedRecordsPageProps) {
  const params = await searchParams;
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
      searchParams={params}
    />
  );
}
