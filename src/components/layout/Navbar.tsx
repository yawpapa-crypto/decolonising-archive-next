import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          DECOLONISING ARCHIVE
        </Link>

        <div className="nav-links">
          <Link href="/" className="nav-link">
            Home
          </Link>
          <Link href="/library" className="nav-link">
            Library
          </Link>
          <Link href="/sources" className="nav-link">
            Sources
          </Link>
          <Link href="/about" className="nav-link">
            About
          </Link>
        </div>

        <Link href="/library" className="nav-cta">
          Search archive
        </Link>

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
        <Link href="/" className="nav-link">
          Home
        </Link>
        <Link href="/library" className="nav-link">
          Library
        </Link>
        <Link href="/sources" className="nav-link">
          Sources
        </Link>
        <Link href="/about" className="nav-link">
          About
        </Link>
      </div>
    </nav>
  );
}
