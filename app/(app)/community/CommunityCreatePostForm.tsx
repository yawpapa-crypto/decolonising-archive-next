import Link from "next/link";
import { Bookmark, Link2, ListPlus } from "lucide-react";
import type { CommunityAttachmentOptions } from "@/src/lib/community-reading-commons";
import { createCommunityPost } from "./actions";

type CommunityCreatePostFormProps = {
  signedIn: boolean;
  options: CommunityAttachmentOptions;
  initialRecordId?: string;
  initialRecordTitle?: string;
  initialReadingListId?: string;
};

export default function CommunityCreatePostForm({
  signedIn,
  options,
  initialRecordId = "",
  initialRecordTitle = "",
  initialReadingListId = "",
}: CommunityCreatePostFormProps) {
  const shouldOpen = Boolean(initialRecordId || initialReadingListId || initialRecordTitle);

  if (!signedIn) {
    return (
      <div className="community-composer community-create-locked" id="share">
        <span className="community-composer__avatar" aria-hidden="true">
          DA
        </span>
        <p>Share a source, question, reading path or reflection...</p>
        <Link href="/auth/sign-in?next=/community" className="community-button community-button-primary">
          Sign in to share
        </Link>
      </div>
    );
  }

  return (
    <details className="community-composer" id="share" open={shouldOpen}>
      <summary>
        <span className="community-composer__avatar" aria-hidden="true">
          DA
        </span>
        <span className="community-composer-prompt">Share a source, question, reading path or reflection...</span>
        <span className="community-composer-tools" aria-hidden="true">
          <span><Bookmark size={16} /> Saved record</span>
          <span><ListPlus size={16} /> Reading list</span>
          <span><Link2 size={16} /> Link</span>
        </span>
        <strong>New post</strong>
      </summary>

      <form action={createCommunityPost} className="community-form community-post-form">
        <div className="community-field-grid community-field-grid--composer">
          <div className="community-field">
            <label htmlFor="community-post-title">Title</label>
            <input
              id="community-post-title"
              name="title"
              required
              maxLength={180}
              placeholder="A source, question, reading path, or short reflection"
              defaultValue={initialRecordTitle ? `Reading note: ${initialRecordTitle}` : ""}
            />
          </div>
          <div className="community-field">
            <label htmlFor="community-post-type">Type</label>
            <select
              id="community-post-type"
              name="post_type"
              defaultValue={initialReadingListId ? "reading_list" : "reflection"}
            >
              <option value="reflection">Reflection</option>
              <option value="source_note">Source note</option>
              <option value="reading_list">Reading list</option>
              <option value="question">Question</option>
              <option value="teaching_path">Teaching path</option>
            </select>
          </div>
        </div>

        <div className="community-field">
          <label htmlFor="community-post-body">Reflection or research question</label>
          <textarea
            id="community-post-body"
            name="body"
            rows={4}
            required
            maxLength={12000}
            placeholder="What did you find? What should others notice? What question does this source open?"
          />
        </div>

        <div className="community-field-grid">
          <div className="community-field">
            <label htmlFor="community-post-tags">Tags</label>
            <input id="community-post-tags" name="tags" placeholder="archives, method, teaching" />
          </div>
          <div className="community-field">
            <label htmlFor="community-post-visibility">Visibility</label>
            <select id="community-post-visibility" name="visibility" defaultValue="public">
              <option value="public">Public</option>
              <option value="community">Community</option>
              <option value="private">Private draft</option>
            </select>
          </div>
        </div>

        <div className="community-attachment-grid">
          <div className="community-field">
            <label htmlFor="community-bookmark">Attach saved record</label>
            <select id="community-bookmark" name="bookmark_id" defaultValue="">
              <option value="">No saved record</option>
              {options.bookmarks.map((bookmark) => (
                <option key={bookmark.id} value={bookmark.id}>
                  {bookmark.record_title || bookmark.record_id}
                </option>
              ))}
            </select>
          </div>
          <div className="community-field">
            <label htmlFor="community-reading-list">Attach reading list</label>
            <select id="community-reading-list" name="reading_list_id" defaultValue={initialReadingListId}>
              <option value="">No reading list</option>
              {options.readingLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title} ({list.is_public ? "public" : "private"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {initialRecordId ? (
          <div className="community-field-grid">
            <div className="community-field">
              <label htmlFor="community-record-id">Library record</label>
              <input id="community-record-id" name="record_id" defaultValue={initialRecordId} readOnly />
            </div>
            <div className="community-field">
              <label htmlFor="community-record-title">Record title</label>
              <input id="community-record-title" name="record_title" defaultValue={initialRecordTitle} readOnly />
            </div>
          </div>
        ) : null}

        <div className="community-composer__actions">
          <span>Attach only what helps others read with care.</span>
          <button type="submit" className="community-button community-button-primary">
            Post
          </button>
        </div>
      </form>
    </details>
  );
}
