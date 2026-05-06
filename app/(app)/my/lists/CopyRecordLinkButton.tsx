"use client";

import { useState } from "react";
import { useLocalToast } from "./useLocalToast";
import { isExternalHref } from "@/src/lib/record-links";

type CopyRecordLinkButtonProps = {
  recordHref: string | null;
  recordTitle?: string;
  /** Defaults to workspace link styles. */
  className?: string;
  disabledClassName?: string;
};

function copyViaExecCommand(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export default function CopyRecordLinkButton({
  recordHref,
  recordTitle,
  className = "workspace-link workspace-copy-link",
  disabledClassName = "workspace-link workspace-copy-link workspace-link-disabled",
}: CopyRecordLinkButtonProps) {
  const { showToast, Toast } = useLocalToast();
  const [label, setLabel] = useState("Copy link");

  const copyRecordLink = async () => {
    if (!recordHref) {
      showToast("Record link unavailable.");
      return;
    }
    const absolute = isExternalHref(recordHref)
      ? recordHref
      : new URL(recordHref, `${window.location.origin}/`).href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absolute);
      } else if (!copyViaExecCommand(absolute)) {
        throw new Error("clipboard_unavailable");
      }
      setLabel("Copied");
      window.setTimeout(() => setLabel("Copy link"), 2000);
    } catch (error) {
      console.error("Copy record link failed:", error);
      showToast("Could not copy record link.");
    }
  };

  if (!recordHref) {
    return (
      <span className={disabledClassName} aria-disabled>
        Record link unavailable
      </span>
    );
  }

  return (
    <>
      <Toast />
      <button
        type="button"
        className={className}
        onClick={copyRecordLink}
        aria-label={`Copy link for ${recordTitle || "record"}`}
      >
        {label}
      </button>
    </>
  );
}
