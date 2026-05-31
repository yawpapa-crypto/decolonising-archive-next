import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import RouteAnalytics from "@/src/components/analytics/RouteAnalytics";
import { AncestralAcknowledgementButton } from "@/src/components/site/AncestralAcknowledgement";

function metadataBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const attempts: string[] = [];
  if (raw) {
    attempts.push(raw.includes("://") ? raw : `https://${raw}`);
  }
  attempts.push("https://ared.design");
  for (const a of attempts) {
    try {
      return new URL(a);
    } catch {
      /* try next */
    }
  }
  return new URL("https://ared.design");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "Decolonising Archive",
  description:
    "A growing archive of decolonising knowledge across Africa, the diaspora, and the Global South.",
  openGraph: {
    title: "Decolonising Archive",
    description:
      "A growing archive of decolonising knowledge across Africa, the diaspora, and the Global South.",
    url: "https://ared.design",
    siteName: "Decolonising Archive",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Decolonising Archive",
      },
    ],
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decolonising Archive",
    description:
      "A growing archive of decolonising knowledge across Africa, the diaspora, and the Global South.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
        {children}

        <footer className="site-footer">
          <nav className="site-footer-nav" aria-label="Legal and policies">
            <AncestralAcknowledgementButton />
            <a href="/cultural-care">Cultural Care</a>
            <a href="/community-guidelines">Community Guidelines</a>
            <a href="/terms">Terms of Use</a>
            <a href="/copyright">Copyright &amp; Permissions</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/takedown">Takedown / Rights Contact</a>
            <a href="/support">Support</a>
            <a href="/changelog">Changelog</a>
            <a href="/partners">Partners</a>
            <a href="/feedback">Give feedback</a>
          </nav>
          <div className="site-footer-beta">
            <span className="beta-pill">Free public beta</span>
          </div>
        </footer>

        <RouteAnalytics />
        <Analytics />
    </>
  );
}
