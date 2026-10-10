"use client";

import { useState } from "react";
import { fallbackFor } from "@/lib/home/fallback-images";
import { cachedImageSrc } from "@/lib/home/cached-image";

/** Tries each candidate source in turn; renders nothing if all fail, so no broken-image icons ever show. */
export default function SafeImg({
  srcs,
  alt = "",
  className,
  eager = false,
  sizes,
}: {
  srcs: string[];
  alt?: string;
  className?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [i, setI] = useState(0);
  const list = [...srcs.filter(Boolean), fallbackFor(srcs[0] ?? "x")];
  const src = list[i];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cachedImageSrc(src)}
      alt={alt}
      sizes={sizes}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setI((n) => n + 1)}
    />
  );
}
