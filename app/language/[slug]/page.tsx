import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EntityPage from "@/src/components/kgo/EntityPage";
import { getEntity, listEntities } from "@/lib/kgo/entities";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const entities = await listEntities("language");
  return entities.map((entity) => ({ slug: entity.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntity("language", slug);
  if (!entity) return { title: "Language not found | ARED" };
  return {
    title: `${entity.label} | Languages | ARED`,
    description: entity.description.slice(0, 160),
    alternates: { canonical: `/language/${entity.slug}` },
    openGraph: {
      title: entity.label,
      description: entity.description.slice(0, 200),
      url: `/language/${entity.slug}`,
      type: "article",
    },
  };
}

export default async function LanguageEntityRoute({ params }: Props) {
  const { slug } = await params;
  const entity = await getEntity("language", slug);
  if (!entity) notFound();
  return <EntityPage entity={entity} />;
}
