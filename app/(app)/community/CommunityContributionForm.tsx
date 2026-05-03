"use client";

import { useMemo, useState } from "react";
import type { createCommunityContribution } from "./actions";

type ReadingListOption = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
};

type CommunityContributionFormProps = {
  action: typeof createCommunityContribution;
  readingLists: ReadingListOption[];
};

const CONTRIBUTION_TYPES = [
  ["source_suggestion", "Source suggestion"],
  ["record_correction", "Record correction"],
  ["community_note", "Community note"],
  ["contextual_reflection", "Contextual reflection"],
  ["rights_concern", "Rights / takedown concern"],
  ["broken_link", "Broken link report"],
  ["event_resource", "Event / resource suggestion"],
  ["shared_reading_list", "Share a reading list"],
  ["other", "Other"],
] as const;

export default function CommunityContributionForm({
  action,
  readingLists,
}: CommunityContributionFormProps) {
  const [type, setType] = useState("source_suggestion");
  const [selectedListId, setSelectedListId] = useState("");
  const selectedList = useMemo(
    () => readingLists.find((list) => list.id === selectedListId),
    [readingLists, selectedListId],
  );
  const isSharedList = type === "shared_reading_list";
  const selectedListIsPrivate = Boolean(selectedList && !selectedList.is_public);

  return (
    <form action={action} className="community-form">
      <div className="community-field">
        <label htmlFor="community-content-type">Contribution type</label>
        <select
          id="community-content-type"
          name="content_type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setSelectedListId("");
          }}
        >
          {CONTRIBUTION_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isSharedList ? (
        <>
          <div className="community-field">
            <label htmlFor="community-reading-list">Reading list</label>
            <select
              id="community-reading-list"
              name="related_reading_list_id"
              value={selectedListId}
              onChange={(event) => setSelectedListId(event.target.value)}
              required
            >
              <option value="">Choose a reading list</option>
              {readingLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title} ({list.is_public ? "Public" : "Private"})
                </option>
              ))}
            </select>
            {selectedListIsPrivate ? (
              <p className="community-error">
                This list is currently private. Change it to members-only or public before sharing.
              </p>
            ) : (
              <p className="community-help">
                Only public reading lists can be submitted for community sharing for now.
              </p>
            )}
          </div>
          <div className="community-field">
            <label htmlFor="community-title">Display title</label>
            <input
              id="community-title"
              name="title"
              placeholder={selectedList ? selectedList.title : "Shared reading list title"}
            />
          </div>
          <div className="community-field">
            <label htmlFor="community-description">Why are you sharing this list?</label>
            <textarea
              id="community-description"
              name="description"
              rows={5}
              placeholder="Add a short note for the curator review queue."
            />
          </div>
        </>
      ) : (
        <>
          <div className="community-field">
            <label htmlFor="community-title">Title</label>
            <input
              id="community-title"
              name="title"
              placeholder="Short title for this contribution"
              required
            />
          </div>
          <div className="community-field">
            <label htmlFor="community-description">Description</label>
            <textarea
              id="community-description"
              name="description"
              rows={6}
              placeholder="Describe the source, correction, note, concern, or resource for curator review."
              required
            />
          </div>
          <div className="community-field-grid">
            <div className="community-field">
              <label htmlFor="community-related-record">Related record ID</label>
              <input
                id="community-related-record"
                name="related_record_id"
                placeholder="Optional"
              />
            </div>
            <div className="community-field">
              <label htmlFor="community-source-url">Source URL</label>
              <input
                id="community-source-url"
                name="source_url"
                type="url"
                placeholder="https://..."
              />
            </div>
          </div>
        </>
      )}

      <label className="community-check">
        <input type="checkbox" name="acknowledgement" required />
        <span>
          {isSharedList
            ? "I understand this reading list may be visible to other members if approved."
            : "I understand this submission will be reviewed before it appears anywhere publicly."}
        </span>
      </label>

      <button
        type="submit"
        className="community-button community-button-primary"
        disabled={selectedListIsPrivate}
      >
        {isSharedList ? "Share for review" : "Send for review"}
      </button>
    </form>
  );
}
