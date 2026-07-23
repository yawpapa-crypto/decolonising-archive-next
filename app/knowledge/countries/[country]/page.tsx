import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ country: string }> };

export function generateStaticParams() {
  return getBrowseIndex("countries").map((item) => ({ country: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  return {
    title: `${labelFromSlug(country)} | Knowledge Systems by Country`,
  };
}

export default async function CountryBrowseRoute({ params }: PageProps) {
  const { country } = await params;
  return <KnowledgeBrowsePage kind="countries" valueSlug={country} />;
}
