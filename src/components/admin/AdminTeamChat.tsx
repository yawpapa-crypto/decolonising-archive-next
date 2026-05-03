"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAdminChatMessages,
  sendAdminChatMessage,
  type AdminChatMessage,
} from "@/app/(admin)/admin/workspace-tools/actions";

const POLL_MS = 12_000;

export default function AdminTeamChat({ adminUserId }: { adminUserId: string }) {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setNotice(null);
    const res = await fetchAdminChatMessages();
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      setMessages([]);
      return;
    }
    setMessages(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setNotice(null);
    const res = await sendAdminChatMessage(text);
    setSending(false);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      return;
    }
    setDraft("");
    await load();
    setNotice({ type: "ok", text: "Sent." });
  }, [draft, load]);

  if (loading) {
    return <p className="admin-muted">Loading messages…</p>;
  }

  return (
    <div className="admin-apps-placeholder admin-chat-mock">
      <p className="admin-apps-placeholder-title">Team chat</p>
      <p className="admin-muted">
        Team messages are saved to the dashboard. Realtime and Slack bridge can be added later.
      </p>
      {/* TODO: Slack bridge — wire outbound webhook or shared channel when product is ready. */}

      {notice ? (
        <p
          className={notice.type === "err" ? "admin-flash admin-flash-error" : "admin-flash admin-flash-ok"}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      <div className="admin-chat-thread" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? (
          <p className="admin-muted admin-chat-empty">No messages yet. Start the team chat.</p>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === adminUserId;
            const label = m.sender_name?.trim() || "Team member";
            return (
              <div
                key={m.id}
                className={`admin-chat-bubble ${isMe ? "is-me" : "is-them"}`}
              >
                <span className="admin-chat-sender">{isMe ? "You" : label}</span>
                <p>{m.body}</p>
                <time className="admin-chat-time" dateTime={m.created_at}>
                  {new Date(m.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="admin-chat-compose">
        <input
          type="text"
          className="admin-chat-input"
          placeholder="Write a message…"
          value={draft}
          disabled={sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void send())}
          aria-label="Message"
        />
        <button type="button" className="admin-button" disabled={sending} onClick={() => void send()}>
          Send
        </button>
      </div>
    </div>
  );
}
