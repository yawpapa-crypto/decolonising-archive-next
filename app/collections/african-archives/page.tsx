import type { Metadata } from "next";
import PageShell from "@/src/components/layout/PageShell";
import AfricanArchivesClient from "./AfricanArchivesClient";

export const metadata: Metadata = {
  title: "African & Global Archive Collections | Decolonising Archive",
  description:
    "Curated gateway to African and global open cultural collections hosted externally by AODL, Smithsonian Open Access, and partner projects.",
};

export default function AfricanArchivesPage() {
  return (
    <PageShell>
      <main>
        <AfricanArchivesClient />
      </main>
    </PageShell>
  );
}
