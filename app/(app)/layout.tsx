import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import HashAnalytics from "@/src/components/analytics/HashAnalytics";

export const metadata: Metadata = {
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
          <a href="/terms">Terms of Use</a>
          <span> · </span>
          <a href="/copyright">Copyright &amp; Permissions</a>
          <span> · </span>
          <a href="/privacy">Privacy Policy</a>
          <span> · </span>
          <a href="/takedown">Takedown / Rights Contact</a>
        </footer>

        <HashAnalytics />
        <Analytics />
    </>
  );
}
