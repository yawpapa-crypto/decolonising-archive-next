"use client";

import { countInterests, DIMENSIONS, type Dimension, type InterestGroup, type Interests } from "@/lib/onboarding/shared";

/** The preference pills. Used by onboarding and by Preferences, so both behave identically. */
export default function InterestPicker({
  groups,
  value,
  onToggle,
}: {
  groups: InterestGroup[];
  value: Interests;
  onToggle: (dim: Dimension, label: string) => void;
}) {
  return (
    <div className="ob-groups">
      {groups.map((g) => (
        <section key={g.dim} aria-labelledby={`g-${g.dim}`}>
          <h3 id={`g-${g.dim}`} className="ob-group">{g.label}</h3>
          <div className="ob-pills">
            {g.options.map((label) => {
              const on = value[g.dim].includes(label);
              return (
                <button key={label} type="button" className={`ob-pill${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => onToggle(g.dim, label)}>
                  <span className="ob-pill__lab">{label}</span>
                  <span className="ob-pill__ctl" aria-hidden>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path className="ob-plus" d="M10 4.5v11M4.5 10h11" />
                      <path className="ob-check" d="m5 10.5 3.2 3.2L15 6.8" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function toggled(value: Interests, dim: Dimension, label: string): Interests {
  const has = value[dim].includes(label);
  return { ...value, [dim]: has ? value[dim].filter((x) => x !== label) : [...value[dim], label] };
}

export { countInterests, DIMENSIONS };
