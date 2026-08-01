import EntityIndexPage from "@/src/components/kgo/EntityIndexPage";

export const metadata = {
  title: "Knowledge areas | ARED",
  description: "Browse ARED knowledge areas connecting records to research traditions and collections.",
  alternates: { canonical: "/knowledge-areas" },
};

export default function KnowledgeIndexRoute() {
  return <EntityIndexPage kind="knowledge" />;
}
