"use client";
import { useEffect, useRef, useState } from "react";
import { cachedImageSrc } from "@/lib/home/cached-image";
import { fallbackFor } from "@/lib/home/fallback-images";

/** Swaps in a local fallback photograph when the image fails, including failures that happened before hydration. */
export default function SafeImg({ src, alt = "", className, loading }: { src: string; alt?: string; className?: string; loading?: "lazy" | "eager" }) {
  const [cur, setCur] = useState(src);
  const el = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setCur(src);
  }, [src]);
  useEffect(() => {
    const i = el.current;
    if (i && i.complete && i.naturalWidth === 0 && !cur.startsWith("/images/fallback/")) setCur(fallbackFor(src));
  }, [cur, src]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={el} src={cachedImageSrc(cur)} alt={alt} className={className} loading={loading} referrerPolicy="no-referrer" onError={() => { if (!cur.startsWith("/images/fallback/")) setCur(fallbackFor(src)); }} />;
}
