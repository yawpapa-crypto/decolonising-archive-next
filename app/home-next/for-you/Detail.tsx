"use client";

import ProposeDialog from "../contribute/ProposeDialog";
import LineLoader from "../ui/LineLoader";
import { useCallback, useEffect, useRef, useState } from "react";
import { recommendationEvent } from "@/lib/recommendations/client";
import Link from "next/link";
import CitationTools from "@/components/knowledge/CitationTools";
import ShareButton from "../ShareButton";
import ForYouTile from "./ForYouTile";
import Masonry from "./Masonry";
import { dupKeys, takeFresh, type DiscoverItem } from "@/lib/home/discover-shared";
import type { TileProps } from "./ForYouTile";

type Handlers = Pick<TileProps, "onSave" | "onPick" | "onWhy">;

interface Props extends Handlers {
  item: DiscoverItem;
  savedIds: Set<string>;
  targets: Record<string, { title: string } | null>;
  onOpen: (item: DiscoverItem) => void;
  onClose: () => void;
}

/**
 * The large view. As in the reference, opening an object puts it centre stage and
 * immediately lays out similar objects beneath it; choosing one of those continues the trail.
 */
export default function Detail({ item, savedIds, targets, onSave, onPick, onWhy, onOpen, onClose }: Props) {
  const [similar, setSimilar] = useState<DiscoverItem[]>([]);
  const [next, setNext] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const seen = useRef(new Set<string>(dupKeys(item)));
  const sentinel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const saved = savedIds.has(item.id);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (loading || next == null) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/for-you/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: { id: item.id, title: item.title, authors: item.authors, venue: item.venue, source: item.source }, page: next, seen: [...seen.current].slice(-1200) }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items: DiscoverItem[]; next: number | null };
      const fresh = data.items.filter((i) => takeFresh(i, seen.current));
      setSimilar((p) => p.concat(fresh));
      setNext(data.next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, next, item]);

  useEffect(() => {
    const el = sentinel.current;
    const root = scroller.current;
    if (!el || !root || next == null || failed) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) void load();
      },
      { root, rootMargin: "1200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load, next, failed]);

  useEffect(() => {
    const dialog = scroller.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const background = Array.from(dialog?.parentElement?.children ?? [])
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== dialog && el.matches("main, header"));
    const prior = background.map(el => el.inert);
    background.forEach(el => { el.inert = true; });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialog) return;
      const targets = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input, [tabindex='0']"))
        .filter(el => el.getClientRects().length > 0);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    dialog?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      background.forEach((el, i) => { el.inert = prior[i]; });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  const meta = [item.authors, item.venue, item.year].filter(Boolean);
  const internal = !item.external;

  return (
    <div className="fy-detail" role="dialog" aria-modal="true" aria-label={item.title} ref={scroller} tabIndex={-1}>
      <button type="button" className="fy-detail__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg>
      </button>

      <div className="fy-detail__main">
        <div className="fy-detail__visual">
          <ForYouTile item={item} bare priority saved={false} target="" onSave={onSave} onPick={onPick} onWhy={onWhy} />
        </div>
        <div className="fy-detail__info">
          <p className="fy-detail__kind">{item.kind === "object" ? "Object" : item.kind[0].toUpperCase() + item.kind.slice(1)}{item.source ? ` · ${item.source}` : ""}</p>
          <h2 className="fy-detail__title">{item.title}</h2>
          {meta.length > 0 && <p className="fy-detail__meta">{meta.join(" · ")}</p>}
          {item.source === "Europeana" && <div className="fy-detail__meta">
            {item.institution?.length ? <p>Holding institution / data provider: {item.institution.join("; ")}</p> : null}
            {item.provider?.length ? <p>Aggregator provider: {item.provider.join("; ")}</p> : null}
            {item.country?.length ? <p>Provider country: {item.country.join("; ")}</p> : null}
            <p>Rights: {item.rights?.length ? item.rights.map((right, index) => <span key={right}>{index > 0 ? "; " : ""}<a href={/^https?:\/\//i.test(right) ? right : undefined} target="_blank" rel="noopener noreferrer">{right}</a></span>) : "Not supplied by the provider"}</p>
            <p>Discovery preview · original archival resource may have different access conditions.</p>
            {item.originalRecordUrl && <a href={item.originalRecordUrl} target="_blank" rel="noopener noreferrer">Original institution record ↗</a>}
          </div>}
          {item.abstract && <p className="fy-detail__abs">{item.abstract}…</p>}
          <div className="fy-detail__actions">
            <button type="button" className={`fy-pill fy-pill--save fy-pill--lg${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={() => onSave(item)}>
              {saved ? "Saved" : "Save"}
            </button>
            <button type="button" className="fy-pill fy-pill--outline fy-pill--lg" aria-haspopup="dialog" onClick={(e) => onPick(item, e.currentTarget.getBoundingClientRect())}>
              {targets[item.id]?.title ?? "Add to collection"}
            </button>
            <button
              type="button"
              className="fy-pill fy-pill--outline fy-pill--lg"
              onClick={async () => {
                const url = item.external ? item.href : `${window.location.origin}${item.href}`;
                const cite = `${item.authors ? `${item.authors} ` : ""}${item.year ? `(${item.year}). ` : ""}${item.title}.${item.venue || item.source ? ` ${item.venue ?? item.source}.` : ""} ${url}`.trim();
                try {
                  await navigator.clipboard.writeText(cite);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                } catch {
                  /* clipboard unavailable */
                }
              }}
            >
              {copied ? "Citation copied" : "Copy citation"}
            </button>
            <ShareButton url={item.external ? item.href : item.href} title={item.title} text={item.authors ? `${item.title}, ${item.authors}` : item.title} className="fy-pill fy-pill--outline fy-pill--lg" />
            {internal ? (
              <Link href={item.href} className="fy-pill fy-pill--outline fy-pill--lg">Open record</Link>
            ) : (
              <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={()=>recommendationEvent("source_open",item.id)} className="fy-pill fy-pill--outline fy-pill--lg">Open at source ↗</a>
            )}
          </div>
          <CitationTools id={item.id} item={{ id: item.id, title: item.title, authors: item.authors, year: item.year, source: item.source ?? item.venue, url: item.external ? item.href : (typeof window !== "undefined" ? new URL(item.href, window.location.origin).toString() : item.href) }} />
          <ProposeDialog record={item.id} className="fy-detail__propose" />
          {item.photographer && item.credit && <p className="fy-detail__meta">Photo by <a href={item.credit}>{item.photographer}</a> on <a href="https://unsplash.com/?utm_source=decolonising_archive&utm_medium=referral">Unsplash</a></p>}
          {item.why && <p className="fy-detail__why">{item.why}</p>}
          <p className="fy-detail__hint">Use the left and right arrow keys to move through the feed.</p>
        </div>
      </div>

      <h3 className="fy-detail__more">More like this</h3>
      <div className="fy-detail__grid">
        <Masonry
          items={similar}
          render={(it, i) => (
            <ForYouTile
              key={it.id}
              item={it}
              priority={i < 8}
              saved={savedIds.has(it.id)}
              target={targets[it.id]?.title ?? "Collection"}
              onSave={onSave}
              onPick={onPick}
              onWhy={onWhy}
              onOpen={(related)=>{recommendationEvent("related_record_open",related.id);onOpen(related);}}
            />
          )}
        />
      </div>
      <div ref={sentinel} aria-hidden className="fy-sentinel" />
      <p className="fy-note" role="status">
        {loading && <LineLoader inline size={22} label="Finding similar records" />}
        {failed && (
          <>
            That did not load. <button type="button" className="fy-link" onClick={load}>Try again</button>
          </>
        )}
        {!loading && !failed && next == null && (similar.length ? "That is everything similar for now." : "Nothing similar turned up yet.")}
      </p>
    </div>
  );
}
