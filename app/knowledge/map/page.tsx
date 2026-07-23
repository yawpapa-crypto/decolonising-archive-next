import type { Metadata } from "next";
import PageShell from "@/src/components/layout/PageShell";
import { getPublishedKnowledgeRecords } from "@/src/lib/knowledge-registry";
import KnowledgeRegistryClient from "../KnowledgeRegistryClient";

export const metadata: Metadata = {
  title: "Knowledge Systems Map | Decolonising Archive",
  description:
    "Approximate regional map view for public knowledge system records in the Decolonising Archive registry.",
};

export default function KnowledgeMapPage() {
  return (
    <PageShell>
      <main>
        <KnowledgeRegistryClient
          records={getPublishedKnowledgeRecords()}
          initialView="map"
        />
      </main>
    </PageShell>
  );
}
