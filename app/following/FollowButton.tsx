"use client";
import { aredEvent } from "@/lib/events/client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
export default function FollowButton({
  id,
  kind,
  signedIn,
  initial = false,
}: {
  id: string;
  kind: "profile" | "collection";
  signedIn: boolean;
  initial?: boolean;
}) {
  const [following, setFollowing] = useState(initial),
    [busy, setBusy] = useState(false),
    [prompt, setPrompt] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const resumed = useRef(false);
  const change = useCallback(
    async (value: boolean) => {
      setBusy(true);
      setFollowing(value);
      setError("");
      try {
        const r = await fetch("/api/following", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, kind, follow: value }),
        });
        if (!r.ok) throw new Error("Could not update your follow. Try again.");
        if (value) aredEvent("follow", `${kind}:${id}`);
      } catch (e) {
        setFollowing(!value);
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [id, kind],
  );
  useEffect(() => {
    if (!signedIn || resumed.current) return;
    const stored = localStorage.getItem("ared-follow");
    let intended: { target?: string; expires?: number } = {};
    try {
      intended = JSON.parse(stored ?? "{}");
    } catch {}
    if (
      intended.target === `${kind}:${id}` &&
      (intended.expires ?? 0) > Date.now()
    ) {
      resumed.current = true;
      localStorage.removeItem("ared-follow");
      if (!initial) void change(true);
    }
  }, [signedIn, id, kind, initial, change]);
  function click() {
    if (signedIn) {
      void change(!following);
      return;
    }
    localStorage.setItem(
      "ared-follow",
      JSON.stringify({
        target: `${kind}:${id}`,
        expires: Date.now() + 86400000,
      }),
    );
    setPrompt(true);
    dialog.current?.showModal();
  }
  const next =
    typeof window === "undefined"
      ? `/${kind === "profile" ? "people" : "home-next/c"}/${id}`
      : window.location.pathname;
  return (
    <>
      <button
        className="cf-follow"
        aria-pressed={following}
        disabled={busy}
        onClick={click}
      >
        {following ? "Following" : "Follow"}
      </button>
      <span className="cf-sr" role="status">
        {following ? "Following" : "Not following"}
      </span>
      {error && <p role="alert">{error}</p>}
      <dialog
        ref={dialog}
        className="cf-auth"
        onClose={() => setPrompt(false)}
        onCancel={() => localStorage.removeItem("ared-follow")}
      >
        {prompt && (
          <>
            <h2>Follow this {kind === "profile" ? "profile" : "collection"}</h2>
            <p>
              Create an account to follow people and collections and see their
              latest work in Following.
            </p>
            <Link href={`/signup?next=${encodeURIComponent(next)}`}>
              Create an account
            </Link>
            <Link href={`/signin?next=${encodeURIComponent(next)}`}>
              Log in
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("ared-follow");
                dialog.current?.close();
              }}
            >
              Continue browsing
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
