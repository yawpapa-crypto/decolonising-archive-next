"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import ForYouTile from "@/app/home-next/for-you/ForYouTile";
import SignupGate from "@/app/home-next/explore/SignupGate";
import { setPending, consumePending } from "@/app/home-next/pending-save";
import Detail from "@/app/home-next/for-you/Detail";
import CollectionPicker, {
  type PickList,
} from "@/app/home-next/for-you/CollectionPicker";
import type { DiscoverItem } from "@/lib/home/discover-shared";
export default function RecordSurface({
  children,
}: {
  children: (tile: (item: DiscoverItem) => ReactNode) => ReactNode;
}) {
  const modalEntry = useRef(false);
  const [open, setOpen] = useState<DiscoverItem | null>(null),
    [saved, setSaved] = useState(new Set<string>()),
    [targets, setTargets] = useState<Record<string, { id?: string; title: string } | null>>(
      {},
    ),
    [pick, setPick] = useState<{ item: DiscoverItem; rect: DOMRect } | null>(
      null,
    ),
    [lists, setLists] = useState<PickList[] | null>(null),
    [loggedIn, setLoggedIn] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/for-you/elements")
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        if (active) {
          setLoggedIn(true);
          const ids = new Set<string>(
            (d.items ?? []).map((i: { record_id: string }) => i.record_id),
          );
          setSaved(ids);
          const pending = consumePending();
          if (pending) {
            const response = await fetch("/api/for-you/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...pending, type: pending.kind }),
            });
            if (response.ok && active)
              setSaved((p) => new Set(p).add(pending.id));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const back = () => {
      modalEntry.current = false;
      setOpen(null);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  function show(item: DiscoverItem) {
    if (!modalEntry.current) {
      history.pushState(
        { ...history.state, aredCuratorialRecord: true },
        "",
        location.href,
      );
      modalEntry.current = true;
    }
    setOpen(item);
  }
  function close() {
    setOpen(null);
    if (modalEntry.current) {
      modalEntry.current = false;
      history.back();
    }
  }
  async function save(item: DiscoverItem, list?: PickList | null) {
    const r = await fetch("/api/for-you/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        title: item.title,
        source: item.source,
        type: item.kind,
        year: item.year,
        href: item.href,
        image: item.image,
        collectionSlug: item.collectionSlug,
        listId: list?.id,
        unsave: list === undefined && saved.has(item.id),
      }),
    }).catch(() => null);
    if (!r) {
      setMessage("Could not save this record. Please try again.");
      return;
    }
    if (r.status === 401) {
      setPending(item);
      window.dispatchEvent(
        new CustomEvent("ared-signup-required", {
          detail: { reason: list ? "collection" : "save" },
        }),
      );
      return;
    }
    if (!r.ok) {
      setMessage("Could not save this record. Please try again.");
      return;
    }
    setSaved((p) => {
      const n = new Set(p);
      if (list === undefined && p.has(item.id)) n.delete(item.id);
      else n.add(item.id);
      return n;
    });
    setTargets((p) => ({
      ...p,
      [item.id]: list ? { id: list.id, title: list.title } : null,
    }));
    setMessage("Record saved.");
  }
  async function choose(item: DiscoverItem, rect: DOMRect) {
    setPick({ item, rect });
    const r = await fetch("/api/for-you/collections").catch(() => null);
    if (r?.ok) {
      const d = await r.json();
      setLists(d.lists);
      setLoggedIn(d.loggedIn);
      if (!d.loggedIn) {
        setPending(item);
        setPick(null);
        window.dispatchEvent(
          new CustomEvent("ared-signup-required", {
            detail: { reason: "collection" },
          }),
        );
      }
    }
  }
  const tile = (item: DiscoverItem) => (
    <ForYouTile
      key={item.id}
      item={item}
      saved={saved.has(item.id)}
      target={targets[item.id]?.title ?? "Saved"}
      onSave={(i) => void save(i)}
      onPick={(i, r) => void choose(i, r)}
      onWhy={() => {}}
      onOpen={show}
    />
  );
  return (
    <>
      <SignupGate />
      {children(tile)}
      <p className="cf-sr" role="status">
        {message}
      </p>
      {open && (
        <Detail
          item={open}
          savedIds={saved}
          targets={targets}
          onSave={(i) => void save(i)}
          onPick={(i, r) => void choose(i, r)}
          onWhy={() => {}}
          onOpen={show}
          onClose={close}
        />
      )}{" "}
      {pick && (
        <CollectionPicker
          rect={pick.rect}
          loggedIn={loggedIn}
          lists={lists}
          current={targets[pick.item.id]?.id ?? null}
          onClose={() => setPick(null)}
          onChoose={(l) => {
            void save(pick.item, l);
            setPick(null);
          }}
          onCreate={async (title) => {
            const r = await fetch("/api/for-you/collections", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });
            if (!r.ok) return null;
            const d = await r.json();
            return d.list;
          }}
        />
      )}
    </>
  );
}
