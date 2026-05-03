"use client";

import { useEffect } from "react";
import { createClient } from "@/src/lib/supabase/client";

function cleanHashUrl() {
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", cleanUrl);
}

export default function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken) return;

    const sessionAccessToken = accessToken;
    const sessionRefreshToken = refreshToken;

    const supabase = createClient();

    async function handleAuthHash() {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: sessionAccessToken,
          refresh_token: sessionRefreshToken,
        });

        cleanHashUrl();

        if (error) {
          window.location.replace(
            `/signin?error=${encodeURIComponent("Authentication link is invalid or has expired.")}`,
          );
          return;
        }

        if (type === "recovery") {
          window.location.replace("/reset-password");
          return;
        }

        window.location.replace("/workspace");
      } catch (error) {
        console.error("Auth hash handling failed:", error);
        cleanHashUrl();
        window.location.replace(
          `/signin?error=${encodeURIComponent("Authentication could not be completed. Please try again.")}`,
        );
      }
    }

    void handleAuthHash();
  }, []);

  return null;
}
