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
import type { NoteMode } from "./workbench-note-types";

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
  const remoteNoteIdRef = useRef<string | null>(null);
  const onRemoteNoteRef = useRef(onRemoteNote);

  useEffect(() => {
    onRemoteNoteRef.current = onRemoteNote;
  }, [onRemoteNote]);

  const upsertPresence = useCallback(async () => {
    if (!enabled || !projectId || !currentUserId) return;
    await supabase.from("workbench_project_presence").upsert(
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
  }, [enabled, projectId, currentUserId, noteId, noteMode, displayName, supabase]);

  const applyRemoteNote = useCallback(async () => {
    const targetId = remoteNoteIdRef.current ?? noteId;
    if (!targetId) return;
    const { data, error } = await supabase
      .from("workbench_notes")
      .select("*")
      .eq("id", targetId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return;
    onRemoteNoteRef.current(data as WorkbenchNoteRow);
    setRemoteChangesPending(false);
    remoteNoteIdRef.current = null;
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
      void applyRemoteNote();
    },
    [applyRemoteNote, currentUserId, isCanvasInteracting, isDirty, isSaving, noteId],
  );

  useEffect(() => {
    if (!enabled || !projectId || !currentUserId) {
      setPeers([]);
      setActivities([]);
      setCanvasLocks([]);
      setComments([]);
      return;
    }

    let cancelled = false;

    const loadInitial = async () => {
      const [presenceRes, activityRes, commentsRes] = await Promise.all([
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
        supabase
          .from("workbench_project_comments")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      if (cancelled) return;

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
      setComments((commentsRes.data ?? []) as WorkbenchProjectCommentRow[]);
    };

    void loadInitial();
    void upsertPresence();

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
        async () => {
          if (!noteId) return;
          const { data } = await supabase
            .from("workbench_canvas_object_locks")
            .select("*")
            .eq("note_id", noteId);
          if (!cancelled) setCanvasLocks((data ?? []) as WorkbenchCanvasObjectLockRow[]);
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
          const { data } = await supabase
            .from("workbench_project_comments")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(30);
          if (!cancelled) setComments((data ?? []) as WorkbenchProjectCommentRow[]);
        },
      )
      .subscribe();

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
          .subscribe()
      : null;

    const heartbeat = window.setInterval(() => {
      void upsertPresence();
    }, WORKBENCH_PRESENCE_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      void supabase.removeChannel(channel);
      if (noteChannel) void supabase.removeChannel(noteChannel);
    };
  }, [
    enabled,
    projectId,
    noteId,
    currentUserId,
    handleNotePayload,
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
    void supabase
      .from("workbench_canvas_object_locks")
      .select("*")
      .eq("note_id", noteId)
      .then(({ data }) => setCanvasLocks((data ?? []) as WorkbenchCanvasObjectLockRow[]));
  }, [enabled, noteId, supabase]);

  return {
    peers,
    activities,
    remoteChangesPending,
    applyRemoteNote,
    dismissRemoteChanges,
    canvasLocks,
    comments,
    refreshComments: async () => {
      if (!projectId) return;
      const { data } = await supabase
        .from("workbench_project_comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30);
      setComments((data ?? []) as WorkbenchProjectCommentRow[]);
    },
  };
}
