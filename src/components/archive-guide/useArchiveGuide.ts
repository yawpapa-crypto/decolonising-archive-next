"use client";

import { useCallback, useState } from "react";
import type {
  ArchiveGuideApiResponse,
  ArchiveGuideArea,
  ArchiveGuideMode,
  ArchiveGuideStructuredContext,
  ArchiveGuideSuccess,
} from "@/src/lib/archive-guide-types";

export function useArchiveGuide() {
  const [response, setResponse] = useState<ArchiveGuideSuccess | null>(null);
  const [error, setError] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const ask = useCallback(
    async (input: {
      area: ArchiveGuideArea;
      mode: ArchiveGuideMode;
      context: ArchiveGuideStructuredContext;
      userMessage?: string;
    }) => {
      setIsAsking(true);
      setError("");
      try {
        const res = await fetch("/api/archive-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json()) as ArchiveGuideApiResponse;
        if (!data.ok) {
          setError(data.error);
          return data;
        }
        setResponse(data);
        return data;
      } catch {
        const failure = {
          ok: false as const,
          error: "Archive Guide could not respond right now. Try again in a moment.",
        };
        setError(failure.error);
        return failure;
      } finally {
        setIsAsking(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError("");
  }, []);

  return {
    ask,
    reset,
    response,
    error,
    isAsking,
  };
}
