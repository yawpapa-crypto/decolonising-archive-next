import Navbar from "@/src/components/layout/Navbar";
import Script from "next/script";

export default function Home() {
  return (
    <>
      <Navbar />

      <main id="app"></main>

      <noscript>
        <div className="empty noscript-note">
          This archive needs JavaScript enabled to render the local index and
          record pages.
        </div>
      </noscript>

      <Script
        src="/assets/js/app.js"
        strategy="afterInteractive"
        type="module"
      />
    </>
  );
}
