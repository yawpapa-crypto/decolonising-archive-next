import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return getBrowseIndex("categories").map((item) => ({ category: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  return {
    title: `${labelFromSlug(category)} | Knowledge Systems by Category`,
  };
}

export default async function CategoryBrowseRoute({ params }: PageProps) {
  const { category } = await params;
  return <KnowledgeBrowsePage kind="categories" valueSlug={category} />;
}
