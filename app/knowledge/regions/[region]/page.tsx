import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ region: string }> };

export function generateStaticParams() {
  return getBrowseIndex("regions").map((item) => ({ region: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region } = await params;
  return {
    title: `${labelFromSlug(region)} | Knowledge Systems by Region`,
  };
}

export default async function RegionBrowseRoute({ params }: PageProps) {
  const { region } = await params;
  return <KnowledgeBrowsePage kind="regions" valueSlug={region} />;
}
