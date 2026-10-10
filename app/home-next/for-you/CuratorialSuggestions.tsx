"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Suggestions = {
  profiles: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; title: string; why: string }>;
};
export default function CuratorialSuggestions() {
  const [data, setData] = useState<Suggestions | null>(null);
  useEffect(() => {
    let active = true;
    void fetch("/api/recommendations/suggestions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!data || (!data.profiles.length && !data.collections.length)) return null;
  return (
    <section className="fy-suggested">
      <h3>Related curations</h3>
      {data.profiles.map((p) => (
        <p key={p.id}>
          <Link href={`/people/${p.id}`}>{p.name} ↗</Link>
        </p>
      ))}
      {data.collections.map((c) => (
        <p key={c.id}>
          <Link href={`/c/${c.id}`}>{c.title} ↗</Link>
          <small>{c.why}</small>
        </p>
      ))}
    </section>
  );
}
