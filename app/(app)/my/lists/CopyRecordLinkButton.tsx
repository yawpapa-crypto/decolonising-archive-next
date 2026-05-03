"use client";

import { useLocalToast } from "./useLocalToast";

type CopyRecordLinkButtonProps = {
  recordId: string;
  recordTitle?: string;
};

export default function CopyRecordLinkButton({
  recordId,
  recordTitle,
}: CopyRecordLinkButtonProps) {
  const { showToast, Toast } = useLocalToast();

  const copyRecordLink = async () => {
    try {
      const url = `${window.location.origin}/#/record/${encodeURIComponent(recordId)}`;
      await navigator.clipboard.writeText(url);
      showToast("Record link copied.");
    } catch (error) {
      console.error("Copy record link failed:", error);
      showToast("Could not copy record link.");
    }
  };

  return (
    <>
      <Toast />
      <button
      type="button"
      className="workspace-link workspace-copy-link"
      onClick={copyRecordLink}
      aria-label={`Copy link for ${recordTitle || "record"}`}
    >
        Copy link
      </button>
    </>
  );
}
