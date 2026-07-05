"use client";

import Link from "next/link";
import { PUBLIC_COLLECTIONS } from "@/lib/data/public-collections";
import "@/app/styles/collections-hub.css";

export default function CollectionsHubClient() {
  return (
    <div className="collections-hub">
      <section className="collections-hub-hero">
        <p className="collections-hub-hero-kicker">Decolonising Archive</p>
        <h1 className="collections-hub-hero-title">Collections</h1>
        <p className="collections-hub-hero-desc">
          Research catalogues, verified museum records and open cultural gateways — each collection
          documents visual communication history with cited sources and labelled interpretation.
        </p>
      </section>

      <section className="collections-hub-section collections-hub-section--blue">
        <h2 className="collections-hub-section-title">Browse all</h2>
        <div className="collections-hub-grid">
          {PUBLIC_COLLECTIONS.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              large={collection.featured}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function CollectionCard({
  collection,
  large = false,
}: {
  collection: (typeof PUBLIC_COLLECTIONS)[number];
  large?: boolean;
}) {
  return (
    <Link
      href={collection.href}
      className={`collections-hub-card${large ? " collections-hub-card--large" : ""}`}
      style={{ "--collection-accent": collection.accent } as React.CSSProperties}
    >
      <div className="collections-hub-card-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={collection.imageUrl} alt="" />
        <span className="collections-hub-card-caption">{collection.imageCaption}</span>
      </div>
      <div className="collections-hub-card-body">
        <span className="collections-hub-card-kicker">{collection.kicker}</span>
        <h3 className="collections-hub-card-title">{collection.title}</h3>
        <p className="collections-hub-card-desc">{collection.description}</p>
        {collection.recordCount && (
          <span className="collections-hub-card-stat">{collection.recordCount}</span>
        )}
        <span className="collections-hub-card-cta">Enter collection →</span>
      </div>
    </Link>
  );
}
