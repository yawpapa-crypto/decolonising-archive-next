"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";
import { useId, useState } from "react";
import Select, { type Opt } from "../ui/Select";
import { useFormStatus } from "react-dom";

function Save() {
  const { pending } = useFormStatus();
  return <button className="ared-btn ared-btn--primary" disabled={pending} aria-busy={pending}>{pending ? <LineLoader inline size={18} label="Saving" /> : "Save profile"}</button>;
}

const VIS: Opt[] = [
  { value: "private", label: "Private", hint: "Only you" },
  { value: "members_only", label: "Community members only", hint: "Signed-in members" },
  { value: "public", label: "Public", hint: "Name, bio, avatar and website" },
];

export default function SettingsForm({ action, name, bio, website, visibility }: { action: (f: FormData) => void | Promise<void>; name: string; bio: string; website: string; visibility: string }) {
  const [vis, setVis] = useState(visibility);
  const [b, setB] = useState(bio);
  const ids = { n: useId(), b: useId(), w: useId() };
  return (
    <form action={action} className="st-form">
      <div className="st-field">
        <label className="st-label" htmlFor={ids.n}>Full name</label>
        <input id={ids.n} className="st-input" name="full_name" autoComplete="name" maxLength={120} defaultValue={name} />
      </div>
      <div className="st-field">
        <label className="st-label" htmlFor={ids.b}>Bio</label>
        <textarea id={ids.b} className="st-input st-area" name="bio" maxLength={240} value={b} onChange={(e) => setB(e.target.value)} />
        <span className="st-count" aria-live="polite">{b.length}/240</span>
      </div>
      <div className="st-field">
        <label className="st-label" htmlFor={ids.w}>Website</label>
        <input id={ids.w} className="st-input" name="website" type="url" placeholder="https://" defaultValue={website} />
      </div>
      <Select name="profile_visibility" label="Public profile" options={VIS} value={vis} onChange={setVis} />
      <p className="st-note">Your saved records and private collections stay private.</p>
      <Save />
    </form>
  );
}
