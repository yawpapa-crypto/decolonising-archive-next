"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  onExport: () => void;
  onExportSlr?: () => void;
  onSync?: () => void;
  syncing?: boolean;
};

export default function IntelligenceHeader({ onExport, onExportSlr, onSync, syncing }: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <header className="ri-dash-header workbench-intelligence-hero">
      <div className="ri-dash-header__copy">
        <p className="ri-eyebrow">Research Intelligence</p>
        <h1>Your research command centre</h1>
        <p className="ri-intro">Personalised insights from your saved sources, citations, and review workflow.</p>
      </div>
      <div className="ri-dash-header__actions">
        <Link href="/library" className={cn("ri-btn", "ri-btn--primary")}>
          <Search size={16} aria-hidden />
          New search
        </Link>

        <div className="ri-export-menu" ref={menuRef}>
          <button
            type="button"
            className={cn("ri-btn", "ri-btn--secondary", exportOpen && "is-open")}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            onClick={() => setExportOpen((open) => !open)}
          >
            <Download size={16} aria-hidden />
            Export
            <ChevronDown size={14} aria-hidden />
          </button>
          {exportOpen ? (
            <div className="ri-export-menu__panel" role="menu">
              <button type="button" role="menuitem" className="ri-export-menu__item" onClick={() => { onExport(); setExportOpen(false); }}>
                Export filtered records (CSV)
              </button>
              {onExportSlr ? (
                <button type="button" role="menuitem" className="ri-export-menu__item" onClick={() => { onExportSlr(); setExportOpen(false); }}>
                  Export review / SLR dataset (CSV)
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={cn("ri-btn", "ri-btn--secondary")}
          onClick={onSync}
          disabled={syncing}
        >
          <RefreshCw size={16} className={syncing ? "ri-spin" : undefined} aria-hidden />
          Sync
        </button>
      </div>
    </header>
  );
}
