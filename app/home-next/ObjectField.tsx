"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { CollageTile } from "@/lib/home/home-collage";
import { useScope } from "./Scope";
import { HERO, REST, type FieldObject } from "./objects";
import { cachedImageSrc } from "@/lib/home/cached-image";
import { fallbackFor } from "@/lib/home/fallback-images";

function interleave(a: CollageTile[], b: CollageTile[]) {
  const out: CollageTile[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}


/** One tile. Walks its own list of spare images if one fails; reports when none work. */
function Tile({ tile, srcs, eager, w, onDead }: { tile: CollageTile; srcs: string[]; eager: boolean; w: number; onDead: () => void }) {
  const [i, setI] = useState(0);
  const src = srcs[i];
  const external = tile.href.startsWith("http");
  const common = { className: "ared-obj__tile", tabIndex: -1, title: `${tile.title} · ${tile.source}` };
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cachedImageSrc(src)}
      alt=""
      sizes={`${Math.round(w * 1.5)}px`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => {
        if (i + 1 < srcs.length) setI(i + 1);
        else onDead();
      }}
    />
  );
  const media = external ? <a href={tile.href} target="_blank" rel="noopener noreferrer" {...common}>{img}</a> : <Link href={tile.href} {...common}>{img}</Link>;
  return media;

}

/**
 * The archive objects for the whole page. Hero objects live in a clipped band and flow
 * upward (see HomeMotion); the rest sit in page coordinates behind later sections.
 * Each object gets its own image: when the pool is smaller than the number of objects,
 * objects are thinned evenly rather than repeating a picture. Decorative duplicates of
 * records, so hidden from assistive tech and out of the tab order.
 */
export default function ObjectField({ local, global }: { local: CollageTile[]; global: CollageTile[] }) {
  const { scope } = useScope();
  const [rotation,setRotation]=useState(0);
  useEffect(()=>setRotation(Math.floor(Math.random()*10000)),[]);
  const [dead, setDead] = useState<ReadonlySet<string>>(new Set());

  const pool = useMemo(() => {
    const base = scope === "local" ? local : scope === "global" ? global : interleave(local, global);
    const list = base.length ? base : [...local, ...global];
    const seen = new Set<string>();
    const unique = list.filter((t) => (seen.has(t.src) ? false : (seen.add(t.src), true)));
    const offset=rotation % Math.max(1,unique.length);
    return [...unique.slice(offset),...unique.slice(0,offset)];
  }, [scope, local, global, rotation]);

  const markDead = useCallback((key: string) => setDead((p) => (p.has(key) ? p : new Set(p).add(key))), []);

  if (!pool.length) return null;
  const n = pool.length;

  /** Pool index for object j of a group, or -1 when thinned. Each group avoids repeating a picture within itself. */
  const slot = (j: number, count: number, offset: number) => {
    if (n >= count) return (offset + j) % n;
    const a = Math.floor((j * n) / count);
    const b = Math.floor(((j - 1) * n) / count);
    return j === 0 || a !== b ? a : -1;
  };

  const render = (o: FieldObject, g: number, hero: boolean) => {
    const idx = hero ? slot(g, HERO.length, 0) : slot(g - HERO.length, REST.length, HERO.length);
    if (idx < 0) return null;
    const key = `${scope}-${g}`;
    if (dead.has(key)) return null;
    const tile = pool[idx];
    const spares = tile.source === "Unsplash" ? [] : [1, 2, 3].map((k) => pool[(idx + k * 5 + 7) % n]).filter(t => t.source !== "Unsplash").map(t => t.src);
    const srcs = [tile.src, ...spares.filter((s) => s !== tile.src), fallbackFor(tile.id)];
    const style = {
      "--x": o.x,
      "--y": o.y,
      "--w": o.w,
      "--ar": o.ar,
      "--r": `${o.r}deg`,
      "--o": o.o,
      ...(o.m ? { "--mx": o.m[0], "--my": o.m[1], "--mw": o.m[2] } : {}),
      "--dur": `${16 + (g % 7) * 2.5}s`,
      "--delay": `${-(g * 1.7)}s`,
    } as CSSProperties;
    return (
      <div
        key={key}
        className="ared-obj"
        style={style}
        data-speed={o.s}
        data-depth={o.d}
        data-from={o.from}
        data-m={o.m ? "1" : "0"}
      >
        <div className="ared-obj__p">
          <div className="ared-obj__d">
            <Tile tile={tile} srcs={srcs} eager={hero} w={o.w} onDead={() => markDead(key)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="ared-field ared-field--hero" aria-hidden="true">
        {HERO.map((o, i) => render(o, i, true))}
      </div>
      <div className="ared-field" aria-hidden="true">
        {REST.map((o, i) => render(o, HERO.length + i, false))}
      </div>
    </>
  );
}
