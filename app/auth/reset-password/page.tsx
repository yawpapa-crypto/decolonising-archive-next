"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Please use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated. Redirecting to admin sign in...");
    setTimeout(() => router.push("/admin/signin"), 1200);
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f7f7f4",
      color: "#111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 20px",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: "100%",
        maxWidth: 520,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.16)",
        padding: 32,
        boxShadow: "0 24px 80px rgba(0,0,0,0.08)",
      }}>
        <p style={{
          margin: "0 0 12px",
          fontSize: 12,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.55)",
          fontWeight: 700,
        }}>
          Decolonising Archive
        </p>

        <h1 style={{ margin: "0 0 10px", fontSize: 36, lineHeight: 1, letterSpacing: "-0.04em" }}>
          Reset password
        </h1>

        <p style={{ margin: "0 0 24px", color: "rgba(0,0,0,0.65)", lineHeight: 1.6 }}>
          Enter a new password for your admin account.
        </p>

        {!isReady && (
          <p style={{
            marginBottom: 18,
            border: "1px solid rgba(180,120,0,0.3)",
            background: "rgba(255,190,80,0.12)",
            padding: 12,
            fontSize: 14,
          }}>
            Open this page from your password recovery email. If you already did, wait a moment.
          </p>
        )}

        <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em" }}>
            New password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ border: "1px solid #111", padding: "15px 14px", fontSize: 17 }}
          />
        </label>

        <label style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em" }}>
            Confirm password
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ border: "1px solid #111", padding: "15px 14px", fontSize: 17 }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || !isReady}
          style={{
            width: "100%",
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            padding: "15px 16px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: isSubmitting || !isReady ? 0.45 : 1,
          }}
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>

        {message && <p style={{ marginTop: 16, fontSize: 14 }}>{message}</p>}
      </form>
    </main>
  );
}
