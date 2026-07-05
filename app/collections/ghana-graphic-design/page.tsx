import type { Metadata } from "next";
import PageShell from "@/src/components/layout/PageShell";
import GhanaCollectionClient from "./GhanaCollectionClient";

/** Prevent stale static HTML when the dev server cache is out of date on OneDrive */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "History of Graphic Design and Visual Communication in Ghana | ARED",
  description:
    "Objects, makers, symbols, print cultures and public images across Ghanaian history — one authoritative collection organised into eight subcollections.",
  openGraph: {
    title: "History of Graphic Design and Visual Communication in Ghana",
    description:
      "Akan goldweights, Asafo flags, kente, colonial print, national identity, popular graphics, design education and digital design across Ghanaian history.",
    type: "website",
  },
};

export default function GhanaGraphicDesignPage() {
  return (
    <PageShell>
      <main>
        <GhanaCollectionClient />
      </main>
    </PageShell>
  );
}
