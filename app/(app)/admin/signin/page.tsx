import Link from "next/link";
import { adminPasswordSignIn, adminResetPassword } from "./actions";

export default async function AdminSigninPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message = params?.message;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f4",
        color: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.16)",
          padding: 32,
          boxShadow: "0 24px 80px rgba(0,0,0,0.08)",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.55)",
            fontWeight: 700,
          }}
        >
          Decolonising Archive
        </p>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: 38,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            fontWeight: 700,
          }}
        >
          Admin sign in
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(0,0,0,0.65)",
          }}
        >
          Admin access is restricted. Use your approved admin email and password.
        </p>

        <form action={adminPasswordSignIn} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "rgba(0,0,0,0.72)",
              }}
            >
              Email
            </span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #111",
                padding: "15px 14px",
                fontSize: 17,
                outline: "none",
                background: "#fff",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "rgba(0,0,0,0.72)",
              }}
            >
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #111",
                padding: "15px 14px",
                fontSize: 17,
                outline: "none",
                background: "#fff",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              width: "100%",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              padding: "15px 16px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Sign in
          </button>
        </form>

        <form
          action={adminResetPassword}
          style={{
            marginTop: 28,
            paddingTop: 24,
            borderTop: "1px solid rgba(0,0,0,0.14)",
            display: "grid",
            gap: 14,
          }}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "rgba(0,0,0,0.72)",
              }}
            >
              Reset admin password
            </span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #111",
                padding: "15px 14px",
                fontSize: 17,
                outline: "none",
                background: "#fff",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              width: "100%",
              border: "1px solid #111",
              background: "#fff",
              color: "#111",
              padding: "15px 16px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Send reset password email
          </button>
        </form>

        {message ? (
          <p
            style={{
              marginTop: 20,
              border: "1px solid rgba(0,0,0,0.14)",
              background: "rgba(0,0,0,0.035)",
              padding: "12px 14px",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        ) : null}

        <div
          style={{
            marginTop: 28,
            display: "flex",
            gap: 8,
            fontSize: 14,
            color: "rgba(0,0,0,0.72)",
          }}
        >
          <a style={{ color: "inherit", textDecoration: "underline" }} href="/">
            Back to public site
          </a>
          <span>·</span>
          <Link style={{ color: "inherit", textDecoration: "underline" }} href="/signin">
            Member sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
