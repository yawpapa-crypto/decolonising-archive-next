"use client";

import ExposureTracker from "@/components/knowledge/ExposureTracker";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { recommendationEvent, recommendationSession, readSessionIntent } from "@/lib/recommendations/client";
import { analyticsOptedOut } from "@/src/lib/analytics/client";
import { createPortal } from "react-dom";
import ForYouTile from "./ForYouTile";
import { setPending, consumePending } from "../pending-save";
import SignupGate from "../explore/SignupGate";
import Masonry from "./Masonry";
import CuratorialSuggestions from "./CuratorialSuggestions";
import Detail from "./Detail";
import CollectionPicker, { type PickList } from "./CollectionPicker";
import LineLoader from "../ui/LineLoader";
import { yearOf } from "@/lib/home/year";
import FeedDock, { DENSITY_TILE, PERIODS, type Density } from "./FeedDock";
import { dupKeys, takeFresh, type DiscoverItem } from "@/lib/home/discover-shared";

interface Batch {
  items: DiscoverItem[];
  next: number | null;
  seed: string;
  profile: { loggedIn: boolean; saves: number; interests: string[] };
}

interface Snapshot {
  items: DiscoverItem[];
  next: number | null;
  seed: string;
  saves: number;
  session: SessionSave[];
  feedback?: {more:string[];less:string[]};
  scrollY: number;
  scrollX?: number;
  extra?: number;
}

interface SessionSave {
  id: string;
  title: string;
  source?: string;
  type?: string;
}

const KEY = "ared-for-you:unsplash-v2";
const GAP = 12;
const PAD = 16;

/** Visible columns for a viewport: about 200 to 260px per tile, never fewer than 2. */
function visibleCols(w: number, tile: number) {
  return Math.max(2, Math.min(14, Math.floor((w - PAD * 2 + GAP) / (tile + GAP))));
}
const GOAL = 5;
const FILTERS: Array<{ id: string; label: string; kinds: DiscoverItem["kind"][] | null }> = [
  { id: "all", label: "All", kinds: null },
  { id: "images", label: "Images", kinds: ["image", "object"] },
  { id: "books", label: "Books", kinds: ["book"] },
  { id: "articles", label: "Articles", kinds: ["article", "chapter", "essay"] },
  { id: "collections", label: "Collections", kinds: ["collection"] },
];
const vpOf = (el: Element | null) => (el?.closest(".fy-vp") as HTMLElement | null) ?? null;

type Pop = { kind: "pick" | "why"; item: DiscoverItem; rect: DOMRect } | { kind: "bulk"; rect: DOMRect } | null;

