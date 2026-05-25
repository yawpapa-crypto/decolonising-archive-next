import "./globals.css";
import "./styles/platform-ui-consolidation.css";
import { SpeedInsights } from '@vercel/speed-insights/next'
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Schibsted_Grotesk,
} from "next/font/google";
import AuthHashHandler from "@/src/components/auth/AuthHashHandler";
import AncestralAcknowledgementDialog from "@/src/components/site/AncestralAcknowledgement";

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
        <AuthHashHandler />
        {children}
        <AncestralAcknowledgementDialog />
        <SpeedInsights />
      </body>
    </html>
  );
}
