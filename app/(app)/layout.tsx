import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import RouteAnalytics from "@/src/components/analytics/RouteAnalytics";
import JsonLd from "@/src/components/kgo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/kgo/schema";

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
  title: {
    default: "Decolonising Archive | ARED",
    template: "%s | ARED",
  },
  description:
    "A public cultural knowledge platform for searching, citing and connecting decolonising knowledge across Africa, the diaspora and the Global South.",
  alternates: {
    canonical: "/",
    types: {
      "text/plain": [{ url: "/llms.txt", title: "llms.txt" }],
    },
  },
  openGraph: {
    title: "Decolonising Archive",
    description:
      "A public cultural knowledge platform for searching, citing and connecting decolonising knowledge across Africa, the diaspora and the Global South.",
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
      "A public cultural knowledge platform for searching, citing and connecting decolonising knowledge across Africa, the diaspora and the Global South.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      {children}
      <RouteAnalytics />
      <Analytics />
    </>
  );
}
