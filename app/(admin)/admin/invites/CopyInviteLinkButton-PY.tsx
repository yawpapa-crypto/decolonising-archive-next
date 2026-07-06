"use client";

import { useState } from "react";

export default function CopyInviteLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="admin-small-button admin-primary-button" onClick={copy}>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
