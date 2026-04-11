"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import PageShell from "@/src/components/layout/PageShell";

export default function Home() {
  const [hasHash, setHasHash] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      setHasHash(true);
      return;
    }

    window.location.replace("/#/home");
  }, []);

  if (!hasHash) {
    return null;
  }

  return (
    <PageShell>
      <main id="app"></main>

      <noscript>
        <div className="empty noscript-note">
          This archive needs JavaScript enabled to render the local index and
          record pages.
        </div>
      </noscript>

      <Script
        src="/assets/js/app.js"
        strategy="afterInteractive"
        type="module"
      />
    </PageShell>
  );
}
