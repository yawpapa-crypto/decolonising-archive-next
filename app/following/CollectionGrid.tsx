import Link from "next/link";

export type CGItem = { key: string; href: string; title: string; sub: string; cover: string | null };

/** Cosmos-style collection grid: square cover, title, element count. */
export default function CollectionGrid({ items, empty }: { items: CGItem[]; empty?: string }) {
  if (!items.length) return <p className="cf-sample">{empty ?? "No public collections yet."}</p>;
  return (
    <ul className="cf-cgrid">
      {items.map((c) => (
        <li key={c.key}>
          <Link href={c.href}>
            <span className="cf-cgrid__cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.cover ? <img src={c.cover} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" /> : <i aria-hidden>{c.title[0]}</i>}
            </span>
            <strong>{c.title}</strong>
            <em>{c.sub}</em>
          </Link>
        </li>
      ))}
    </ul>
  );
}
