"use client";

import { useState } from "react";

type Props = {
  variant?: "footer" | "inline";
};

export default function NewsletterSignupForm({ variant = "footer" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };

      if (!res.ok || !json.ok) {
        setStatus("error");
        setMessage(json.error ?? "Could not subscribe right now.");
        return;
      }

      setStatus("success");
      setMessage(json.message ?? "Subscribed.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Could not subscribe right now. Try again shortly.");
    }
  }

  return (
    <div className={`newsletter-signup newsletter-signup--${variant}`}>
      <p className="newsletter-signup__title">Email updates</p>
      <p className="newsletter-signup__copy">
        Occasional news on collections, Workbench tools, and community features.
      </p>
      <form className="newsletter-signup__form" onSubmit={onSubmit}>
        <label className="newsletter-signup__field">
          <span className="sr-only">Email for newsletter</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={status === "loading"}
          />
        </label>
        <button type="submit" className="newsletter-signup__submit" disabled={status === "loading"}>
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {message ? (
        <p
          className={`newsletter-signup__status${status === "error" ? " is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
