import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ relationship: string }> };

export function generateStaticParams() {
  return getBrowseIndex("relationships").map((item) => ({
    relationship: item.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { relationship } = await params;
  return {
    title: `${labelFromSlug(relationship)} | Knowledge Systems by Relationship`,
  };
}

export default async function RelationshipBrowseRoute({ params }: PageProps) {
  const { relationship } = await params;
  return <KnowledgeBrowsePage kind="relationships" valueSlug={relationship} />;
}
