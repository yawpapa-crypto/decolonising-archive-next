"use client";
import { createClient } from "@/src/lib/supabase/client";

/** Signs out in the browser first (so it cannot silently fail), tells the server, then leaves for the home page. */
export async function signOutNow() {
  try { await createClient().auth.signOut(); } catch { /* the server call below still clears the session */ }
  try { await fetch("/auth/signout", { method: "POST", credentials: "same-origin", redirect: "manual" }); } catch { /* offline: cookies are already cleared above */ }
  try { document.cookie.split(";").forEach((c) => { const n = c.split("=")[0].trim(); if (n.startsWith("sb-")) document.cookie = `${n}=; Max-Age=0; path=/`; }); } catch {}
  window.location.assign("/");
}
