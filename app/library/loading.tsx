export default function LibraryLoading() {
  return (
    <div className="library-route-loading" aria-busy="true" aria-label="Loading library">
      <div className="library-route-loading__bar" />
      <div className="library-route-loading__grid">
        <div className="library-route-loading__row" />
        <div className="library-route-loading__row" />
        <div className="library-route-loading__row" />
      </div>
    </div>
  );
}
