import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ community: string }> };

export function generateStaticParams() {
  return getBrowseIndex("communities").map((item) => ({ community: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { community } = await params;
  return {
    title: `${labelFromSlug(community)} | Knowledge Systems by Community`,
  };
}

export default async function CommunityBrowseRoute({ params }: PageProps) {
  const { community } = await params;
  return <KnowledgeBrowsePage kind="communities" valueSlug={community} />;
}
