import type { Metadata } from "next";
import PageShell from "@/src/components/layout/PageShell";
import CollectionsHubClient from "./CollectionsHubClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections | Decolonising Archive",
  description:
    "Browse research catalogues and open cultural collections — Ghana graphic design history, African archives and partner repositories.",
};

export default function CollectionsPage() {
  return (
    <PageShell>
      <main>
        <CollectionsHubClient />
      </main>
    </PageShell>
  );
}
