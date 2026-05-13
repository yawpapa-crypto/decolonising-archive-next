import Link from "next/link";

export default async function WorkbenchReadingListsHubPage() {
  return (
    <>
      <p className="workbench-kicker">Reading lists</p>
      <h1 className="workbench-page-title">Reading lists</h1>
      <p className="workbench-lede">
        Lists are managed in the member workspace. Import an entire list into a Workbench
        project from any project’s “Import reading list” panel.
      </p>
      <section className="workbench-panel">
        <Link className="workbench-btn" href="/my/lists">
          Open reading lists
        </Link>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          <Link className="workbench-link" href="/workspace?section=reading-lists">
            Workspace reading lists section
          </Link>
        </p>
      </section>
    </>
  );
}