export default function ForYouFeed({
  initialOpen,
  initial,
  canvas = false,
  endpoint = "/api/for-you",
  storageKey = KEY,
  extra,
  onboarding = true,
  toolbar = false,
  recordHeading = "Explore records",
}: {
  initial: Batch;
  /** Pan in every direction: the field also grows sideways, as the reference does. */
  canvas?: boolean;
  endpoint?: string;
  storageKey?: string;
  extra?: Record<string, unknown>;
  onboarding?: boolean;
  /** Show the record-type filter above the field. */
  toolbar?: boolean;
  recordHeading?: string;
  initialOpen?: DiscoverItem;
}) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState<{ text: React.ReactNode; href?: string; err?: boolean } | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { setPortalHost(fieldRef.current?.closest<HTMLElement>(".ared-home") ?? null); }, []);
  const [items, setItems] = useState<DiscoverItem[]>(initial.items);
  const [next, setNext] = useState<number | null>(initial.next);
  const [seed, setSeed] = useState(initial.seed);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stack, setStack] = useState<DiscoverItem[]>(initialOpen ? [initialOpen] : []);
  const [saves, setSaves] = useState(initial.profile.saves);
  const [session, setSession] = useState<SessionSave[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(initial.items.filter((i) => i.saved).map((i) => i.id)));
  const [targets, setTargets] = useState<Record<string, PickList | null>>({});
  const [pop, setPop] = useState<Pop>(null);
  const [lists, setLists] = useState<PickList[] | null>(null);
  const [loggedIn, setLoggedIn] = useState(initial.profile.loggedIn);
  const [note, setNote] = useState("");
  const [vw, setVw] = useState(1440);
  const [extraCols, setExtraCols] = useState(0);
  const [filter, setFilter] = useState("all");
  const [density, setDensity] = useState<Density>(1);
  const [imagesOnly, setImagesOnly] = useState(false);
  const [oaOnly, setOaOnly] = useState(false);
  const [period, setPeriod] = useState(0);
  const [drift, setDrift] = useState(false);
  const [busy, setBusy] = useState(false);
  const tries = useRef(0);
  const inFlight = useRef(false);
  const [restored, setRestored] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set(initial.items.flatMap(dupKeys)));
  const sessionRef = useRef<SessionSave[]>([]);
  const feedbackRef = useRef<{more:string[];less:string[]}>({more:[],less:[]});
  const seedRef = useRef(initial.seed);

  /* Restore the same feed (items, order, position) after Back; a new tab session gets a new seed. */
  useLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const snap = JSON.parse(raw) as Snapshot;
        if (snap.items?.length) {
          seen.current = new Set(snap.items.flatMap(dupKeys));
          seedRef.current = snap.seed;
          sessionRef.current = snap.session ?? [];
          feedbackRef.current = snap.feedback ?? {more:[],less:[]};
          setItems(snap.items);
          setExtraCols(snap.extra ?? 0);
          setNext(snap.next);
          setSeed(snap.seed);
          setSession(snap.session ?? []);
          setSaves(initial.profile.loggedIn ? Math.max(snap.saves, initial.profile.saves) : (snap.session ?? []).length);
          setSavedIds(new Set([...snap.items.filter((i) => i.saved).map((i) => i.id), ...(snap.session ?? []).map((s) => s.id)]));
          // The page height settles over a few frames (columns, images), so keep nudging until we arrive.
          let tries = 0;
          const sx = snap.scrollX ?? 0;
          const tick = () => {
            const vp = vpOf(fieldRef.current);
            if (vp) vp.scrollTo(sx, snap.scrollY);
            else window.scrollTo(sx, snap.scrollY);
            const cy = vp ? vp.scrollTop : window.scrollY;
            const cx = vp ? vp.scrollLeft : window.scrollX;
            if ((Math.abs(cy - snap.scrollY) > 2 || Math.abs(cx - sx) > 2) && tries++ < 40) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }
    } catch {
      /* storage unavailable: start at the top */
    }
    setRestored(true);
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, [initial.profile.loggedIn, initial.profile.saves, storageKey]);

  // Always write the latest state, never a stale closure: the snapshot is what Back restores.
  const latest = useRef({ items, next, seed, saves, session, extra: extraCols, feedback:feedbackRef.current });
  latest.current = { items, next, seed, saves, session, extra: extraCols,feedback:feedbackRef.current };
  const restoredOnce = useRef(false);
  useEffect(() => {
    let t: number | undefined;
    const vp = vpOf(fieldRef.current);
    const target: HTMLElement | Window = vp ?? window;
    const save = () => {
      if (!restoredOnce.current) return;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ ...latest.current, scrollY: vp ? vp.scrollTop : window.scrollY, scrollX: vp ? vp.scrollLeft : window.scrollX } satisfies Snapshot));
      } catch {
        /* quota */
      }
    };
    restoredOnce.current = true;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(save, 150);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      window.clearTimeout(t);
      save();
    };
  }, [storageKey]);

  useLayoutEffect(() => {
    const set = () => setVw(document.documentElement.clientWidth);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const tile = DENSITY_TILE[density];
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ared-density");
      if (raw === "0") setDensity(0);
      else if (raw === "2") setDensity(2);
    } catch {
      /* storage unavailable */
    }
    /* The account menu's Grid size control broadcasts the same setting. */
    const onSize = (e: Event) => {
      const v = (e as CustomEvent<number>).detail;
      if (v === 0 || v === 1 || v === 2) setDensity(v);
    };
    window.addEventListener("ared-density", onSize);
    return () => window.removeEventListener("ared-density", onSize);
  }, []);
  const vis = visibleCols(vw, tile);
  const colWidth = Math.floor((vw - PAD * 2 - GAP * (vis - 1)) / vis);
  const totalCols = vis + extraCols;

  const loadMore = useCallback(async () => {
    if (!restored || inFlight.current || next == null) return;
    inFlight.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: next, seed: seedRef.current, seen: [...seen.current].slice(-1600), session: sessionRef.current, sessionId: recommendationSession(), intent:readSessionIntent(), feedback: feedbackRef.current, ignoreEvents: analyticsOptedOut(), ...extra }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Batch;
      const fresh = data.items.filter((i) => takeFresh(i, seen.current));
      setItems((prev) => prev.concat(fresh));
      if (data.next == null) { seedRef.current = String(Math.floor(Math.random() * 1e9)); setNext(1); } else setNext(data.next);
      setLoggedIn(data.profile.loggedIn);
      if (data.profile.loggedIn) setSaves((s) => Math.max(s, data.profile.saves));
      setSavedIds((prev) => {
        const n = new Set(prev);
        fresh.forEach((i) => i.saved && n.add(i.id));
        return n;
      });
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [restored, next, endpoint, extra]);

  const kinds = FILTERS.find((f) => f.id === filter)?.kinds ?? null;
  const narrow = Boolean(kinds) || imagesOnly || oaOnly || period > 0;
  const inPeriod = (y: unknown) => {
    const n = yearOf(y); // reads "ca. 1850", "19th century", "1890s" and the like
    if (n == null) return false;
    return period === 1 ? n < 1900 : period === 2 ? n >= 1900 && n < 1960 : period === 3 ? n >= 1960 && n < 2000 : n >= 2000;
  };
  const visible = narrow
    ? items.filter((i) => (!kinds || kinds.includes(i.kind)) && (!imagesOnly || Boolean(i.image)) && (!oaOnly || i.oa === true) && (period === 0 || inPeriod(i.year)))
    : items;
  // A narrow filter may find little in what is loaded: keep fetching, but never forever.
  useEffect(() => {
    if (!narrow || loading || failed || next == null) return;
    if (visible.length < 24 && tries.current < 8) {
      tries.current += 1;
      void loadMore();
    }
  }, [narrow, loading, failed, next, visible.length, loadMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !restored || next == null || failed) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting) void loadMore();
    }, { root: vpOf(el), rootMargin: "1400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, next, failed, restored, items.length]);

  /* Save: in place, no navigation. Members persist it; visitors keep it for this session only. */
  const save = useCallback(
    async (item: DiscoverItem, list?: PickList | null, ensureSaved = false, quiet = false) => {
      const already = savedIds.has(item.id);
      const target = list === undefined ? targets[item.id] ?? null : list;
      if (!loggedIn) {
        setPending({ id: item.id, title: item.title, source: item.source ?? item.venue, kind: item.kind, href: item.href, year: item.year as string | undefined });
        window.dispatchEvent(new CustomEvent("ared-signup-required", { detail: { reason: "save" } }));
        return false;
      }
      // Optimistic, then confirmed by the server.
      setSavedIds((p) => {
        const n = new Set(p);
        if (already && !list && !ensureSaved) n.delete(item.id);
        else n.add(item.id);
        return n;
      });
      try {
        const res = await fetch("/api/for-you/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            source: item.source ?? item.venue,
            type: item.kind,
            year: item.year,
            href: item.href,
            image: item.image,
            downloadLocation: item.downloadLocation,
            collectionSlug: item.collectionSlug,
            listId: target?.id,
            unsave: already && !list && !ensureSaved,
          }),
        });
        if (res.status === 401) {
          setLoggedIn(false);
          setNote("Your session ended. Log in to save.");
          setSavedIds((p) => {
            const n = new Set(p);
            n.delete(item.id);
            return n;
          });
          return false;
        }
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error || ""); }
        if (!(already && !list && !ensureSaved)) setSaves((s) => (already ? s : s + 1));
        else setSaves((s) => Math.max(0, s - 1));
        setNote("");
        return true;
      } catch (e) {
        setSavedIds((p) => {
          const n = new Set(p);
          if (already) n.add(item.id);
          else n.delete(item.id);
          return n;
        });
        const msg = (e instanceof Error && e.message) || (list ? "That record could not be added to the collection. Try again." : "That save did not go through. Try again.");
        if (!quiet) { setNote(msg); setToast({ text: msg, err: true }); }
        return false;
      }
    },
    [savedIds, targets, loggedIn],
  );

  const ensureLists = useCallback(async () => {
    if (loggedIn) {
      try {
        const res = await fetch("/api/for-you/collections", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { loggedIn: boolean; lists: PickList[] };
        setLists(data.lists);
        setLoggedIn(data.loggedIn);
      } catch {
        setLists([]);
      }
    } else if (!loggedIn) setLists([]);
  }, [loggedIn]);

  const openPicker = useCallback(
    async (item: DiscoverItem, rect: DOMRect) => {
      if (!loggedIn) {
        setPending({ id: item.id, title: item.title, source: item.source ?? item.venue, kind: item.kind, href: item.href, year: item.year as string | undefined });
        window.dispatchEvent(new CustomEvent("ared-signup-required", { detail: { reason: "collection" } }));
        return;
      }
      setPop({ kind: "pick", item, rect });
      await ensureLists();
    },
    [ensureLists, loggedIn],
  );

  const createList = useCallback(async (title: string) => {
    try {
      const res = await fetch("/api/for-you/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      if (!res.ok) return null;
      const { list } = (await res.json()) as { list: PickList };
      setLists((p) => [list, ...(p ?? [])]);
      return list;
    } catch {
      return null;
    }
  }, []);

  /* Canvas: approaching the right edge adds columns, and the new columns are filled straight away. */
  useEffect(() => {
    const el = rightRef.current;
    if (!canvas || !el) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) setExtraCols((c) => Math.min(c + 3, 60));
      },
      { root: vpOf(el), rootMargin: "0px 1400px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canvas, totalCols]);

  useEffect(() => {
    if (canvas && !loading && !failed && next != null && items.length < totalCols * 8) void loadMore();
  }, [canvas, loading, failed, next, items.length, totalCols, loadMore]);

  /* Drag to pan in any direction, including one finger. A drag never counts as a click. */
  useEffect(() => {
    const el = fieldRef.current;
    if (!canvas || !el) return;
    let sx = 0;
    let sy = 0;
    let down = false;
    let moved = false;
    let active = -1;
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0 || (e.target as HTMLElement).closest("button, input, textarea, select")) return;
      down = true;
      moved = false;
      active = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== active) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true;
        el.classList.add("is-panning");
        try { el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
      }
      (vpOf(el) ?? window).scrollBy(-dx, -dy);
      sx = e.clientX;
      sy = e.clientY;
      if (e.cancelable) e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      down = false;
      active = -1;
      el.classList.remove("is-panning");
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    const noDrag = (e: Event) => e.preventDefault();
    el.addEventListener("dragstart", noDrag);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("dragstart", noDrag);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [canvas]);

  /* Shuffle: a fresh seed and a fresh first page, same personal signals. */
  const reshuffle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      const s = buf[0].toString(36).slice(0, 8);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, seed: s, seen: [], session: sessionRef.current, sessionId: recommendationSession(), intent:readSessionIntent(), feedback: feedbackRef.current, ignoreEvents: analyticsOptedOut(), ...extra }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Batch;
      seedRef.current = s;
      seen.current = new Set();
      const fresh = data.items.filter((i) => takeFresh(i, seen.current));
      setSeed(s);
      setItems(fresh);
      setNext(data.next);
      setExtraCols(0);
      tries.current = 0;
      const vp = vpOf(fieldRef.current);
      if (vp) vp.scrollTo({ left: 0, top: 0 });
      else window.scrollTo({ top: 0 });
    } catch {
      setNote("Shuffle did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, endpoint, extra]);

  /* Drift: the field glides by itself. Any touch, wheel or key hands control straight back. */
  useEffect(() => {
    if (!drift) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrift(false);
      setToast({ text: "Drift is off because your device asks for reduced motion." });
      return;
    }
    let raf = 0;
    let last = performance.now();
    // Any touch, wheel or key hands control back, except on the tool bar itself: there the Pause
    // button does the stopping, and a stray stop here would let its click switch drift back on.
    const stop = (e: Event) => {
      const t = e.target as Element | null;
      if (t && typeof t.closest === "function" && t.closest(".fy-dock")) return;
      setDrift(false);
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const vp = vpOf(fieldRef.current);
      const dx = vp ? 0.032 * dt : 0;
      const dy = (vp ? 0.026 : 0.05) * dt;
      if (vp) vp.scrollBy(dx, dy);
      else window.scrollBy(0, dy);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const evs = ["wheel", "pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    return () => {
      cancelAnimationFrame(raf);
      evs.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [drift]);

  /* Save everything currently on screen into one place. */
  useEffect(() => {
    if(!restored || busy || endpoint !== "/api/for-you") return;
    const intent=readSessionIntent();if(!intent.length)return;
    const key=`${storageKey}:applied-intent`,value=intent.join("|");
    try {if(sessionStorage.getItem(key)===value)return;sessionStorage.setItem(key,value);}catch{return;}
    void reshuffle();
  },[restored,busy,endpoint,storageKey,reshuffle]);

  const [savingView, setSavingView] = useState(false);
  const savingRef = useRef(false);
  const saveInView = useCallback(
    async (list: PickList | null) => {
      if (savingRef.current) return;
      const host = fieldRef.current;
      if (!host) return;
      if (!loggedIn) {
        window.dispatchEvent(new CustomEvent("ared-signup-required", { detail: { reason: "save" } }));
        return;
      }
      const vp = vpOf(host);
      const box = vp ? vp.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      // The header above and the tool bar below cover part of the window; only count what people can see.
      const header = document.querySelector(".ared-nav")?.getBoundingClientRect().bottom ?? 0;
      const dock = document.querySelector(".fy-bar--float")?.getBoundingClientRect().top ?? box.bottom;
      const topEdge = Math.max(box.top, header), bottomEdge = Math.min(box.bottom, dock);
      const ids = new Set<string>();
      host.querySelectorAll<HTMLElement>("[data-fy-id]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const shown = Math.min(r.bottom, bottomEdge) - Math.max(r.top, topEdge);
        if (r.right > box.left && r.left < box.right && shown > Math.min(60, r.height / 2)) ids.add(el.dataset.fyId as string);
      });
      const chosen = visible.filter((i) => ids.has(i.id) && i.kind !== "collection" && (list || !savedIds.has(i.id))).slice(0, 40);
      if (!chosen.length) {
        setToast({ text: ids.size ? "Everything in view is already saved." : "Nothing in view to save yet." });
        return;
      }
      savingRef.current = true;
      setSavingView(true);
      setToast({ text: `Saving ${chosen.length} ${chosen.length === 1 ? "record" : "records"}…` });
      let ok = 0;
      try {
        // A few at a time: quick, without flooding the server.
        for (let n = 0; n < chosen.length; n += 4) {
          const res = await Promise.all(chosen.slice(n, n + 4).map((it) => save(it, list, true, true)));
          ok += res.filter(Boolean).length;
        }
      } finally {
        savingRef.current = false;
        setSavingView(false);
      }
      const failed = chosen.length - ok;
      const what = `${ok} ${ok === 1 ? "record" : "records"}`;
      if (list && ok) {
        const cover = chosen.find((i) => i.image)?.image ?? null;
        setLists((ls) => (ls ?? []).map((l) => (l.id === list.id ? { ...l, count: l.count + ok, cover: l.cover || cover } : l)));
      }
      if (!ok) setToast({ text: "Those saves did not go through. Try again.", err: true });
      else setToast({
        text: <>Saved {what} to <b>{list ? list.title : "Saved records"}</b>{failed ? `. ${failed} did not go through.` : ""}</>,
        href: list ? `/collections/${list.id}` : "/elements",
        err: failed > 0,
      });
    },
    [visible, savedIds, save, loggedIn],
  );

  /* The large view: one history entry per object, so Back steps back through the trail. */
  const open = useCallback((item: DiscoverItem) => {
    recommendationEvent("record_open", item.id);
    history.pushState({ fy: item.id }, "");
    setStack((s) => [...s, item]);
  }, []);
  const closeTop = useCallback(() => history.back(), []);
  useEffect(() => {
    const onPop = () => setStack((s) => s.slice(0, -1));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const topItem = stack[stack.length - 1];
  /* No body scroll lock: the feed lives in its own fixed scroller and the large view in another, so the
     page behind cannot scroll anyway. An inline lock on <body> used to outlive this page and leave the
     record page unable to scroll when another modal restored the stale value. */
  useEffect(() => {
    document.body.style.removeProperty("overflow");
  }, [topItem]);

  /* Left and right arrows step through the feed from inside the large view. */
  useEffect(() => {
    if (!topItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      const list = visible.filter((i) => i.kind !== "collection");
      const at = list.findIndex((i) => i.id === topItem.id);
      const to = list[at + (e.key === "ArrowRight" ? 1 : -1)];
      if (at < 0 || !to) return;
      e.preventDefault();
      history.replaceState({ fy: to.id }, "");
      setStack((st) => [...st.slice(0, -1), to]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topItem, visible]);

  const first = Math.min(saves, GOAL);

  /* Confirm the intended save before announcing success; never toggle it off. */
  const resumedSave = useRef(false);
  useEffect(() => {
    if (!loggedIn || !restored || resumedSave.current) return;
    resumedSave.current = true;
    const p = consumePending();
    if (p) {
      void save({ ...(p as unknown as DiscoverItem), href: p.href ?? "" } as DiscoverItem, null, true)
        .then((ok) => {
          if (ok) setNote("Saved the record you chose before signing in.");
          else setPending(p); // Retry on the next visit; keep the failure message visible.
        });
    }
  }, [loggedIn, restored, save]);

  return (
    <>
      <ExposureTracker ids={items.map(i=>i.id).join("|")} />
      {!loggedIn && <SignupGate />}
      {toolbar && (
          <div className="fy-record-heading"><h2>{recordHeading}</h2><div className="fy-record-filters" role="group" aria-label="Record type">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { tries.current = 0; setFilter(f.id); }}>{f.label}</button>
            ))}
          </div></div>
        )}
      <div className="fy-bar fy-bar--float">
        <FeedDock
        density={density}
        onDensity={(d) => {
          setDensity(d);
          try {
            localStorage.setItem("ared-density", String(d));
            window.dispatchEvent(new CustomEvent("ared-density", { detail: d }));
          } catch {
            /* storage unavailable */
          }
        }}
        imagesOnly={imagesOnly}
        onImagesOnly={() => { tries.current = 0; setImagesOnly((v) => !v); }}
        period={period}
        onPeriod={() => {
          tries.current = 0;
          setPeriod((v) => (v + 1) % 5);
          // Many archive images carry no date; say so once, so a short period list does not look broken.
          if (period === 0) { try { if (!sessionStorage.getItem("ared-period-hint")) { sessionStorage.setItem("ared-period-hint", "1"); setToast({ text: "Periods show dated records only. Many archive images carry no date yet." }); } } catch { /* storage unavailable */ } }
        }}
        oaOnly={oaOnly}
        onOaOnly={() => { tries.current = 0; setOaOnly((v) => !v); }}
        drift={drift}
        onDrift={() => setDrift((v) => !v)}
        onShuffle={reshuffle}
        busy={busy}
        saving={savingView}
        onSaveView={(rect) => {
          if (!loggedIn) { window.dispatchEvent(new CustomEvent("ared-signup-required", { detail: { reason: "save" } })); return; }
          setPop({ kind: "bulk", rect });
          void ensureLists();
        }}
      />
      </div>

      <div ref={fieldRef} className={canvas ? "fy-canvas" : undefined}>
      <Masonry
        items={visible}
        tile={tile}
        fixed={canvas ? { cols: totalCols, colWidth } : undefined}
        leading={!onboarding ? undefined : {
          ratio: 0.98,
          node: (
            <div className="fy-onboard" style={{ aspectRatio: "0.98" }}>
              <span className="fy-onboard__icon" aria-hidden>
                <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M5.5 3.5h9v13L10 13l-4.5 3.5z" /></svg>
              </span>
              <p className="fy-onboard__title">{saves >= GOAL ? "Your feed is adapting" : <>Save knowledge<br />to shape your feed</>}</p>
              <div className="fy-onboard__foot">
                <p className="fy-onboard__count" role="status"><strong>{first}</strong> of {GOAL}</p>
                <div className="fy-onboard__bars" aria-hidden>
                  {Array.from({ length: GOAL }, (_, n) => (
                    <span key={n} className={n < first ? "is-on" : ""} />
                  ))}
                </div>
              </div>
            </div>
          ),
        }}
        render={(item, index, cols) => (
          <ForYouTile
            key={`${item.id}:${index}`}
            item={item}
            priority={index < cols * 2}
            saved={savedIds.has(item.id)}
            target={targets[item.id]?.title ?? "Collection"}
            onSave={(it) => save(it)}
            onPick={openPicker}
            onWhy={(it, rect) => setPop({ kind: "why", item: it, rect })}
            onOpen={open}
          />
        )}
      />
      {canvas && <div ref={rightRef} aria-hidden className="fy-rsent" />}
      </div>

      {topItem && portalHost && createPortal(
        <Detail
          key={`${stack.length}:${topItem.id}`}
          item={topItem}
          savedIds={savedIds}
          targets={targets}
          onSave={(it) => save(it)}
          onPick={openPicker}
          onWhy={(it, rect) => setPop({ kind: "why", item: it, rect })}
          onOpen={open}
          onClose={closeTop}
        />, portalHost
      )}

      {pop?.kind === "pick" && portalHost && createPortal(
        <CollectionPicker
          rect={pop.rect}
          loggedIn={loggedIn}
          lists={lists}
          itemTitle={pop.item.title}
          current={targets[pop.item.id]?.id ?? (savedIds.has(pop.item.id) ? null : "__none__")}
          onClose={() => setPop(null)}
          onChoose={(list) => {
            const item = pop.item;
            setTargets((t) => ({ ...t, [item.id]: list }));
            setPop(null);
            void save(item, list, true).then((ok) => {
              if (!ok) return;
              if (list) {
                setLists((ls) => (ls ?? []).map((l) => (l.id === list.id ? { ...l, count: l.count + 1, cover: l.cover || item.image || null } : l)));
                setToast({ text: <>Added to <b>{list.title}</b></>, href: `/collections/${list.id}` });
              } else setToast({ text: <>Saved to <b>Saved records</b></>, href: "/elements" });
            });
          }}
          onCreate={createList}
        />, portalHost
      )}
      {pop?.kind === "bulk" && portalHost && createPortal(
        <CollectionPicker
          rect={pop.rect}
          loggedIn={loggedIn}
          lists={lists}
          current={null}
          onClose={() => setPop(null)}
          onChoose={(list) => {
            setPop(null);
            void saveInView(list);
          }}
          onCreate={createList}
        />, portalHost
      )}
      {pop?.kind === "why" && portalHost && createPortal(
        <div className="fy-why" tabIndex={-1} ref={node=>node?.focus()} onKeyDown={e=>{if(e.key==="Escape")setPop(null);}} role="dialog" aria-label="Recommendation context" style={{ left: Math.max(8, Math.min(pop.rect.left - 200, window.innerWidth - 268)), top: Math.max(112,Math.min(pop.rect.bottom + 8, window.innerHeight - 380)) }}>
          <strong>Why this?</strong>
          <p>{pop.item.why}</p>
          {endpoint === "/api/for-you" && <div className="fy-feedback">
            <button type="button" onClick={() => {
              recommendationEvent("more", pop.item.id);
              feedbackRef.current.more = [...new Set([...feedbackRef.current.more, pop.item.id])].slice(-50);
              feedbackRef.current.less = feedbackRef.current.less.filter(id=>id!==pop.item.id);
              setNote("We’ll use this choice for your next recommendations."); setPop(null);
            }}>More like this</button>
            <button type="button" onClick={() => {
              recommendationEvent("less", pop.item.id);
              feedbackRef.current.less = [...new Set([...feedbackRef.current.less, pop.item.id])].slice(-50);
              feedbackRef.current.more = feedbackRef.current.more.filter(id=>id!==pop.item.id);
              setItems(items=>items.filter(item=>item.id!==pop.item.id));
              setNote("Shown less often. This won’t exclude a whole region or subject."); setPop(null);
            }}>Less like this</button>
          </div>}

          {loggedIn && endpoint === "/api/for-you" && <CuratorialSuggestions />}
          <button type="button" className="fy-pill fy-pill--save" onClick={() => setPop(null)}>Close</button>
        </div>, portalHost
      )}
      {toast && portalHost && createPortal(
        <div className={`cz-toast${toast.err ? " is-err" : ""}`} role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.href && <a href={toast.href}>View</a>}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
        </div>, portalHost
      )}


      {!loggedIn && !extra?.q && items.length >= 60 && (
        <aside className="fy-make" aria-labelledby="fy-make-t">
          <h3 id="fy-make-t">Make this yours</h3>
          <p>Choose a few interests and ARED can shape your For You feed around what you want to explore.</p>
          <a href="/signup?next=%2Fhome-next%2Fonboarding%3Fnext%3D%252Fhome-next%252Ffor-you" className="fy-make__btn">Personalise For You</a>
        </aside>
      )}
      {narrow && !visible.length && !loading && (failed || tries.current >= 8) && (
        <div className="fy-empty" role="status">
          <p>Nothing here matches {[imagesOnly && "With images", oaOnly && "Open access", period > 0 && PERIODS[period], kinds && FILTERS.find((f) => f.id === filter)?.label].filter(Boolean).join(" + ")} yet.</p>
          <button type="button" className="cz-btn" onClick={() => { tries.current = 0; setImagesOnly(false); setOaOnly(false); setPeriod(0); setFilter(FILTERS[0].id); }}>Clear filters</button>
        </div>
      )}
      <div ref={sentinel} aria-hidden className="fy-sentinel" />
      <p className="fy-note" role="status">
        {loading && <LineLoader inline size={22} label="Loading more" />}
        {failed && (
          <>
            That batch did not arrive. <button type="button" className="fy-link" onClick={loadMore}>Try again</button>
          </>
        )}
        {!loading && !failed && note}
        
      </p>
    </>
  );
}
