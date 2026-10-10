import type { Metadata } from "next";
import "./globals.css";
import "./styles/platform-ui-consolidation.css";
import "./styles/site-widgets.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next'
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Schibsted_Grotesk,
} from "next/font/google";
import AuthHashHandler from "@/src/components/auth/AuthHashHandler";
import PlatformActivityTracker from "@/src/components/analytics/PlatformActivityTracker";
import WebVitalsReporter from "@/src/components/analytics/WebVitalsReporter";
import AncestralAcknowledgementDialog from "@/src/components/site/AncestralAcknowledgement";
import ArchiveGuidePanel from "@/src/components/archive-guide/ArchiveGuidePanel";
import BrowserEventRejectionGuard from "@/src/components/site/BrowserEventRejectionGuard";
import PwaRegister from "./home-next/PwaRegister";
import Floaters from "./home-next/Floaters";
import AnimatedFavicon from "@/src/components/site/AnimatedFavicon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const acknowledgementSans = Schibsted_Grotesk({
  variable: "--font-ack-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const acknowledgementSerif = Instrument_Serif({
  variable: "--font-ack-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ared.design"),
  applicationName: "ARED",
  openGraph: { siteName: "Decolonising Archive", images: [{ url: "/og-image.jpg" }], type: "website" },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  appleWebApp: { capable: true, title: "ARED", statusBarStyle: "default" },
  icons: { apple: "/icons/icon-192.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${acknowledgementSans.variable} ${acknowledgementSerif.variable} min-h-full flex flex-col`}
      >
        <BrowserEventRejectionGuard />
        <AnimatedFavicon />
        <AuthHashHandler />
        <PlatformActivityTracker />
        {children}
        <Floaters />
        <PwaRegister />
        <ArchiveGuidePanel />
        <AncestralAcknowledgementDialog />
        <WebVitalsReporter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
