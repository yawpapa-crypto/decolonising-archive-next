"use client";
import { useState } from "react";
import type { AuthPhoto } from "@/lib/home/for-you";

/** Shows the first three images that actually load. Dead links are skipped, so the panel is never empty. */
export default function CollageClient({ photos }: { photos: AuthPhoto[] }) {
  const [dead, setDead] = useState<Set<string>>(new Set());
  const live = photos.filter((p) => !dead.has(p.id)).slice(0, 3);
  return (
    <aside className="signup-collage" aria-label="A world of knowledge">
      <div className="signup-images">
        {live.map((p, i) => (
          <figure className={`signup-photo signup-photo--${i}`} key={p.id}>
            <div className="signup-photo-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={() => setDead((s) => new Set(s).add(p.id))} />
            </div>
            {p.credit && <figcaption>Photo by <a href={p.credit.url}>{p.credit.name}</a> on <a href="https://unsplash.com/?utm_source=decolonising_archive&utm_medium=referral">Unsplash</a></figcaption>}
          </figure>
        ))}
      </div>
      <p className="signup-caption">Knowledge, culture, and the connections between them.</p>
    </aside>
  );
}
