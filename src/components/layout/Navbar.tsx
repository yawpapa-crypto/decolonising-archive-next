export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="/#/home" className="nav-logo">
          DECOLONISING ARCHIVE
        </a>

        <div className="nav-links">
          <a href="/#/home" className="nav-link">
            Home
          </a>
          <a href="/#/library" className="nav-link">
            Library
          </a>
          <a href="/#/sources" className="nav-link">
            Sources
          </a>
          <a href="/#/about" className="nav-link">
            About
          </a>
        </div>

        <a href="/#/library" className="nav-cta">
          Search archive
        </a>

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
        <a href="/#/home" className="nav-link">
          Home
        </a>
        <a href="/#/library" className="nav-link">
          Library
        </a>
        <a href="/#/sources" className="nav-link">
          Sources
        </a>
        <a href="/#/about" className="nav-link">
          About
        </a>
      </div>
    </nav>
  );
}
