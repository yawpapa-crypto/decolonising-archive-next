import type { Metadata } from "next";
import KnowledgeBrowsePage from "../../KnowledgeBrowsePage";
import { getBrowseIndex, labelFromSlug } from "@/src/lib/knowledge-registry";

type PageProps = { params: Promise<{ language: string }> };

export function generateStaticParams() {
  return getBrowseIndex("languages").map((item) => ({ language: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { language } = await params;
  return {
    title: `${labelFromSlug(language)} | Knowledge Systems by Language`,
  };
}

export default async function LanguageBrowseRoute({ params }: PageProps) {
  const { language } = await params;
  return <KnowledgeBrowsePage kind="languages" valueSlug={language} />;
}
