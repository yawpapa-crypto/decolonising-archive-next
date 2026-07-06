export default function WorkbenchNotesLoading() {
  return (
    <section className="workbench-notes-loading" aria-busy="true" aria-label="Loading notes">
      <div className="workbench-notes-loading__header">
        <span className="workbench-notes-loading__eyebrow" />
        <span className="workbench-notes-loading__title" />
      </div>
      <div className="workbench-notes-loading__toolbar">
        <span />
        <span />
        <span />
      </div>
      <div className="workbench-notes-loading__editor">
        <span />
        <span />
        <span />
        <span className="workbench-notes-loading__editor-line is-short" />
      </div>
    </section>
  );
}
