import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import HomeNav from "./home-next/HomeNav";
import HomeFooter from "./home-next/HomeFooter";
import { display } from "./home-next/font";
import "./home-next/home.css";

export const metadata: Metadata = { title: "Not found | Decolonising Archive" };

export default function NotFound() {
  // Old or broken links lead to the homepage.
  redirect("/");
  return (
    <div className={`ared-home ${display.variable}`}>
      <HomeNav signedIn={false} />
      <main style={{ minHeight: "62svh", display: "grid", placeItems: "center", textAlign: "center", padding: "120px 24px 64px" }}>
        <div style={{ maxWidth: 560 }}>
          <p style={{ color: "var(--color-pebble)", fontSize: 14, margin: "0 0 16px" }}>404</p>
          <h1 style={{ fontFamily: "var(--font-cosmosoracle-src), serif", fontWeight: 400, fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1.05, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            This record is not in the archive.
          </h1>
          <p style={{ color: "var(--color-stone)", fontSize: 17, lineHeight: 1.55, margin: "0 0 32px" }}>
            The page may have moved, or the link may be wrong. Search the archive, or start again from the beginning.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/explore" className="ared-btn ared-btn--primary">Explore</Link>
            <Link href="/library" className="ared-btn ared-btn--outline">Search the library</Link>
            <Link href="/" className="ared-btn ared-btn--outline">Home</Link>
          </div>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
