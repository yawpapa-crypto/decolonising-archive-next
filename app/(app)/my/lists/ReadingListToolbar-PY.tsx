"use client";

import { useEffect, useState } from "react";

type SortMode = "newest" | "oldest" | "az" | "records";
type GroupMode =
  | "all"
  | "project"
  | "theme"
  | "source_type"
  | "media_type"
  | "course_research_paper";

export default function ReadingListToolbar() {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [groupMode, setGroupMode] = useState<GroupMode>("all");

  useEffect(() => {
    const grid = document.querySelector<HTMLElement>("[data-reading-lists-grid]");
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-reading-list-card]"),
    );

    const normalisedQuery = query.trim().toLowerCase();

    cards.forEach((card) => {
      const searchText = card.dataset.searchText || "";
      const groupType = card.dataset.groupType || "theme";
      const matchesGroup = groupMode === "all" || groupType === groupMode;
      const isVisible =
        matchesGroup && (!normalisedQuery || searchText.includes(normalisedQuery));
      card.hidden = !isVisible;
    });

    const visibleCards = cards.filter((card) => !card.hidden);

    visibleCards.sort((a, b) => {
      if (sortMode === "az") {
        return (a.dataset.title || "").localeCompare(b.dataset.title || "");
      }

      if (sortMode === "records") {
        return Number(b.dataset.recordCount || 0) - Number(a.dataset.recordCount || 0);
      }

      const aTime = Number(a.dataset.createdAt || 0);
      const bTime = Number(b.dataset.createdAt || 0);

      if (sortMode === "oldest") return aTime - bTime;

      return bTime - aTime;
    });

    visibleCards.forEach((card) => grid.appendChild(card));

    const emptyState = document.querySelector<HTMLElement>("[data-reading-lists-filter-empty]");
    if (emptyState) {
      emptyState.hidden = visibleCards.length > 0 || cards.length === 0;
    }
  }, [query, sortMode, groupMode]);

  return (
    <section className="reading-list-toolbar" aria-label="Reading list controls">
      <div>
        <p className="workspace-eyebrow">Find and organise</p>
        <h2>Search your reading lists</h2>
      </div>

      <div className="reading-list-toolbar-controls">
        <label>
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lists or records..."
          />
        </label>

        <label>
          <span>Sort</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A–Z</option>
            <option value="records">Most records</option>
          </select>
        </label>

        <label>
          <span>Group</span>
          <select
            value={groupMode}
            onChange={(event) => setGroupMode(event.target.value as GroupMode)}
          >
            <option value="all">All groups</option>
            <option value="project">Project</option>
            <option value="theme">Theme</option>
            <option value="source_type">Source type</option>
            <option value="media_type">Media type</option>
            <option value="course_research_paper">Course/research paper</option>
          </select>
        </label>
      </div>

      <p className="workspace-empty reading-list-filter-empty" data-reading-lists-filter-empty hidden>
        No reading lists match your search.
      </p>
    </section>
  );
}
