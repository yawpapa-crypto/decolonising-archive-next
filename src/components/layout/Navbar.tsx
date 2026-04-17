"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setOpen(false);

    window.addEventListener("hashchange", closeMenu);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("hashchange", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  const handleNavClick = () => setOpen(false);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="/#/home" className="nav-logo" onClick={handleNavClick}>
          DECOLONISING ARCHIVE
        </a>

        <div className="nav-links">
          <a href="/#/home" className="nav-link">Home</a>
          <a href="/#/library" className="nav-link">Library</a>
          <a href="/#/sources" className="nav-link">Sources</a>
          <a href="/#/about" className="nav-link">About</a>
        </div>

        <a href="/#/library" className="nav-cta">
          Search archive
        </a>

        <button
          id="hamburger"
          className="hamburger"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      <div id="navMobile" className={`nav-mobile${open ? " open" : ""}`}>
        <a href="/#/home" className="nav-link" onClick={handleNavClick}>Home</a>
        <a href="/#/library" className="nav-link" onClick={handleNavClick}>Library</a>
        <a href="/#/sources" className="nav-link" onClick={handleNavClick}>Sources</a>
        <a href="/#/about" className="nav-link" onClick={handleNavClick}>About</a>
      </div>
    </nav>
  );
}
