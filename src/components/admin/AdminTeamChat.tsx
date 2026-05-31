"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAdminChatChannels,
  fetchAdminChatMessages,
  sendAdminChatMessage,
  type AdminChatChannel,
  type AdminChatMessage,
} from "@/app/(admin)/admin/workspace-tools/actions";

const POLL_MS = 10_000;

export default function AdminTeamChat({ adminUserId }: { adminUserId: string }) {
  const [channels, setChannels] = useState<AdminChatChannel[]>([]);
  const [channelSlug, setChannelSlug] = useState("general");
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async (slug: string) => {
    setNotice(null);
    const res = await fetchAdminChatMessages(slug);
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
      const channelsRes = await fetchAdminChatChannels();
      if (!cancelled && channelsRes.ok) {
        setChannels(channelsRes.data);
        if (channelsRes.data.length > 0 && !channelsRes.data.some((c) => c.slug === channelSlug)) {
          setChannelSlug(channelsRes.data[0].slug);
        }
      }
      await loadMessages(channelSlug);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [channelSlug, loadMessages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMessages(channelSlug);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [channelSlug, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, channelSlug]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setNotice(null);
    const res = await sendAdminChatMessage(text, channelSlug);
    setSending(false);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      return;
    }
    setDraft("");
    await loadMessages(channelSlug);
    setNotice({ type: "ok", text: "Sent." });
  }, [draft, channelSlug, loadMessages]);

  if (loading) {
    return <p className="admin-muted">Loading chat…</p>;
  }

  const activeChannel = channels.find((c) => c.slug === channelSlug);

  return (
    <div className="admin-chat-panel-inner">
      <div className="admin-panel-label">Team chat</div>
      <p className="admin-muted">
        {activeChannel?.description || "Admin team messaging. Messages poll every 10 seconds."}
      </p>

      {channels.length > 0 ? (
        <div className="admin-chat-channels" role="tablist" aria-label="Chat channels">
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              role="tab"
              aria-selected={channelSlug === channel.slug}
              className={`admin-apps-tab ${channelSlug === channel.slug ? "is-active" : ""}`}
              onClick={() => setChannelSlug(channel.slug)}
            >
              {channel.name}
            </button>
          ))}
        </div>
      ) : null}

      {notice ? (
        <p
          className={
            notice.type === "err" ? "admin-flash admin-flash-error" : "admin-flash admin-flash-ok"
          }
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
          placeholder={`Message #${activeChannel?.name ?? channelSlug}…`}
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
