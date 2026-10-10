"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";
import { useId, useState } from "react";
import Select, { type Opt } from "../ui/Select";
import "../ui/ui.css";

const KINDS: Opt[] = [
  { value: "correction", label: "A correction", hint: "Something here is wrong or incomplete" },
  { value: "relationship", label: "A connection", hint: "Link this to another record" },
  { value: "attribution", label: "Missing attribution", hint: "Credit a maker, photographer or community" },
  { value: "source", label: "A source", hint: "A publication or collection to add" },
  { value: "record", label: "A record", hint: "An object or image the archive should hold" },
];
const RELS: Opt[] = [
  { value: "related_to", label: "Related to" },
  { value: "influenced_by", label: "Influenced by" },
  { value: "responds_to", label: "Responds to" },
  { value: "documents", label: "Documents" },
  { value: "attributed_to", label: "Attributed to" },
];

/** Proposal form. Used inside the dialog and on the standalone page. */
export default function ContributionForm({ record, onDone }: { record: string; onDone?: () => void }) {
  const [kind, setKind] = useState("correction");
  const [rel, setRel] = useState("related_to");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [detail, setDetail] = useState("");
  const id = useId();
  const needsRecord = !["record", "source"].includes(kind);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setState(null);
    try {
      const res = await fetch("/api/knowledge/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
      if (!res.ok) throw new Error(out.error || "Could not submit.");
      setState({ ok: true, text: "Thank you. Your proposal is with the reviewers and is not public yet." });
      form.reset(); setDetail("");
      onDone && window.setTimeout(onDone, 2200);
    } catch (err) {
      setState({ ok: false, text: err instanceof Error ? err.message : "Could not submit. Your writing is still here." });
    } finally { setBusy(false); }
  }

  if (state?.ok) {
    return (
      <div className="pd-done" role="status">
        <span className="pd-done__tick" aria-hidden><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
        <strong>Proposal sent</strong>
        <p>{state.text}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="st-form pd-form">
      <Select name="kind" label="What would you like to propose?" options={KINDS} value={kind} onChange={setKind} />
      <div className="st-field">
        <label className="st-label" htmlFor={`${id}t`}>Title</label>
        <input id={`${id}t`} className="st-input" name="title" required maxLength={160} placeholder="A short, clear summary" />
      </div>
      <div className="st-field">
        <label className="st-label" htmlFor={`${id}r`}>Record ID{needsRecord ? "" : " (optional)"}</label>
        <input id={`${id}r`} className="st-input" name="record_id" defaultValue={record} required={needsRecord} maxLength={200} />
      </div>
      {kind === "relationship" && (
        <>
          <div className="st-field">
            <label className="st-label" htmlFor={`${id}c`}>Connected record ID</label>
            <input id={`${id}c`} className="st-input" name="related_record_id" required maxLength={200} />
          </div>
          <Select name="relationship" label="Relationship" options={RELS} value={rel} onChange={setRel} />
        </>
      )}
      <div className="st-field">
        <label className="st-label" htmlFor={`${id}d`}>Your explanation</label>
        <textarea id={`${id}d`} className="st-input st-area" name="detail" required maxLength={10000} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What should change, and why?" />
      </div>
      <div className="st-field">
        <label className="st-label" htmlFor={`${id}u`}>Evidence or source link</label>
        <input id={`${id}u`} className="st-input" name="evidence_url" type="url" required maxLength={2000} placeholder="https://" />
      </div>
      <p className="st-note">Please leave out private contact details, restricted community knowledge and anything you do not have permission to share.</p>
      {state && !state.ok && <p className="pd-err" role="alert">{state.text}</p>}
      <button className="ared-btn ared-btn--primary pd-submit" disabled={busy} aria-busy={busy}>{busy ? <LineLoader inline size={18} label="Sending" /> : "Submit for review"}</button>
    </form>
  );
}
