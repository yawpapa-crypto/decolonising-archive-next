"use client";
import Link from "next/link";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Activity } from "@/lib/following/server";
import RecordSurface from "./RecordSurface";
import EventMenu, { read, write } from "./EventMenu";
export default function FollowingFeed({
  initial,
  next: initialNext,
  interlude,
  modules,
  sample,
}: {
  initial: Activity[];
  next: string | null;
  interlude?: React.ReactNode;
  modules?: Record<number, React.ReactNode>;
  sample?: boolean;
}) {
  const [items, setItems] = useState(initial),
    [next, setNext] = useState(initialNext),
    [error, setError] = useState(""),
    [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => { setHidden(read("ared-feed-hidden")); }, []);
  const seenRef = useRef<IntersectionObserver | null>(null);
  const timers = useRef(new Map<Element, number>());
  /** An event counts as seen after it has been at least half in view for a second. */
  const watch = useCallback((el: HTMLElement | null, id: string) => {
    if (!el) return;
    if (!seenRef.current) {
      seenRef.current = new IntersectionObserver((es) => es.forEach((e) => {
        const key = (e.target as HTMLElement).dataset.eid ?? "";
        if (e.isIntersecting) timers.current.set(e.target, window.setTimeout(() => { write("ared-feed-seen", [...read("ared-feed-seen"), key]); seenRef.current?.unobserve(e.target); }, 1000));
        else { const t = timers.current.get(e.target); if (t) window.clearTimeout(t); }
      }), { threshold: 0.5 });
    }
    el.dataset.eid = id;
    seenRef.current.observe(el);
  }, []);
  useEffect(() => () => seenRef.current?.disconnect(), []);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ared-following-scroll");
      if (!raw) return;
      const snap = JSON.parse(raw) as { y: number; n: number; next: string | null; items: Activity[] };
      if (snap.items?.length > initial.length) { setItems(snap.items); setNext(snap.next); }
      const y = snap.y;
      let tries = 0;
      const tick = () => { window.scrollTo(0, y); if (Math.abs(window.scrollY - y) > 2 && tries++ < 30) window.setTimeout(tick, 60); };
      window.setTimeout(tick, 30);
    } catch { /* no snapshot */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const latest = useRef({ items, next });
  latest.current = { items, next };
  useEffect(() => {
    const save = () => {
      try { sessionStorage.setItem("ared-following-scroll", JSON.stringify({ y: window.scrollY, n: latest.current.items.length, next: latest.current.next, items: latest.current.items.slice(0, 120) })); } catch { /* quota */ }
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("click", save, true);
    return () => { window.removeEventListener("pagehide", save); document.removeEventListener("click", save, true); };
  }, []);
  const busy = useRef(false),
    sentinel = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    if (busy.current || !next) return;
    busy.current = true;
    setError("");
    try {
      const r = await fetch(
        `/api/following?cursor=${encodeURIComponent(next)}`,
      );
      if (!r.ok) throw Error();
      const d = await r.json();
      setItems((p) => {
        const ids = new Set(p.map((i) => i.id));
        return [...p, ...d.items.filter((i: Activity) => !ids.has(i.id))];
      });
      setNext(d.next);
    } catch {
      setError("More activity could not load.");
    } finally {
      busy.current = false;
    }
  }, [next]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void load();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);
  return (
    <RecordSurface>
      {(tile) => (
        <div className="cf-stream">
          {items.filter((a) => !hidden.includes(a.id)).map((a, idx) => (
            <Fragment key={a.id}>
            {idx === 3 && interlude}
            {modules?.[idx]}
            <article className="cf-event" ref={(el) => watch(el, a.id)}>
              <header>
                {a.actor?.avatar ? (
                  <Image
                    unoptimized
                    src={a.actor.avatar}
                    alt=""
                    width="28"
                    height="28"
                  />
                ) : (
                  <span className="cf-avatar" aria-hidden>
                    {(a.actor?.name ?? "C")[0]}
                  </span>
                )}
                <div>
                  {a.actor ? (
                    <Link href={a.actor.href ?? `/people/${a.actor.id}`}>{a.actor.name}</Link>
                  ) : (
                    <span>Collection curator</span>
                  )}{" "}
                  <time dateTime={a.occurred_at}>
                    {new Date(a.occurred_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                  <p>
                    {a.action === "connected"
                      ? `Connected ${a.items.length || ""} records to`
                      : a.action === "contributed"
                        ? "Contributed a record to"
                        : a.action === "source"
                          ? "Added a source to"
                          : a.action === "added"
                      ? a.items.length
                        ? `Added ${a.items.length} publicly available ${a.items.length === 1 ? "record" : "records"} to`
                        : "Added records to"
                      : a.action === "published"
                        ? "Published"
                        : "Updated"}{" "}
                    <Link href={a.collection.href ?? `/c/${a.collection.id}`}>
                      {a.collection.title}
                    </Link>
                  </p>
                </div>
                <EventMenu a={a} onHide={(id) => setHidden((h) => [...h, id])} />
              </header>
              {a.items.length ? (
                <Sequence items={a.items} tile={tile} />
              ) : (
                <Link
                  className="cf-text-record"
                  href={a.collection.href ?? `/c/${a.collection.id}`}
                >
                  <h2>{a.collection.title}</h2>
                  <p>View the public collection and its context.</p>
                </Link>
              )}
            </article>
            </Fragment>
          ))}
          {items.filter((a) => !hidden.includes(a.id)).length <= 3 && interlude}
          {error && <p role="alert">{error}</p>}
          <div ref={sentinel} />
          {next && (
            <button className="cf-more" onClick={() => void load()}>
              Load more activity
            </button>
          )}
        </div>
      )}
    </RecordSurface>
  );
}
function Sequence({
  items,
  tile,
}: {
  items: Activity["items"];
  tile: (item: Activity["items"][number]) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className={`cf-sequence${items.length === 1 ? " cf-sequence--single" : ""}`}
    >
      <div
        ref={ref}
        className="cf-track"
        style={
          items.length > 1
            ? ({ "--cf-ar": items[0].ar ?? 0.8 } as React.CSSProperties)
            : undefined
        }
        tabIndex={0}
        aria-label="Records in this curatorial activity"
        onKeyDown={(e) => {
          if (["ArrowRight", "ArrowLeft"].includes(e.key)) {
            e.preventDefault();
            ref.current?.scrollBy({
              left:
                (e.key === "ArrowRight" ? 1 : -1) *
                ref.current.clientWidth *
                0.9,
              behavior: "auto",
            });
          }
        }}
      >
        {items.map((i) => (
          <div key={i.id} className="cf-slide">
            {tile(i)}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <button
          className="cf-next"
          aria-label="Next records"
          onClick={() =>
            ref.current?.scrollBy({
              left: ref.current.clientWidth * 0.9,
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            })
          }
        >
          →
        </button>
      )}
    </div>
  );
}
