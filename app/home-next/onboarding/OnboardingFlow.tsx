"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onboardingConfig } from "@/lib/onboarding/config";
import AredLogo from "../AredLogo";
import InterestPicker, { toggled } from "./InterestPicker";
import {
  MIN_INTERESTS,
  countInterests,
  emptyInterests,
  normaliseUsername,
  validateUsername,
  type InterestGroup,
  type Interests,
} from "@/lib/onboarding/shared";

export interface Panel {
  image: string;
  title: string;
  source?: string;
}

interface Props {
  groups: InterestGroup[];
  panels: Panel[][];
  initial: { name: string; username: string; interests: Interests; step: number; email: string; age?: number };
  /** Where to go when finished. */
  done: string;
}

type Check = { s: "idle" | "checking" | "ok" | "taken" | "invalid" | "error"; msg?: string };

/* Four asymmetric arrangements. Boxes are placed in percent of the right-hand panel. */
const LAYOUTS: Array<Array<{ l: number; t: number; w: number; ar: number }>> = [
  [{ l: 11, t: 34, w: 29, ar: 1.5 }, { l: 43, t: 45, w: 27, ar: 0.84 }, { l: 69, t: 25, w: 27, ar: 0.9 }, { l: 61, t: 50, w: 12, ar: 1 }],
  [{ l: 18, t: 18, w: 36, ar: 0.9 }, { l: 57, t: 11, w: 19, ar: 0.88 }, { l: 44, t: 58, w: 33, ar: 1 }],
  [{ l: 26, t: 7, w: 44, ar: 3 }, { l: 60, t: 17, w: 20, ar: 0.9 }, { l: 20, t: 40, w: 46, ar: 1.7 }, { l: 44, t: 66, w: 28, ar: 1.15 }],
  [{ l: 10, t: 19, w: 30, ar: 0.9 }, { l: 44, t: 23, w: 20, ar: 0.87 }, { l: 20, t: 56, w: 12, ar: 0.83 }, { l: 34, t: 58, w: 42, ar: 1.5 }],
];

