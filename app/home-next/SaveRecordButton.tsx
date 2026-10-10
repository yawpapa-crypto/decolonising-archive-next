"use client";
import { useEffect, useState } from "react";
import { consumePending, setPending, type PendingItem } from "./pending-save";
import SignupGate from "./explore/SignupGate";

/** Save for the record page. Visitors are asked to create an account, and the save completes afterwards. */
export default function SaveRecordButton({ item }: { item: PendingItem }) {
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const send = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/for-you/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, title: item.title, source: item.source, type: item.kind, href: item.href || `/records/${encodeURIComponent(item.id)}`, year: item.year }) });
      if (res.status === 401) { setPending(item); setState("idle"); window.dispatchEvent(new CustomEvent("ared-signup-required", { detail: { reason: "save" } })); return; }
      setState(res.ok ? "saved" : "error");
    } catch { setState("error"); }
  };
  useEffect(() => {
    const p = consumePending();
    if (p && p.id === item.id) void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <button type="button" onClick={send} disabled={state === "busy" || state === "saved"} aria-live="polite"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 999, border: "1px solid #d8d3cc", background: state === "saved" ? "#0d0d0d" : "#fff", color: state === "saved" ? "#f7f5f3" : "#0d0d0d", font: "500 14px/1 Inter,system-ui,sans-serif", cursor: "pointer", marginBottom: 16 }}>
        {state === "saved" ? "Saved" : state === "busy" ? "Saving" : state === "error" ? "Try saving again" : "Save"}
      </button>
      <SignupGate />
    </>
  );
}
