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
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
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
        <span className="oauth-icon oauth-icon-google" aria-hidden="true">G</span>
        <span>{pending === "google" ? "Redirecting…" : "Continue with Google"}</span>
        <span aria-hidden="true" />
      </button>

      <button
        type="button"
        className="oauth-btn"
        onClick={() => signIn("github")}
        disabled={pending !== null}
      >
        <svg
          className="oauth-icon"
          width="19"
          height="19"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49v-1.9c-2.78.62-3.36-1.21-3.36-1.21-.46-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.29 9.29 0 0 1 12 5.92c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.83c0 .27.18.59.69.49A10.08 10.08 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z"
          />
        </svg>
        <span>{pending === "github" ? "Redirecting…" : "Continue with GitHub"}</span>
        <span aria-hidden="true" />
      </button>

      {error ? <p className="auth-error auth-message">{error}</p> : null}
    </div>
  );
}
