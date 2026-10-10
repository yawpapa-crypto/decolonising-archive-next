import Link from "next/link";
import AccountShell from "./AccountShell";

/** Shown instead of a redirect when a visitor opens a personal page. */
export default function LibraryGate({ next, title = "Your library", body = "Save records and organise them into collections so you can return to them later." }: { next: string; title?: string; body?: string }) {
  const n = encodeURIComponent(next);
  return (
    <AccountShell>
      <main className="account-page">
        <section style={{ maxWidth: 460, margin: "12vh auto", textAlign: "center" }}>
          <h1 style={{ font: "300 40px/1.08 var(--font-cosmosoracle-src,Georgia,serif)", letterSpacing: "-.025em", margin: "0 0 14px" }}>{title}</h1>
          <p style={{ font: "400 16px/1.55 var(--font-ared-ui,Inter,sans-serif)", color: "#4a4540", margin: "0 auto 28px", maxWidth: 360 }}>{body}</p>
          <Link href={`/signup?next=${n}`} style={{ display: "inline-block", padding: "14px 26px", borderRadius: 999, background: "#0d0d0d", color: "#f7f5f3", textDecoration: "none", font: "500 15px/1 var(--font-ared-ui,Inter,sans-serif)" }}>Create account</Link>
          <p style={{ font: "400 14px/1.2 var(--font-ared-ui,Inter,sans-serif)", color: "#7a746d", marginTop: 20 }}>Already have an account? <Link href={`/signin?next=${n}`} style={{ color: "inherit", textDecoration: "underline" }}>Sign in</Link></p>
          <p style={{ marginTop: 28 }}><Link href="/home-next/explore" style={{ font: "400 14px/1 var(--font-ared-ui,Inter,sans-serif)", color: "#7a746d" }}>Keep exploring the archive</Link></p>
        </section>
      </main>
    </AccountShell>
  );
}
