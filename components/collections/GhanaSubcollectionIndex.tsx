"use client";

import {
  GHANA_SUBCOLLECTIONS,
  type GhanaSubcollection,
  type GhanaSubcollectionId,
} from "@/lib/data/ghana-subcollections";

type Props = {
  activeSubcollection: GhanaSubcollectionId | null;
  onSelectSubcollection: (sectionId: GhanaSubcollectionId) => void;
};

function SubcollectionCard({
  section,
  isActive,
  onSelect,
}: {
  section: GhanaSubcollection;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`ghana-subcol-card${isActive ? " is-active" : ""}${section.featured ? " is-featured" : ""}`}
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
    >
      <span className="ghana-subcol-num">{String(section.number).padStart(2, "0")}</span>
      <h3 className="ghana-subcol-title">{section.title}</h3>
      <p className="ghana-subcol-summary">{section.summary}</p>
      <ul className="ghana-subcol-topics">
        {section.topics.slice(0, 4).map((topic) => (
          <li key={topic}>{topic}</li>
        ))}
        {section.topics.length > 4 && (
          <li className="ghana-subcol-more">+ {section.topics.length - 4} more</li>
        )}
      </ul>
      <span className="ghana-subcol-cta">Browse section →</span>
    </button>
  );
}

export default function GhanaSubcollectionIndex({ activeSubcollection, onSelectSubcollection }: Props) {
  return (
    <section className="ghana-subcol-index" aria-labelledby="ghana-subcol-heading">
      <div className="ghana-subcol-index-header">
        <div>
          <div className="ghana-ed-kicker">
            <span className="ghana-ed-arrow" aria-hidden="true">
              ▶▶
            </span>
            One collection · eight sections
          </div>
          <h2 id="ghana-subcol-heading" className="ghana-ed-heading">
            Subcollections
          </h2>
          <p className="ghana-ed-lead ghana-subcol-lead">
            A single authoritative catalogue organised by visual tradition, not disconnected
            mini-collections. Each section expands through verified batches — aiming for 150–250
            strong records at public launch, then steady growth.
          </p>
        </div>
      </div>

      <div className="ghana-subcol-grid">
        {GHANA_SUBCOLLECTIONS.map((section) => (
          <SubcollectionCard
            key={section.id}
            section={section}
            isActive={activeSubcollection === section.id}
            onSelect={() => onSelectSubcollection(section.id)}
          />
        ))}
      </div>
    </section>
  );
}
