import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ period: string }> };

export function generateStaticParams() {
  return getBrowseIndex("periods").map((item) => ({ period: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { period } = await params;
  return {
    title: `${labelFromSlug(period)} | Knowledge Systems by Period`,
  };
}

export default async function PeriodBrowseRoute({ params }: PageProps) {
  const { period } = await params;
  return <KnowledgeBrowsePage kind="periods" valueSlug={period} />;
}
