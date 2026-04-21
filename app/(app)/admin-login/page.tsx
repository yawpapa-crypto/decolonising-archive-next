"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Incorrect password");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="legal-page">
      <div className="legal-wrap" style={{ maxWidth: "420px" }}>
        <p className="legal-eyebrow">Protected Access</p>
        <h1>Admin Login</h1>
        <p className="legal-updated">Enter the admin password to continue.</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              minHeight: "48px",
              padding: "0 14px",
              border: "1px solid #000",
              background: "#fff",
              color: "#000",
              fontSize: "14px",
            }}
          />

          <button
            type="submit"
            style={{
              minHeight: "48px",
              border: "1px solid #000",
              background: "#000",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Enter
          </button>
        </form>

        {error ? (
          <p style={{ marginTop: "14px", color: "#b00020" }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}
