import Script from "next/script";

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a href="#/home" className="nav-logo" data-page="home">
            DECOLONISING ARCHIVE
          </a>
          <div className="nav-links">
            <a href="#/home" className="nav-link" data-page="home">
              Home
            </a>
            <a href="#/library" className="nav-link" data-page="library">
              Library
            </a>
            <a href="#/sources" className="nav-link" data-page="sources">
              Sources
            </a>
            <a href="#/about" className="nav-link" data-page="about">
              About
            </a>
          </div>
          <button className="nav-cta" data-page="library">
            Search archive
          </button>
          <button
            className="hamburger"
            id="hamburger"
            type="button"
            aria-label="Open navigation"
          >
            ☰
          </button>
        </div>

        <div className="nav-mobile" id="navMobile">
          <a href="#/home" className="nav-link" data-page="home">
            Home
          </a>
          <a href="#/library" className="nav-link" data-page="library">
            Library
          </a>
          <a href="#/sources" className="nav-link" data-page="sources">
            Sources
          </a>
          <a href="#/about" className="nav-link" data-page="about">
            About
          </a>
        </div>
      </nav>

      <main id="app"></main>

      <noscript>
        <div className="empty noscript-note">
          This archive needs JavaScript enabled to render the local index and
          record pages.
        </div>
      </noscript>

      <Script
        src="/assets/js/app.js"
        strategy="afterInteractive"
        type="module"
      />
    </>
  );
}