import { Fraunces, Inter } from "next/font/google";

/** cosmosOracle is proprietary; Fraunces (variable weight, optical size) is the listed open substitute. */
export const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-cosmosoracle-src",
  display: "swap",
});

/** Interface type: nav, tabs, pills, controls and small metadata. Publication titles stay in the serif above. */
export const ui = Inter({ subsets: ["latin"], variable: "--font-ared-ui", display: "swap" });
