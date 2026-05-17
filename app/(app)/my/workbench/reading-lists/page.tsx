import Link from "next/link";

export default async function WorkbenchReadingListsHubPage() {
  return (
    <section className="workbench-projects-page">
      <header className="workbench-reading-header workbench-reading-header--fixed">
        <div className="workbench-reading-heading-block">
          <p className="workbench-reading-eyebrow">Reading lists</p>
          <h1>Reading lists</h1>
          <p>
            Organise saved records into focused research lists for review,
            citation, teaching, and project development.
          </p>
        </div>

        <a
          href="/my/lists"
          className="workbench-button workbench-button-primary workbench-reading-new-button"
        >
          Open reading lists
        </a>
      </header>

      <section className="workbench-project-list-card">
        <div className="workbench-project-list-header">
          <h2>Manage your lists</h2>
          <p>Open the workspace to add, rename or remove reading lists.</p>
        </div>
        <div className="workbench-export-actions" style={{ marginTop: 0 }}>
          <Link className="workbench-action-btn workbench-action-btn--primary" href="/my/lists">
            Open reading lists
          </Link>
          <Link className="workbench-action-btn" href="/workspace?section=reading-lists">
            Workspace reading lists section
          </Link>
        </div>
      </section>
    </section>
  );
}
