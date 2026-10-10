"use client";
import { useEffect, useState } from "react";
import SearchBox from "./SearchBox";

/** Full search on desktop; an explicit expandable search row on a phone. */
export default function NavSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) document.querySelector<HTMLInputElement>("#ared-nav-search input")?.focus(); }, [open]);
  return <>
    <button className="ared-nav__mobile-search" type="button" aria-label={open ? "Close search" : "Search the archive"} aria-expanded={open} aria-controls="ared-nav-search" onClick={() => setOpen(v => !v)}>
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
    </button>
    <div id="ared-nav-search" className="ared-nav__search-wrap" data-open={open}><SearchBox variant="nav" /></div>
  </>;
}
