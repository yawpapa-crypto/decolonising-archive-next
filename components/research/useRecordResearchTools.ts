"use client";

import { useCallback, useEffect, useState } from "react";
import type { CollectionRecordResearchInput } from "@/lib/research/collection-record-research";
import { buildCatalogueRecordSnapshot } from "@/lib/research/collection-record-research";

type ReadingList = { id: string; title: string };

type SessionState = {
  authenticated: boolean;
  bookmarked: boolean;
  readingLists: ReadingList[];
};

type PendingAction = {
  action: "bookmark" | "add_to_list";
  listId?: string;
};

const PENDING_KEY = "ared.pendingResearchAction";

export function useRecordResearchTools(input: CollectionRecordResearchInput) {
  const [session, setSession] = useState<SessionState>({
    authenticated: false,
    bookmarked: false,
    readingLists: [],
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const recordSnapshot = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ared.design";
    return buildCatalogueRecordSnapshot(input, origin);
  }, [input]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch("/api/workspace/record-tools?mode=session", {
        credentials: "include",
      });
      const sessionJson = await sessionRes.json();
      const authenticated = Boolean(sessionJson.authenticated);

      if (!authenticated) {
        setSession({ authenticated: false, bookmarked: false, readingLists: [] });
        return;
      }

      const recordRes = await fetch(
        `/api/workspace/record-tools?recordId=${encodeURIComponent(input.itemId)}`,
        { credentials: "include" },
      );
      const recordJson = await recordRes.json();

      setSession({
        authenticated: true,
        bookmarked: Boolean(recordJson.bookmarked),
        readingLists: Array.isArray(recordJson.readingLists)
          ? recordJson.readingLists.map((list: { id: string; title: string }) => ({
              id: list.id,
              title: list.title,
            }))
          : [],
      });
    } catch {
      setSession({ authenticated: false, bookmarked: false, readingLists: [] });
    } finally {
      setLoading(false);
    }
  }, [input.itemId]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (loading || !session.authenticated) return;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingAction & { itemId?: string };
      if (pending.itemId !== input.itemId) return;
      sessionStorage.removeItem(PENDING_KEY);
      if (pending.action === "bookmark") {
        void toggleBookmark();
      } else if (pending.action === "add_to_list" && pending.listId) {
        void addToList(pending.listId);
      }
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session.authenticated, input.itemId]);

  const signInUrl = useCallback(() => {
    const next = encodeURIComponent(
      typeof window !== "undefined" ? window.location.pathname + window.location.search : input.canonicalPath,
    );
    return `/auth/sign-in?next=${next}`;
  }, [input.canonicalPath]);

  const requireAuth = useCallback(
    (action: PendingAction) => {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...action, itemId: input.itemId }));
      window.location.href = signInUrl();
    },
    [input.itemId, signInUrl],
  );

  const postAction = useCallback(
    async (body: Record<string, unknown>) => {
      const snapshot = recordSnapshot();
      const res = await fetch("/api/workspace/record-tools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...body,
          recordId: input.itemId,
          recordTitle: input.title,
          recordUrl: snapshot.record_source_url,
          record: snapshot,
          metadata: snapshot.metadata,
        }),
      });
      const json = await res.json();
      if (res.status === 401 || !json.authenticated) {
        return { ok: false as const, auth: true as const };
      }
      return { ok: Boolean(json.ok), auth: false as const, json };
    },
    [input.itemId, input.title, recordSnapshot],
  );

  const toggleBookmark = useCallback(async () => {
    if (!session.authenticated) {
      requireAuth({ action: "bookmark" });
      return;
    }
    setBusy("bookmark");
    setMessage(null);
    const wasBookmarked = session.bookmarked;
    try {
      const result = await postAction({ action: "bookmark" });
      if (result.auth) {
        requireAuth({ action: "bookmark" });
        return;
      }
      if (result.ok) {
        setSession((prev) => ({ ...prev, bookmarked: !prev.bookmarked }));
        setMessage(wasBookmarked ? "Bookmark removed" : "Record saved");
      } else {
        setMessage("Could not update bookmark");
      }
    } finally {
      setBusy(null);
    }
  }, [postAction, requireAuth, session.authenticated, session.bookmarked]);

  const addToList = useCallback(
    async (listId: string) => {
      if (!session.authenticated) {
        requireAuth({ action: "add_to_list", listId });
        return;
      }
      setBusy(`list-${listId}`);
      setMessage(null);
      try {
        const result = await postAction({ action: "add_to_reading_list", readingListId: listId });
        if (result.auth) {
          requireAuth({ action: "add_to_list", listId });
          return;
        }
        if (result.ok) {
          setMessage("Added to reading list");
        } else {
          setMessage("Could not add to list");
        }
      } finally {
        setBusy(null);
      }
    },
    [postAction, requireAuth, session.authenticated],
  );

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}${input.canonicalPath}`;
    await navigator.clipboard.writeText(url);
    setMessage("Link copied");
  }, [input.canonicalPath]);

  return {
    session,
    loading,
    message,
    busy,
    setMessage,
    refreshSession,
    toggleBookmark,
    addToList,
    copyLink,
    signInUrl,
  };
}
