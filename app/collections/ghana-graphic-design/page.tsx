import type { Metadata } from "next";
import PageShell from "@/src/components/layout/PageShell";
import GhanaCollectionClient from "./GhanaCollectionClient";

/** Prevent stale static HTML when the dev server cache is out of date on OneDrive */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "History of Graphic Design in Ghana | ARED",
  description:
    "A Creative Commons and open-source archive tracing Ghanaian visual communication through print, signage, posters, stamps, publishing, packaging, political graphics, hand-painted cinema posters, institutional identities, street graphics, religious graphics, textiles, digital graphics and contemporary design practice.",
  openGraph: {
    title: "History of Graphic Design in Ghana",
    description:
      "An open archive documenting the visual history of graphic design in Ghana — posters, signs, stamps, newspapers, cinema posters, street lettering, album covers and more.",
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
