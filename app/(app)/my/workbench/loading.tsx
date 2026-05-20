export default function WorkbenchLoading() {
  return (
    <section className="workbench-route-loading" aria-busy="true" aria-label="Loading workbench">
      <div className="workbench-route-loading__grid">
        <span className="workbench-route-loading__sidebar" />
        <div className="workbench-route-loading__main">
          <span className="workbench-route-loading__line is-wide" />
          <span className="workbench-route-loading__line" />
          <span className="workbench-route-loading__line" />
          <span className="workbench-route-loading__line is-short" />
        </div>
      </div>
    </section>
  );
}
