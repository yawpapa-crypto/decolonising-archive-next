import "./globals.css";
import "./styles/platform-ui-consolidation.css";
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Geist, Geist_Mono } from "next/font/google";
import AuthHashHandler from "@/src/components/auth/AuthHashHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col`}
      >
        <AuthHashHandler />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
