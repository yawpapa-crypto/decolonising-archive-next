"use client";

import { useEffect, useState } from "react";

export function useLocalToast() {
  const [message, setMessage] = useState("");

  const showToast = (nextMessage: string) => {
    setMessage(nextMessage);
  };

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [message]);

  const Toast = () =>
    message ? (
      <div className="local-toast" role="status" aria-live="polite">
        {message}
      </div>
    ) : null;

  return { showToast, Toast };
}
