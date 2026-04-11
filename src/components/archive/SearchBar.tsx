export default function SearchBar() {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Archive Search</h2>
      </div>

      <div className="hero-search">
        <input
          type="text"
          placeholder="Search books, artefacts, images, oral histories..."
          aria-label="Search archive"
        />
        <button type="button">Search</button>
      </div>

      <div className="hero-suggestions">
        <span className="suggestion">Ghana design archives</span>
        <span className="suggestion">African philosophy</span>
        <span className="suggestion">oral histories</span>
        <span className="suggestion">liberation posters</span>
      </div>
    </section>
  );
}
