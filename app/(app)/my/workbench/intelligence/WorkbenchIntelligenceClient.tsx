"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { dismissIntelligenceSuggestion } from "@/lib/workbench-activity-actions";
import {
  filterIntelligenceItems,
  intelligenceItemsToCsv,
  intelligenceItemsToMarkdown,
} from "@/lib/workbench-intelligence-client";
import type {
  IntelligenceCollection,
  IntelligenceFilter,
  IntelligenceItem,
  IntelligenceSnapshot,
  IntelligenceSuggestion,
  IntelligenceSummaryKey,
} from "@/lib/workbench-intelligence-types";

const FILTER_OPTIONS: { value: IntelligenceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unsorted", label: "Unsorted" },
  { value: "bookmarks", label: "Bookmarks" },
  { value: "reading_lists", label: "Reading lists" },
  { value: "projects", label: "Projects" },
  { value: "cited", label: "Cited" },
  { value: "uncited", label: "Uncited" },
  { value: "needs_action", label: "Needs action" },
  { value: "needs_metadata", label: "Needs metadata" },
  { value: "questions", label: "Questions" },
  { value: "images", label: "Images" },
  { value: "tasks", label: "Tasks" },
];

const SUMMARY_CARDS: Array<{
  key: IntelligenceSummaryKey;
  label: string;
  filter?: IntelligenceFilter;
  collectionId?: string;
}> = [
  { key: "saved_records", label: "Saved records", filter: "bookmarks" },
  { key: "reading_lists", label: "Reading lists", filter: "reading_lists" },
  { key: "cited_records", label: "Cited records", filter: "cited" },
  { key: "uncited_records", label: "Uncited records", filter: "uncited", collectionId: "needs_citation" },
  { key: "unsorted_records", label: "Unsorted records", filter: "unsorted", collectionId: "unsorted_records" },
  { key: "open_questions", label: "Open questions", filter: "questions", collectionId: "open_questions" },
  {
    key: "images_needing_alt",
    label: "Images needing alt text",
    filter: "images",
    collectionId: "images_missing_alt",
  },
  { key: "needs_metadata", label: "Needs metadata", filter: "needs_metadata", collectionId: "missing_metadata" },
  { key: "ready_to_export", label: "Ready to export", filter: "cited", collectionId: "ready_to_export" },
];

function downloadTextFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function applySuggestionFilter(
  suggestion: IntelligenceSuggestion,
  setFilter: (value: IntelligenceFilter) => void,
  setCollectionId: (value: string | null) => void,
) {
  if (suggestion.filter) setFilter(suggestion.filter);
  if (suggestion.collectionId) setCollectionId(suggestion.collectionId);
  else if (suggestion.summaryKey === "needs_metadata") setCollectionId("missing_metadata");
}

