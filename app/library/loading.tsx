export default function LibraryLoading() {
  return (
    <main id="app" className="library-route-loading" aria-busy="true" aria-label="Loading library">
      <div className="library-route-loading__hero">
        <span className="library-route-loading__line is-wide" />
        <span className="library-route-loading__line" />
      </div>
      <div className="library-route-loading__grid">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="library-route-loading__card" />
        ))}
      </div>
    </main>
  );
}
