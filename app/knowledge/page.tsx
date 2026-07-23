import type { Metadata } from "next";
import PageShell from "@/src/components/layout/PageShell";
import { getPublishedKnowledgeRecords } from "@/src/lib/knowledge-registry";
import KnowledgeRegistryClient from "./KnowledgeRegistryClient";

export const metadata: Metadata = {
  title: "Global Knowledge Systems | Decolonising Archive",
  description:
    "Search and explore public records of knowledge systems across communities, languages, territories, sources and cultural access conditions.",
};

export default function KnowledgeRegistryPage() {
  return (
    <PageShell>
      <main>
        <KnowledgeRegistryClient records={getPublishedKnowledgeRecords()} />
      </main>
    </PageShell>
  );
}
