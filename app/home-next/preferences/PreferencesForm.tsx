"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";

import { useState } from "react";
import Link from "next/link";
import InterestPicker, { toggled } from "../onboarding/InterestPicker";
import { countInterests, emptyInterests, type InterestGroup, type Interests } from "@/lib/onboarding/shared";

/** Profile > Interests. Changing these shapes future For You batches; the feed on screen is never reshuffled. */
export default function PreferencesForm({ groups, initial, migrated }: { groups: InterestGroup[]; initial: Interests; migrated: boolean }) {
  const [value, setValue] = useState<Interests>({ ...emptyInterests(), ...initial });
  const [saved, setSaved] = useState<Interests>({ ...emptyInterests(), ...initial });
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "interests", interests: value }) });
      const data = (await res.json()) as { ok?: boolean; interests?: Interests };
      if (!res.ok || !data.ok) throw new Error();
      setSaved(data.interests ?? value);
      setState("done");
    } catch {
      setState("error");
    }
  };

  const total = countInterests(value);
  return (
    <div className="pf-in">
      <header className="pf-head">
        <p className="pf-eyebrow">Preferences</p>
        <h1>Your interests</h1>
        <p>These shape what For You shows next. Your saves keep adding to them. Changes apply to new batches, not to what is already on screen.</p>
      </header>
      {!migrated && <p className="pf-warn" role="alert">Interests are not available yet: the database update for them has not been applied.</p>}
      <div className="pf-layout">
        <nav className="pf-nav" aria-label="Interest sections">
          {groups.map((g) => (
            <a key={g.dim} href={`#pf-${g.dim}`}><span>{g.label}</span><b>{value[g.dim].length || ""}</b></a>
          ))}
        </nav>
        <div className="pf-cards">
          {groups.map((g) => (
            <section key={g.dim} id={`pf-${g.dim}`} className="pf-card" aria-labelledby={`pfh-${g.dim}`}>
              <div className="pf-card__top"><h2 id={`pfh-${g.dim}`}>{g.label}</h2><span>{value[g.dim].length} selected</span></div>
              <div className="ob-pills">
                {g.options.map((label) => {
                  const on = value[g.dim].includes(label);
                  return (
                    <button key={label} type="button" className={`ob-pill${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => { setState("idle"); setValue((v) => toggled(v, g.dim, label)); }}>
                      <span className="ob-pill__lab">{label}</span>
                      <span className="ob-pill__ctl" aria-hidden>
                        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path className="ob-plus" d="M10 4.5v11M4.5 10h11" /><path className="ob-check" d="m5 10.5 3.2 3.2L15 6.8" /></svg>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className={`pf-bar${dirty ? " is-dirty" : ""}`} role="region" aria-label="Save your interests">
        <span className="pf-bar__msg" role="status" aria-live="polite">
          <i className={`pf-dot pf-dot--${state === "done" ? "ok" : state === "error" ? "err" : dirty ? "dirty" : "idle"}`} aria-hidden />
          <b>{state === "done" ? "Saved" : state === "error" ? "Not saved" : `${total} selected`}</b>
          <em>{state === "done" ? "Your next batches will reflect this." : state === "error" ? "Something went wrong. Try again." : dirty ? "Unsaved changes" : "Up to date"}</em>
        </span>
        <Link href="/for-you" className="pf-back">Back to For You</Link>
        <button type="button" className="pf-save" disabled={!dirty || state === "saving" || !migrated} aria-busy={state === "saving"} onClick={save}>{state === "saving" ? <LineLoader inline size={18} label="Saving" /> : "Save changes"}</button>
      </div>
    </div>
  );
}