export default function OnboardingFlow({ groups, panels, initial, done }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(initial.step, 3));
  const [shown, setShown] = useState(step);
  const [fade, setFade] = useState(false);
  const [name, setName] = useState(initial.name);
  const context = initial.interests.context ?? "";
  const [age, setAge] = useState(initial.age ? String(initial.age) : "");
  const [username, setUsername] = useState(initial.username);
  const [interests, setInterests] = useState<Interests>({ ...emptyInterests(), ...initial.interests });
  const [check, setCheck] = useState<Check>({ s: "idle" });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const [dead, setDead] = useState<Set<string>>(new Set());

  /* Soft step change: the old form fades out, then the new one fades in. The canvas never reloads. */
  const go = useCallback((to: number) => {
    setError("");
    setFade(true);
    window.setTimeout(() => {
      setStep(to);
      setShown(to);
      setFade(false);
    }, 160);
  }, []);

  const post = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; username?: string };
      if (res.status === 401) {
        setError("Your session ended. Sign in again; your answers on this screen are kept.");
        return null;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That did not save. Try again.");
        return null;
      }
      return data;
    } catch {
      setError("No connection. Your answers are still here; try again in a moment.");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  /* Username: debounced, real availability. Never claims "available" without the server saying so. */
  useEffect(() => {
    if (step !== 2) return;
    const u = normaliseUsername(username);
    if (!u) {
      setCheck({ s: "idle" });
      return;
    }
    const bad = validateUsername(u);
    if (bad) {
      setCheck({ s: "invalid", msg: bad });
      return;
    }
    setCheck({ s: "checking" });
    const mine = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/onboarding/username?u=${encodeURIComponent(u)}`);
        const data = (await res.json()) as { ok: boolean; available?: boolean; reason?: string; error?: string };
        if (mine !== seq.current) return;
        if (!res.ok || !data.ok) setCheck({ s: "error", msg: data.error ?? "Could not check that name right now." });
        else setCheck(data.available ? { s: "ok" } : { s: "taken", msg: data.reason ?? "That username is taken." });
      } catch {
        if (mine === seq.current) setCheck({ s: "error", msg: "Could not check that name right now." });
      }
    }, 380);
    return () => window.clearTimeout(t);
  }, [username, step]);

  useEffect(() => {
    if (step !== 2) return;
    let live = true;
    void (async () => {
      try {
        const seed = name || initial.email.split("@")[0] || "";
        const res = await fetch(`/api/onboarding/username?suggest=${encodeURIComponent(seed)}`);
        const data = (await res.json()) as { suggestions?: string[] };
        if (live) setSuggestions(data.suggestions ?? []);
      } catch {
        if (live) setSuggestions([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [step, name, initial.email]);

  /* Picks are saved quietly as they happen, so a closed tab or dropped connection resumes with them intact. */
  const firstPick = useRef(true);
  useEffect(() => {
    if (step !== 3) return;
    if (firstPick.current) {
      firstPick.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "interests", interests: { ...interests, context: context || undefined } }) }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(t);
  }, [interests, step, context]);

  const count = countInterests(interests);
  const enough = count >= MIN_INTERESTS;

  const finish = async (skip: boolean) => {
    const ok = await post({ action: "complete", interests: { ...interests, context: context || undefined }, skip });
    if (ok) router.push(done);
  };

  const panelIdx = shown;
  const lay = LAYOUTS[panelIdx];
  const cap = panels[panelIdx]?.[0];

  const stage = useMemo(
    () =>
      panels.map((set, n) => (
        <div key={n} className={`ob-stage${n === panelIdx ? " is-on" : ""}`} aria-hidden={n !== panelIdx}>
          {LAYOUTS[n].map((box, k) => {
            const p = set[k];
            if (!p || dead.has(p.image)) return null;
            return (
              <figure key={p.image} className="ob-fig" style={{ left: `${box.l}%`, top: `${box.t}%`, width: `${box.w}%`, aspectRatio: String(box.ar), ["--d" as string]: `${k * 70}ms` }}>
                <Image src={p.image} alt="" fill sizes="30vw" unoptimized className="ob-img" onError={() => setDead((s) => new Set(s).add(p.image))} />
              </figure>
            );
          })}
        </div>
      )),
    [panels, panelIdx, dead],
  );
  void lay;

  return (
    <div className="ob">
      <section className="ob-left" aria-live="polite">
        <header className="ob-top">
          {step > 0 ? (
            <button type="button" className="ob-back" aria-label="Back" onClick={() => go(step - 1)}>
              <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10H4m5-5-5 5 5 5" /></svg>
            </button>
          ) : <span />}
          <AredLogo size={34} />
          {step === 3 ? (
            <button type="button" className="ob-skip" onClick={() => void finish(true)} disabled={busy}>Skip for now</button>
          ) : (
            <button type="button" className="ob-back ob-fwd" aria-label="Next" onClick={() => (document.getElementById("ob-form") as HTMLFormElement | null)?.requestSubmit()}>
              <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
            </button>
          )}
        </header>

        <div className={`ob-body${fade ? " is-out" : ""}${step === 3 ? " ob-body--list" : ""}`}>
          {step === 0 && (
            <form id="ob-form" className="ob-form" onSubmit={async (e) => { e.preventDefault(); if (name.trim().length < 2) return; if (await post({ action: "name", name })) go(1); }}>
              <h1 className="ob-h">{onboardingConfig.questions[0].title}</h1>
              <p className="ob-sub">{onboardingConfig.questions[0].description}</p>
              <label className="ob-field">
                <span className="ob-sr">Full name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" autoFocus maxLength={80} />
              </label>
              <button className="ob-next" type="submit" disabled={name.trim().length < 2}>Next</button>
              {error && <p className="ob-err" role="alert">{error}</p>}
            </form>
          )}

          {step === 1 && (
            <form id="ob-form" className="ob-form" onSubmit={async e => { e.preventDefault(); if (await post({ action: "age", age: age ? Number(age) : null })) go(2); }}>
              <h1 className="ob-h">{onboardingConfig.questions[1].title}</h1>
              <p className="ob-sub">{onboardingConfig.questions[1].description}</p>
              <label className="ob-field"><span className="ob-sr">Age</span><input type="number" min={1} max={120} value={age} onChange={e => setAge(e.target.value)} placeholder="Age" autoFocus /></label>
              <button className="ob-next" type="submit">{age ? "Next" : "Skip for now"}</button>
              {error && <p className="ob-err" role="alert">{error}</p>}
            </form>
          )}

          {step === 2 && (
            <form id="ob-form" className="ob-form" onSubmit={async (e) => { e.preventDefault(); if (check.s !== "ok" || busy) return; if (await post({ action: "username", username })) go(3); }}>
              <h1 className="ob-h">{onboardingConfig.questions[2].title}</h1>
              <p className={`ob-sub ob-status ob-status--${check.s}`} role="status">
                {check.s === "ok" ? `${normaliseUsername(username)} is available` : check.s === "checking" ? "Checking…" : check.msg ?? "Letters, numbers and underscores"}
              </p>
              <label className="ob-field ob-field--at">
                <span className="ob-sr">Username</span>
                <span className="ob-at" aria-hidden>@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value.replace(/^@+/, ""))} placeholder="username" name="ared-handle" autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" autoCapitalize="none" spellCheck={false} autoFocus maxLength={24} aria-invalid={check.s === "invalid" || check.s === "taken"} />
              </label>
              <button className="ob-next" type="submit" disabled={check.s !== "ok" || busy}>Next</button>
              {error && <p className="ob-err" role="alert">{error}</p>}
              {suggestions.filter((x) => x !== normaliseUsername(username)).length > 0 && (
                <div className="ob-sugg">
                  <p>Suggestions:</p>
                  <div>{suggestions.filter((x) => x !== normaliseUsername(username)).map((s) => <button key={s} type="button" className="ob-chip" onClick={() => setUsername(s)}>{s}</button>)}</div>
                </div>
              )}
            </form>
          )}

          {step === 3 && (
            <div className="ob-interests">
              <h1 className="ob-h">{onboardingConfig.questions[3].title}</h1>
              <p className="ob-sub">{onboardingConfig.questions[3].description}</p>
              <InterestPicker groups={groups} value={interests} onToggle={(d, l) => setInterests((v) => toggled(v, d, l))} />
              {error && <p className="ob-err" role="alert">{error}</p>}
              <div className="ob-pad" aria-hidden />
            </div>
          )}
        </div>

        {step === 3 && (
          <div className="ob-cta">
            <button type="button" className="ob-cta__btn" disabled={!enough || busy} onClick={() => void finish(false)}>
              <span>{enough ? "Continue" : `Choose at least ${MIN_INTERESTS}`}</span>
              <span className="ob-cta__n">{enough ? <>{count} selected</> : <>{count} <i>/ {MIN_INTERESTS}</i></>}</span>
            </button>
          </div>
        )}

        {step < 3 && <p className="ob-brand">ARED</p>}
      </section>

      <section className="ob-right" aria-hidden>
        {stage}
        {cap && (
          <p className="ob-cap">
            {cap.title.length > 70 ? `${cap.title.slice(0, 68)}…` : cap.title}
            {cap.source ? <><br />{cap.source}</> : null}
          </p>
        )}
      </section>
      <noscript><p>Onboarding needs JavaScript. <Link href="/for-you">Continue to For You</Link></p></noscript>
    </div>
  );
}
