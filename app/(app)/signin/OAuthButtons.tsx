"use client";

// Client-side OAuth buttons. PKCE code verifier needs to be stored in the
// browser, so OAuth must be initiated from the browser, not from a server
// action. Supabase handles the redirect to Google/GitHub.

import { useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

type Provider = "google" | "github";

export default function OAuthButtons({ next }: { next: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);
    try {
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError("Couldn’t open sign-in. Please try again.");
      setPending(null);
    }
    } catch {
      setError("Check your connection and try signing in again.");
      setPending(null);
    }
    // On success the browser is redirected by Supabase; no further action.
  }

  return (
    <div className="oauth-stack">
      <button
        type="button"
        className="oauth-btn"
        onClick={() => signIn("google")}
        disabled={pending !== null}
      >
        {pending === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <button
        type="button"
        className="oauth-btn"
        onClick={() => signIn("github")}
        disabled={pending !== null}
      >
        {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
      </button>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
    </div>
  );
}
