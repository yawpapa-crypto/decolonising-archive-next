"use client";

import { useLocalToast } from "./useLocalToast";

type CopyReadingListLinkButtonProps = {
  listId: string;
  listTitle: string;
};

export default function CopyReadingListLinkButton({
  listId,
  listTitle,
}: CopyReadingListLinkButtonProps) {
  const { showToast, Toast } = useLocalToast();

  const copyListLink = async () => {
    try {
      const url = `${window.location.origin}/my/lists#list-${encodeURIComponent(listId)}`;
      await navigator.clipboard.writeText(url);
      showToast("Reading list link copied.");
    } catch (error) {
      console.error("Copy reading list link failed:", error);
      showToast("Could not copy reading list link.");
    }
  };

  return (
    <>
      <Toast />
      <button
        type="button"
        className="workspace-link workspace-copy-link"
        onClick={copyListLink}
        aria-label={`Copy link for ${listTitle}`}
      >
        Copy list link
      </button>
    </>
  );
}
