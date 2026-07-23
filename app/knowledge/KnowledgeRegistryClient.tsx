"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { KnowledgeRecord } from "@/src/lib/knowledge-registry";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_REGIONS,
  getBrowseIndex,
  getRegistryStats,
  slugifyRegistryValue,
} from "@/src/lib/knowledge-registry";
import "@/app/styles/knowledge/knowledge-registry.css";

type ViewMode = "grid" | "list" | "map" | "relational";

const viewModes: { id: ViewMode; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "map", label: "Map" },
  { id: "relational", label: "Relational" },
];

function statusLabel(status: KnowledgeRecord["verificationStatus"]) {
  if (status === "community-verified") return "Community verified";
  if (status === "source-supported") return "Source supported";
  return "Review needed";
}

function accessLabel(status: KnowledgeRecord["culturalAccess"]) {
  if (status === "open-summary") return "Open summary";
  if (status === "context-required") return "Context required";
  return "Restricted knowledge";
}

export default function KnowledgeRegistryClient({
  records,
  initialView = "grid",
}: {
  records: KnowledgeRecord[];
  initialView?: ViewMode;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const stats = getRegistryStats();

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          record.title,
          record.preferredTitle,
          record.type,
          record.summary,
          record.region,
          record.subregion,
          ...record.community,
          ...record.languages,
          ...record.countries,
          ...record.categories,
          ...record.relationships,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesRegion = region === "all" || record.region === region;
      const matchesCategory =
        category === "all" || record.categories.includes(category);

      return matchesQuery && matchesRegion && matchesCategory;
    });
  }, [category, query, records, region]);

  const featuredRecords = records.slice(0, 3);
  const sourceTypes = getBrowseIndex("relationships").slice(0, 7);

  return (
    <div className="knowledge-registry">
      <section className="knowledge-hero">
        <div className="knowledge-hero__copy">
          <p className="knowledge-kicker">ARED public registry</p>
          <h1>Global Knowledge Systems</h1>
          <p>
            Explore living, historical and evolving systems of knowledge across
            communities, languages, territories and diasporas. Each record
            connects cultural practice to its people, places, sources, authority
            and conditions of access.
          </p>
          <div className="knowledge-hero__actions">
            <a href="#registry-results">Explore records</a>
            <Link href="/sources">Explore sources</Link>
          </div>
        </div>
        <div className="knowledge-hero__panel" aria-label="Registry coverage">
          <strong>{stats.records}</strong>
          <span>public knowledge system records</span>
          <dl>
            <div>
              <dt>Communities</dt>
              <dd>{stats.communities}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{stats.languages}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{stats.sources}</dd>
            </div>
            <div>
              <dt>Review needed</dt>
              <dd>{stats.reviewNeeded}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="knowledge-search-panel" aria-label="Search knowledge systems">
        <div className="knowledge-search-panel__head">
          <div>
            <p className="knowledge-kicker">Search the registry</p>
            <h2>Find knowledge systems by place, practice, language or source.</h2>
          </div>
          <span>{filteredRecords.length} matching records</span>
        </div>
        <div className="knowledge-search-card">
          <label className="knowledge-search-field" htmlFor="knowledge-search">
            <span>Search</span>
            <input
              id="knowledge-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try weaving, navigation, Akan, ceremony, Ghana..."
            />
          </label>
          <label className="knowledge-filter-field">
            <span>Region</span>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              aria-label="Filter by region"
            >
              <option value="all">All regions</option>
              {KNOWLEDGE_REGIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="knowledge-filter-field">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {KNOWLEDGE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="knowledge-browse-section" aria-label="Browse registry">
        <div className="knowledge-browse-section__head">
          <div>
            <p className="knowledge-kicker">Browse pathways</p>
            <h2>Explore the registry from multiple entry points.</h2>
          </div>
          <Link href="/knowledge/map">Open map</Link>
        </div>
        <div className="knowledge-browse-grid">
          <BrowsePanel title="Regions" href="/knowledge/regions" items={getBrowseIndex("regions").slice(0, 8)} />
        <BrowsePanel
          title="Communities"
          href="/knowledge/communities"
          items={getBrowseIndex("communities").slice(0, 7)}
        />
        <BrowsePanel
          title="Languages"
          href="/knowledge/languages"
          items={getBrowseIndex("languages").slice(0, 7)}
        />
        <BrowsePanel
          title="Categories"
          href="/knowledge/categories"
          items={getBrowseIndex("categories").slice(0, 7)}
        />
        <BrowsePanel
          title="Relationships"
          href="/knowledge/relationships"
          items={sourceTypes}
        />
        </div>
      </section>

      <section className="knowledge-section">
        <div className="knowledge-section__head">
          <div>
            <p className="knowledge-kicker">Featured records</p>
            <h2>Start with reviewed public summaries</h2>
          </div>
          <Link href="/knowledge/map">Open map view</Link>
        </div>
        <div className="knowledge-featured-grid">
          {featuredRecords.map((record) => (
            <KnowledgeCard key={record.slug} record={record} featured />
          ))}
        </div>
      </section>

      <section className="knowledge-section" id="registry-results">
        <div className="knowledge-section__head">
          <div>
            <p className="knowledge-kicker">All records</p>
            <h2>{filteredRecords.length} knowledge systems</h2>
          </div>
          <div className="knowledge-view-toggle" role="tablist" aria-label="View mode">
            {viewModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={viewMode === mode.id ? "is-active" : ""}
                onClick={() => setViewMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        {viewMode === "grid" ? (
          <div className="knowledge-card-grid">
            {filteredRecords.map((record) => (
              <KnowledgeCard key={record.slug} record={record} />
            ))}
          </div>
        ) : null}
        {viewMode === "list" ? (
          <div className="knowledge-list">
            {filteredRecords.map((record) => (
              <KnowledgeListRow key={record.slug} record={record} />
            ))}
          </div>
        ) : null}
        {viewMode === "map" ? <RegistryMap records={filteredRecords} /> : null}
        {viewMode === "relational" ? (
          <RelationalView records={filteredRecords} />
        ) : null}
      </section>

      <section className="knowledge-limitations">
        <div>
          <p className="knowledge-kicker">Coverage and care</p>
          <h2>This registry is curated, not exhaustive</h2>
        </div>
        <p>
          Records are published as public discovery metadata. They do not grant
          permission to reproduce restricted knowledge, ceremonial practice,
          language materials or community-controlled interpretation. Entries
          marked review needed should be treated as invitations for community
          correction and fuller source review.
        </p>
      </section>
    </div>
  );
}

export function KnowledgeCard({
  record,
  featured = false,
}: {
  record: KnowledgeRecord;
  featured?: boolean;
}) {
  return (
    <article className={`knowledge-card${featured ? " knowledge-card--featured" : ""}`}>
      <div className="knowledge-card__topline">
        <span>{record.type}</span>
        <span>{record.sourceIds.length} sources</span>
      </div>
      <h3>
        <Link href={`/knowledge/${record.slug}`}>{record.title}</Link>
      </h3>
      {record.preferredTitle ? (
        <p className="knowledge-card__preferred">{record.preferredTitle}</p>
      ) : null}
      <p>{record.summary}</p>
      <div className="knowledge-card__meta">
        <span>{record.region}</span>
        <span>{record.community.slice(0, 2).join(" / ")}</span>
        <span>{record.languages.slice(0, 2).join(" / ")}</span>
      </div>
      <div className="knowledge-card__badges">
        <span>{statusLabel(record.verificationStatus)}</span>
        <span>{accessLabel(record.culturalAccess)}</span>
      </div>
      <div className="knowledge-card__footer">
        <span>Reviewed {record.lastReviewed}</span>
        <Link href={`/knowledge/${record.slug}`}>Open record</Link>
      </div>
    </article>
  );
}

function KnowledgeListRow({ record }: { record: KnowledgeRecord }) {
  return (
    <article className="knowledge-list-row">
      <div>
        <span>{record.region}</span>
        <h3>
          <Link href={`/knowledge/${record.slug}`}>{record.title}</Link>
        </h3>
        <p>{record.summary}</p>
      </div>
      <dl>
        <div>
          <dt>Community</dt>
          <dd>{record.community.join(", ")}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{accessLabel(record.culturalAccess)}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{record.sourceIds.length}</dd>
        </div>
      </dl>
    </article>
  );
}

function RegistryMap({ records }: { records: KnowledgeRecord[] }) {
  const locatedRecords = records.filter((record) => record.coordinates);

  return (
    <div className="knowledge-map-panel">
      <div className="knowledge-map-panel__canvas" aria-label="Approximate regional map">
        {locatedRecords.map((record) => {
          const lng = record.coordinates?.lng ?? 0;
          const lat = record.coordinates?.lat ?? 0;
          const left = ((lng + 180) / 360) * 100;
          const top = ((90 - lat) / 180) * 100;
          return (
            <Link
              key={record.slug}
              href={`/knowledge/${record.slug}`}
              className="knowledge-map-pin"
              style={{ left: `${left}%`, top: `${top}%` }}
              title={`${record.title} — ${record.coordinates?.label}`}
            >
              <span />
              <strong>{record.title}</strong>
            </Link>
          );
        })}
      </div>
      <p>
        Map positions are approximate and intentionally regional. Knowledge
        systems often move through diaspora, trade, ceremony and language rather
        than a single fixed point.
      </p>
    </div>
  );
}

function RelationalView({ records }: { records: KnowledgeRecord[] }) {
  return (
    <div className="knowledge-relational-view">
      {records.map((record) => (
        <article key={record.slug} className="knowledge-relation-card">
          <h3>
            <Link href={`/knowledge/${record.slug}`}>{record.title}</Link>
          </h3>
          <div>
            {record.relationships.map((relationship) => (
              <Link
                key={relationship}
                href={`/knowledge/relationships/${slugifyRegistryValue(relationship)}`}
              >
                {relationship}
              </Link>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function BrowsePanel({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: { label: string; slug: string; count: number }[];
}) {
  return (
    <section className="knowledge-browse-panel">
      <div className="knowledge-browse-panel__head">
        <h3>{title}</h3>
        <Link href={href}>View all</Link>
      </div>
      <div className="knowledge-browse-panel__items">
        {items.map((item) => (
          <Link key={item.slug} href={`${href}/${item.slug}`}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
