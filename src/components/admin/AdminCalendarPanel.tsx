"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminCalendarEvent,
  deleteAdminCalendarEvent,
  fetchAdminCalendarEvents,
  updateAdminCalendarEvent,
  type AdminCalendarEvent,
} from "@/app/(admin)/admin/workspace-tools/actions";

function todayLocalISODate() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(iso: string) {
  const [y, mo, da] = iso.split("-").map(Number);
  if (!y || !mo || !da) return iso;
  const dt = new Date(y, mo - 1, da);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function AdminCalendarPanel() {
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(todayLocalISODate());
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState("general");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("general");

  const reload = useCallback(async () => {
    setNotice(null);
    const res = await fetchAdminCalendarEvents();
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      setEvents([]);
      return;
    }
    setEvents(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const grouped = useMemo(() => {
    const upcoming = events.filter((e) => e.event_date >= todayLocalISODate());
    const past = events.filter((e) => e.event_date < todayLocalISODate());
    const byDate = (list: AdminCalendarEvent[], dir: "asc" | "desc") => {
      const m = new Map<string, AdminCalendarEvent[]>();
      for (const ev of list) {
        const k = ev.event_date;
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(ev);
      }
      const entries = [...m.entries()];
      entries.sort(([a], [b]) => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
      return entries;
    };
    return { upcoming: byDate(upcoming, "asc"), past: byDate(past, "desc") };
  }, [events]);

  const addEvent = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    setBusyId("__new__");
    setNotice(null);
    const res = await createAdminCalendarEvent({
      title: t,
      description: description.trim() || null,
      event_date: eventDate,
      event_time: eventTime.trim() || null,
      event_type: eventType.trim() || "general",
    });
    setBusyId(null);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      return;
    }
    setTitle("");
    setDescription("");
    setEventDate(todayLocalISODate());
    setEventTime("");
    setEventType("general");
    await reload();
    setNotice({ type: "ok", text: "Event added." });
  }, [title, description, eventDate, eventTime, eventType, reload]);

  const startEdit = useCallback((e: AdminCalendarEvent) => {
    setEditingId(e.id);
    setEditTitle(e.title);
    setEditDescription(e.description ?? "");
    setEditDate(e.event_date);
    setEditTime(e.event_time ?? "");
    setEditType(e.event_type ?? "general");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setBusyId(editingId);
    setNotice(null);
    const res = await updateAdminCalendarEvent(editingId, {
      title: editTitle,
      description: editDescription,
      event_date: editDate,
      event_time: editTime.trim() || null,
      event_type: editType.trim() || "general",
    });
    setBusyId(null);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error });
      return;
    }
    setEditingId(null);
    await reload();
    setNotice({ type: "ok", text: "Event updated." });
  }, [editingId, editTitle, editDescription, editDate, editTime, editType, reload]);

  const removeEvent = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this calendar event? This cannot be undone.")) return;
      setBusyId(id);
      setNotice(null);
      const res = await deleteAdminCalendarEvent(id);
      setBusyId(null);
      if (!res.ok) {
        setNotice({ type: "err", text: res.error });
        return;
      }
      setEditingId(null);
      await reload();
      setNotice({ type: "ok", text: "Event removed." });
    },
    [reload],
  );

  if (loading) {
    return <p className="admin-muted">Loading calendar…</p>;
  }

  const renderEventRow = (e: AdminCalendarEvent) => {
    const isEditing = editingId === e.id;
    const busy = busyId === e.id;

    if (isEditing) {
      return (
        <li key={e.id} className="admin-calendar-event-edit">
          <input
            type="text"
            className="admin-chat-input"
            value={editTitle}
            disabled={busy}
            onChange={(ev) => setEditTitle(ev.target.value)}
            aria-label="Event title"
          />
          <textarea
            className="admin-projects-desc-input"
            value={editDescription}
            disabled={busy}
            onChange={(ev) => setEditDescription(ev.target.value)}
            placeholder="Description"
            rows={2}
          />
          <div className="admin-calendar-edit-grid">
            <input
              type="date"
              className="admin-filter"
              value={editDate}
              disabled={busy}
              onChange={(ev) => setEditDate(ev.target.value)}
            />
            <input
              type="time"
              className="admin-filter"
              value={editTime}
              disabled={busy}
              onChange={(ev) => setEditTime(ev.target.value)}
            />
            <input
              type="text"
              className="admin-filter"
              value={editType}
              disabled={busy}
              onChange={(ev) => setEditType(ev.target.value)}
              placeholder="Type"
              aria-label="Event type"
            />
          </div>
          <div className="admin-project-actions">
            <button type="button" className="admin-button" disabled={busy} onClick={() => void saveEdit()}>
              Save
            </button>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={busy}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </li>
      );
    }

    return (
      <li key={e.id} className="admin-calendar-event-row">
        <div className="admin-calendar-event-main">
          <strong>{e.title}</strong>
          {e.description ? <p className="admin-calendar-event-desc">{e.description}</p> : null}
          <p className="admin-calendar-event-meta">
            {e.event_time ? (
              <span>{formatTime(e.event_time)}</span>
            ) : (
              <span className="admin-muted">All day</span>
            )}
            <span className="admin-calendar-type-pill">{e.event_type ?? "general"}</span>
          </p>
        </div>
        <div className="admin-calendar-event-tools">
          <button
            type="button"
            className="admin-small-button admin-button-secondary"
            disabled={busyId !== null}
            onClick={() => startEdit(e)}
          >
            Edit
          </button>
          <button
            type="button"
            className="admin-small-button admin-danger-button"
            disabled={busyId !== null}
            onClick={() => void removeEvent(e.id)}
          >
            Delete
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="admin-apps-placeholder admin-calendar-panel">
      <p className="admin-apps-placeholder-title">Calendar</p>
      <p className="admin-muted">
        Plan internal editorial dates. Events are stored on the dashboard (no external calendar sync).
      </p>

      {notice ? (
        <p
          className={notice.type === "err" ? "admin-flash admin-flash-error" : "admin-flash admin-flash-ok"}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      <div className="admin-calendar-form dashboard-toolbar admin-calendar-form-extended">
        <input
          type="text"
          className="admin-chat-input admin-calendar-title-input"
          placeholder="Event title"
          value={title}
          disabled={busyId !== null}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addEvent())}
        />
        <textarea
          className="admin-projects-desc-input"
          placeholder="Description (optional)"
          value={description}
          disabled={busyId !== null}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <input
          type="date"
          className="admin-filter"
          value={eventDate}
          disabled={busyId !== null}
          onChange={(e) => setEventDate(e.target.value)}
          aria-label="Event date"
        />
        <input
          type="time"
          className="admin-filter"
          value={eventTime}
          disabled={busyId !== null}
          onChange={(e) => setEventTime(e.target.value)}
          aria-label="Event time"
        />
        <input
          type="text"
          className="admin-filter"
          value={eventType}
          disabled={busyId !== null}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Type (e.g. general)"
          aria-label="Event type"
        />
        <button
          type="button"
          className="admin-button"
          disabled={busyId !== null}
          onClick={() => void addEvent()}
        >
          Add event
        </button>
      </div>

      {events.length === 0 ? (
        <p className="admin-muted admin-calendar-empty-main">
          No events yet. Add an event to plan editorial activity.
        </p>
      ) : (
        <>
          <div className="admin-calendar-section">
            <h3 className="admin-calendar-section-title">Upcoming</h3>
            {grouped.upcoming.length === 0 ? (
              <p className="admin-muted">No upcoming dates.</p>
            ) : (
              grouped.upcoming.map(([date, list]) => (
                <div key={date} className="admin-calendar-day-group">
                  <h4 className="admin-calendar-day-heading">{formatDisplayDate(date)}</h4>
                  <ul className="admin-calendar-event-list">{list.map((ev) => renderEventRow(ev))}</ul>
                </div>
              ))
            )}
          </div>

          {grouped.past.length ? (
            <div className="admin-calendar-section admin-calendar-section-past">
              <h3 className="admin-calendar-section-title">Earlier</h3>
              {grouped.past.map(([date, list]) => (
                <div key={date} className="admin-calendar-day-group">
                  <h4 className="admin-calendar-day-heading">{formatDisplayDate(date)}</h4>
                  <ul className="admin-calendar-event-list">{list.map((ev) => renderEventRow(ev))}</ul>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
