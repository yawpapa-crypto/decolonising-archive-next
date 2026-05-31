"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import type { WorkbenchNoteRow } from "@/lib/workbench-data";
import {
  WORKBENCH_PRESENCE_HEARTBEAT_MS,
  isPresenceStale,
  type WorkbenchCanvasObjectLockRow,
  type WorkbenchCollaborationNoteMode,
  type WorkbenchProjectActivityRow,
  type WorkbenchProjectCommentRow,
  type WorkbenchProjectPresenceRow,
} from "@/lib/workbench-project-collaboration";
import { getErrorMessage } from "@/lib/get-error-message";
import type { NoteMode } from "./workbench-note-types";

function logCollaborationError(label: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[WorkbenchCollaboration] ${label}:`, getErrorMessage(error), error);
  }
}

function isEventLikeError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "type" in error &&
      "target" in error,
  );
}

export type CollaborationPeer = {
  userId: string;
  displayName: string | null;
  noteId: string | null;
  noteMode: WorkbenchCollaborationNoteMode | null;
  lastSeenAt: string;
};

type Options = {
  enabled: boolean;
  projectId: string | null;
  noteId: string | null;
  noteMode: NoteMode;
  currentUserId: string | null;
  displayName: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isCanvasInteracting: boolean;
  onRemoteNote: (note: WorkbenchNoteRow) => void;
};

export function useWorkbenchProjectCollaboration({
  enabled,
  projectId,
  noteId,
  noteMode,
  currentUserId,
  displayName,
  isDirty,
  isSaving,
  isCanvasInteracting,
  onRemoteNote,
}: Options) {
  const supabase = useMemo(() => createClient(), []);
  const [peers, setPeers] = useState<CollaborationPeer[]>([]);
  const [activities, setActivities] = useState<WorkbenchProjectActivityRow[]>([]);
  const [remoteChangesPending, setRemoteChangesPending] = useState(false);
  const [canvasLocks, setCanvasLocks] = useState<WorkbenchCanvasObjectLockRow[]>([]);
  const [comments, setComments] = useState<WorkbenchProjectCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const remoteNoteIdRef = useRef<string | null>(null);
  const onRemoteNoteRef = useRef(onRemoteNote);

  useEffect(() => {
    onRemoteNoteRef.current = onRemoteNote;
  }, [onRemoteNote]);

  const upsertPresence = useCallback(async () => {
    if (!enabled || !projectId || !currentUserId) return;
    try {
      const { error } = await supabase.from("workbench_project_presence").upsert(
        {
          project_id: projectId,
          user_id: currentUserId,
          note_id: noteId,
          note_mode: noteMode,
          display_name: displayName,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "project_id,user_id" },
      );
      if (error) logCollaborationError("presence update failed", error);
    } catch (error) {
      logCollaborationError("presence update failed", error);
    }
  }, [enabled, projectId, currentUserId, noteId, noteMode, displayName, supabase]);

  const applyRemoteNote = useCallback(async () => {
    const targetId = remoteNoteIdRef.current ?? noteId;
    if (!targetId) return;
    try {
      const { data, error } = await supabase
        .from("workbench_notes")
        .select("*")
        .eq("id", targetId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error || !data) {
        if (error) logCollaborationError("remote note refresh failed", error);
        return;
      }
      onRemoteNoteRef.current(data as WorkbenchNoteRow);
      setRemoteChangesPending(false);
      remoteNoteIdRef.current = null;
    } catch (error) {
      logCollaborationError("remote note refresh failed", error);
    }
  }, [noteId, supabase]);

  const dismissRemoteChanges = useCallback(() => {
    setRemoteChangesPending(false);
    remoteNoteIdRef.current = null;
  }, []);

  const handleNotePayload = useCallback(
    (payload: { new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
      const row = (payload.new ?? payload.old) as { id?: string; user_id?: string } | null;
      if (!row?.id || row.user_id === currentUserId) return;
      if (row.id !== noteId) return;
      if (isDirty || isSaving || isCanvasInteracting) {
        remoteNoteIdRef.current = row.id;
        setRemoteChangesPending(true);
        return;
      }
      void applyRemoteNote().catch((error) => {
        logCollaborationError("remote note apply failed", error);
      });
    },
    [applyRemoteNote, currentUserId, isCanvasInteracting, isDirty, isSaving, noteId],
  );

  const refreshComments = useCallback(async () => {
    if (!enabled || !projectId) {
      setComments([]);
      setCommentsError("");
      setCommentsLoading(false);
      return;
    }

    setCommentsLoading(true);
    setCommentsError("");

    try {
      let query = supabase
        .from("workbench_project_comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (noteId) {
        query = query.or(`note_id.eq.${noteId},note_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        setComments([]);
        setCommentsError(getErrorMessage(error));
      } else {
        setComments((data ?? []) as WorkbenchProjectCommentRow[]);
      }
    } catch (error) {
      setComments([]);
      setCommentsError(getErrorMessage(error));
    } finally {
      setCommentsLoading(false);
    }
  }, [enabled, noteId, projectId, supabase]);

  const loadCanvasLocks = useCallback(async () => {
    if (!enabled || !noteId) {
      setCanvasLocks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workbench_canvas_object_locks")
        .select("*")
        .eq("note_id", noteId);
      if (error) {
        logCollaborationError("canvas lock refresh failed", error);
        setCanvasLocks([]);
        return;
      }
      setCanvasLocks((data ?? []) as WorkbenchCanvasObjectLockRow[]);
    } catch (error) {
      logCollaborationError("canvas lock refresh failed", error);
      setCanvasLocks([]);
    }
  }, [enabled, noteId, supabase]);

  useEffect(() => {
    if (!enabled) return;

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isEventLikeError(event.reason)) return;
      event.preventDefault();
      logCollaborationError("suppressed browser event rejection", event.reason);
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !projectId || !currentUserId) {
      setPeers([]);
      setActivities([]);
      setCanvasLocks([]);
      setComments([]);
      setCommentsError("");
      setCommentsLoading(false);
      return;
    }

    let cancelled = false;

    const loadInitial = async () => {
      try {
        const [presenceRes, activityRes] = await Promise.all([
          supabase
            .from("workbench_project_presence")
            .select("*")
            .eq("project_id", projectId)
            .order("last_seen_at", { ascending: false }),
          supabase
            .from("workbench_project_activity")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(12),
        ]);

        if (cancelled) return;

        if (presenceRes.error) logCollaborationError("presence load failed", presenceRes.error);
        if (activityRes.error) logCollaborationError("activity load failed", activityRes.error);

        const nextPeers = (presenceRes.data ?? [])
          .map((row) => row as WorkbenchProjectPresenceRow)
          .filter((row) => row.user_id !== currentUserId && !isPresenceStale(row.last_seen_at))
          .map(
            (row): CollaborationPeer => ({
              userId: row.user_id,
              displayName: row.display_name,
              noteId: row.note_id,
              noteMode: row.note_mode,
              lastSeenAt: row.last_seen_at,
            }),
          );
        setPeers(nextPeers);
        setActivities((activityRes.data ?? []) as WorkbenchProjectActivityRow[]);
      } catch (error) {
        if (!cancelled) logCollaborationError("collaboration load failed", error);
      }
    };

    void loadInitial().catch((error) => logCollaborationError("collaboration load failed", error));
    void refreshComments().catch((error) => logCollaborationError("comments refresh failed", error));
    void upsertPresence().catch((error) => logCollaborationError("presence update failed", error));

    const channel = supabase
      .channel(`workbench-project:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workbench_project_presence",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void loadInitial();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workbench_project_activity",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as WorkbenchProjectActivityRow;
          if (row.user_id === currentUserId) return;
          setActivities((prev) => [row, ...prev].slice(0, 12));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workbench_canvas_object_locks",
        },
        () => {
          if (!noteId || cancelled) return;
          void loadCanvasLocks().catch((error) => {
            if (!cancelled) logCollaborationError("canvas lock refresh failed", error);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workbench_project_comments",
          filter: `project_id=eq.${projectId}`,
        },
        async () => {
          if (!cancelled) {
            void refreshComments().catch((error) => logCollaborationError("comments refresh failed", error));
          }
        },
      )
      .subscribe((status, err) => {
        if (err) {
          // Suppress unhandled WebSocket error events that would otherwise
          // reach window.onerror and appear as "[object Event]" in the
          // Next.js dev overlay.
          logCollaborationError(`project channel ${status}`, err);
        }
      });

    const noteChannel = noteId
      ? supabase
          .channel(`workbench-note:${noteId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "workbench_notes",
              filter: `id=eq.${noteId}`,
            },
            (payload) => handleNotePayload(payload),
          )
          .subscribe((status, err) => {
            if (err) {
              logCollaborationError(`note channel ${status}`, err);
            }
          })
      : null;

    const heartbeat = window.setInterval(() => {
      void upsertPresence().catch((error) => logCollaborationError("presence heartbeat failed", error));
    }, WORKBENCH_PRESENCE_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      void supabase.removeChannel(channel).catch((error) => {
        logCollaborationError("project channel cleanup failed", error);
      });
      if (noteChannel) {
        void supabase.removeChannel(noteChannel).catch((error) => {
          logCollaborationError("note channel cleanup failed", error);
        });
      }
    };
  }, [
    enabled,
    projectId,
    noteId,
    currentUserId,
    handleNotePayload,
    loadCanvasLocks,
    refreshComments,
    supabase,
    upsertPresence,
  ]);

  useEffect(() => {
    if (!remoteChangesPending || isDirty || isSaving || isCanvasInteracting) return;
    void applyRemoteNote();
  }, [remoteChangesPending, isDirty, isSaving, isCanvasInteracting, applyRemoteNote]);

  useEffect(() => {
    if (!enabled || !noteId) {
      setCanvasLocks([]);
      return;
    }
    void loadCanvasLocks().catch((error) => logCollaborationError("canvas lock refresh failed", error));
  }, [enabled, loadCanvasLocks, noteId]);

  return {
    peers,
    activities,
    remoteChangesPending,
    applyRemoteNote,
    dismissRemoteChanges,
    canvasLocks,
    comments,
    commentsLoading,
    commentsError,
    refreshComments,
  };
}