export default function WorkbenchIntelligenceClient({
  snapshot: initialSnapshot,
}: {
  snapshot: IntelligenceSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [filter, setFilter] = useState<IntelligenceFilter>("all");
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(
    () =>
      filterIntelligenceItems(snapshot.items, {
        filter,
        search,
        collectionId,
      }),
    [snapshot.items, filter, search, collectionId],
  );

  function applySummaryCard(card: (typeof SUMMARY_CARDS)[number]) {
    if (card.filter) setFilter(card.filter);
    setCollectionId(card.collectionId ?? null);
  }

  function handleDismiss(suggestionId: string) {
    startTransition(async () => {
      const result = await dismissIntelligenceSuggestion(suggestionId);
      if (!result.ok) return;
      setSnapshot((current) => ({
        ...current,
        suggestions: current.suggestions.filter((item) => item.id !== suggestionId),
        preferences: current.preferences
          ? {
              ...current.preferences,
              dismissed_suggestions: [...current.preferences.dismissed_suggestions, suggestionId],
            }
          : current.preferences,
      }));
    });
  }

  function exportJson() {
    downloadTextFile(
      "research-intelligence.json",
      "application/json",
      JSON.stringify(
        {
          summary: snapshot.summary,
          profile: snapshot.profile,
          collections: snapshot.collections,
          items: filteredItems,
        },
        null,
        2,
      ),
    );
  }

  return (
    <section className="workbench-intelligence-page">
      <header className="workbench-intelligence-header">
        <div className="workbench-intelligence-header-text">
          <p className="workbench-intelligence-eyebrow">Research Intelligence</p>
          <h1>Research Intelligence</h1>
          <p className="workbench-intelligence-intro">
            Generated from your own saved records, reading lists, notes, citations, board cards,
            canvas blocks, tasks, and exports.
          </p>
        </div>
        <div className="workbench-intelligence-action-row">
          <Link href="/my/workbench/notes" className="workbench-button workbench-button-primary">
            Open Notes
          </Link>
          <Link href="/my/workbench/exports" className="workbench-button workbench-button-secondary">
            Exports
          </Link>
          <button type="button" className="workbench-button workbench-button-secondary" onClick={exportJson}>
            Export JSON
          </button>
          <button
            type="button"
            className="workbench-button workbench-button-secondary"
            onClick={() =>
              downloadTextFile(
                "research-intelligence.csv",
                "text/csv",
                intelligenceItemsToCsv(filteredItems),
              )
            }
          >
            Export CSV
          </button>
          <button
            type="button"
            className="workbench-button workbench-button-secondary"
            onClick={() =>
              downloadTextFile(
                "research-intelligence.md",
                "text/markdown",
                intelligenceItemsToMarkdown(filteredItems, snapshot.collections),
              )
            }
          >
            Export Markdown
          </button>
        </div>
      </header>

      {snapshot.errors.length ? (
        <p className="workbench-flag" role="alert">
          {snapshot.errors.join(" ")}
        </p>
      ) : null}

      {snapshot.preferences?.preferred_citation_style ? (
        <p className="workbench-intelligence-preferences-note">
          Preferred citation style: {snapshot.preferences.preferred_citation_style}
          {snapshot.profile.frequentCitationStyle &&
          snapshot.profile.frequentCitationStyle !== snapshot.preferences.preferred_citation_style
            ? ` · Most used in notes: ${snapshot.profile.frequentCitationStyle}`
            : null}
        </p>
      ) : null}

      <div className="workbench-intelligence-summary-grid">
        {SUMMARY_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`workbench-intelligence-summary-card${
              collectionId === card.collectionId && filter === (card.filter ?? filter)
                ? " is-active"
                : ""
            }`}
            onClick={() => applySummaryCard(card)}
          >
            <strong>{snapshot.summary[card.key]}</strong>
            <span>{card.label}</span>
          </button>
        ))}
      </div>

      <section className="workbench-intelligence-suggestions" aria-label="Suggested actions">
        <h2>Suggested actions</h2>
        {snapshot.suggestions.length ? (
          <ul className="workbench-intelligence-suggestion-list">
            {snapshot.suggestions.map((suggestion) => (
              <li key={suggestion.id} className="workbench-intelligence-suggestion-card">
                <div className="workbench-intelligence-suggestion-main">
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.body}</p>
                  <p className="workbench-intelligence-suggestion-reason">
                    <strong>Why:</strong> {suggestion.reason}
                  </p>
                  <span className={`workbench-intelligence-chip is-confidence-${suggestion.confidence}`}>
                    {suggestion.confidence} confidence
                  </span>
                </div>
                <div className="workbench-intelligence-suggestion-actions">
                  {suggestion.actionHref ? (
                    <Link href={suggestion.actionHref} className="workbench-button workbench-button-primary">
                      {suggestion.actionLabel}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="workbench-button workbench-button-primary"
                      onClick={() => applySuggestionFilter(suggestion, setFilter, setCollectionId)}
                    >
                      {suggestion.actionLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    className="workbench-button workbench-button-secondary"
                    onClick={() => applySuggestionFilter(suggestion, setFilter, setCollectionId)}
                  >
                    Review
                  </button>
                  {suggestion.dismissible ? (
                    <button
                      type="button"
                      className="workbench-button workbench-button-secondary"
                      disabled={isPending}
                      onClick={() => handleDismiss(suggestion.id)}
                    >
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Your workbench looks well organised. Keep reviewing sources as you write.</p>
        )}
      </section>

      <section className="workbench-intelligence-collections" aria-label="Smart collections">
        <h2>Smart collections</h2>
        <div className="workbench-intelligence-collection-grid">
          {snapshot.collections.map((collection: IntelligenceCollection) => (
            <button
              key={collection.id}
              type="button"
              className={`workbench-intelligence-collection-card${
                collectionId === collection.id ? " is-active" : ""
              }`}
              onClick={() => {
                setCollectionId(collection.id);
                setFilter("all");
              }}
            >
              <strong>{collection.title}</strong>
              <span>{collection.itemIds.length} items</span>
              <p>{collection.description}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="workbench-intelligence-filter-row">
        <label className="workbench-intelligence-search">
          <span className="sr-only">Search intelligence</span>
          <input
            type="search"
            value={search}
            placeholder="Search title, creator, project, reading list, note…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="workbench-intelligence-filter-chips" role="group" aria-label="Filters">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`workbench-intelligence-chip${filter === option.value ? " is-active" : ""}`}
              onClick={() => {
                setFilter(option.value);
                setCollectionId(null);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="workbench-intelligence-table-wrap" aria-label="Intelligence items">
        <div className="workbench-intelligence-table-header">
          <h2>Research items</h2>
          <p>{filteredItems.length} shown</p>
        </div>
        <table className="workbench-intelligence-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Source</th>
              <th scope="col">Project / list</th>
              <th scope="col">Status</th>
              <th scope="col">Used / cited</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length ? (
              filteredItems.map((item: IntelligenceItem) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.subtitle ? (
                      <span className="workbench-intelligence-subtitle">{item.subtitle}</span>
                    ) : null}
                  </td>
                  <td>{item.type.replace(/_/g, " ")}</td>
                  <td>{item.source.replace(/_/g, " ")}</td>
                  <td>
                    {item.projectTitle ? <span>{item.projectTitle}</span> : null}
                    {item.readingListTitle ? <span>{item.readingListTitle}</span> : null}
                    {!item.projectTitle && !item.readingListTitle ? "—" : null}
                  </td>
                  <td>
                    <span className="workbench-intelligence-chip is-status">{statusLabel(item.status)}</span>
                  </td>
                  <td>
                    {item.cited ? "Cited" : "—"}
                    {item.usedInWriting ? " · Used" : ""}
                  </td>
                  <td>
                    <div className="workbench-intelligence-row-actions">
                      {item.openHref ? <Link href={item.openHref}>Open</Link> : null}
                      {item.recordId ? <Link href="/my/workbench/notes">Notes</Link> : null}
                      {item.readingListId ? (
                        <Link href="/my/workbench/reading-lists">Reading list</Link>
                      ) : null}
                      {item.projectId ? (
                        <Link href={`/my/workbench/projects/${item.projectId}`}>Project</Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No items match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="workbench-intelligence-relation-list" aria-label="Record relationships">
        <h2>Record relationships</h2>
        <p className="workbench-intelligence-relation-intro">
          See where saved records connect across bookmarks, reading lists, notes, board, canvas, and
          projects.
        </p>
        <ul>
          {snapshot.recordRelations.map((entry) => (
            <li key={entry.recordId}>
              <button
                type="button"
                className="workbench-intelligence-relation-toggle"
                onClick={() =>
                  setExpandedRecord((current) =>
                    current === entry.recordId ? null : entry.recordId,
                  )
                }
              >
                <strong>{entry.title}</strong>
                <span>{entry.relations.length} links</span>
              </button>
              {expandedRecord === entry.recordId ? (
                <ul className="workbench-intelligence-relation-children">
                  {entry.relations.length ? (
                    entry.relations.map((relation, index) => (
                      <li key={`${entry.recordId}-${relation.kind}-${index}`}>
                        {relation.href ? (
                          <Link href={relation.href}>{relation.label}</Link>
                        ) : (
                          relation.label
                        )}
                      </li>
                    ))
                  ) : (
                    <li>No linked activity yet.</li>
                  )}
                  <li>
                    <Link href={`/records/${encodeURIComponent(entry.recordId.replace(/-\d+$/, ""))}`}>
                      Open archive record
                    </Link>
                  </li>
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <p className="workbench-intelligence-ethics-note">
        Research Intelligence is generated from your own workbench activity. It is designed to
        support organisation, review, citation, and cultural care. You remain in control of how
        records are grouped, interpreted, and used.
      </p>
    </section>
  );
}
