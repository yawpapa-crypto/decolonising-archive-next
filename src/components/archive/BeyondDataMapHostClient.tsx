"use client";

import { useEffect, useState } from "react";
import BeyondDataMapFlow from "@/src/components/archive/BeyondDataMapFlow";

const HOST_ID = "beyondDataFlowHost";

export default function BeyondDataMapHostClient() {
  const [hostExists, setHostExists] = useState(false);

  useEffect(() => {
    const check = () => !!document.getElementById(HOST_ID);
    if (check()) {
      setHostExists(true);
      if (process.env.NODE_ENV !== "production") console.log("[BeyondDataMapHostClient] host found on mount");
      return;
    }
    const observer = new MutationObserver(() => {
      if (check()) {
        setHostExists(true);
        if (process.env.NODE_ENV !== "production") console.log("[BeyondDataMapHostClient] host found via mutation observer");
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!hostExists) return null;
  return <BeyondDataMapFlow />;
}
